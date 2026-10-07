import type { SQLiteDatabase } from "expo-sqlite";

import type { Entry, EntryRow, Mood } from "../../models/Entry";
import { ulid } from "../../utils/id";
import { normalizeTags } from "../../utils/text";
import { enqueue } from "./outbox";
import { writeTags } from "./tags";

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type EntryInput = {
  id?: string;
  title: string;
  body: string;
  mood: Mood | null;
  /** Omit to leave the entry's tags untouched. */
  tags?: string[];
};

/**
 * Row change + outbox row in ONE transaction. This is the whole offline-first
 * trick: they land together or not at all, so the queue can never disagree with
 * the data it is supposed to be shipping.
 */
export async function saveEntry(db: SQLiteDatabase, input: EntryInput) {
  const id = input.id ?? ulid();
  const now = Date.now();
  const tags = input.tags ? normalizeTags(input.tags) : undefined;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO entries (id, title, body, mood, created_at, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT (id) DO UPDATE SET
         title      = excluded.title,
         body       = excluded.body,
         mood       = excluded.mood,
         updated_at = excluded.updated_at,
         deleted_at = NULL,
         dirty      = 1`,
      id,
      input.title,
      input.body,
      input.mood,
      now,
      now,
    );

    if (tags) await writeTags(db, id, tags);

    await enqueue(db, input.id ? "update" : "create", id, {
      id,
      title: input.title,
      body: input.body,
      mood: input.mood,
      tags: tags ?? (await tagNames(db, id)),
      updated_at: now,
    });
  });

  return id;
}

/** Soft delete. The row stays so the delete can be replayed to the server. */
export async function softDeleteEntry(db: SQLiteDatabase, id: string) {
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE entries SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?",
      now,
      now,
      id,
    );
    await enqueue(db, "delete", id, { id, deleted_at: now });
  });
}

/**
 * Danger zone. Still soft + queued, so the server replicates the wipe.
 *
 * Set-based rather than `softDeleteEntry` per row, so it mirrors `enqueue`'s
 * coalescing in SQL: an unattempted outbox row for the entry becomes the delete
 * (a delete always wins the merge), everything else gets a fresh delete row.
 */
export async function softDeleteAll(db: SQLiteDatabase) {
  const now = Date.now();
  const live = "SELECT id FROM entries WHERE deleted_at IS NULL";
  let count = 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE outbox SET
         op              = 'delete',
         payload         = json_object('id', entity_id, 'deleted_at', ?),
         next_attempt_at = 0
       WHERE id IN (
         SELECT MAX(id) FROM outbox
         WHERE attempts = 0 AND entity_id IN (${live})
         GROUP BY entity_id
       )`,
      now,
    );
    await db.runAsync(
      `INSERT INTO outbox (op, entity, entity_id, payload, created_at)
       SELECT 'delete', 'entry', id, json_object('id', id, 'deleted_at', ?), ?
       FROM entries e
       WHERE e.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM outbox o WHERE o.entity_id = e.id AND o.attempts = 0
         )`,
      now,
      now,
    );
    const result = await db.runAsync(
      "UPDATE entries SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE deleted_at IS NULL",
      now,
      now,
    );
    count = result.changes;
  });

  return count;
}

/**
 * Hard delete of soft-deleted rows. By default only rows whose delete has
 * already reached the server (dirty = 0, nothing queued) — purging earlier
 * would lose the tombstone the server needs. `includeUnsynced` is for when sync
 * is off: there is no server to tell, so the queued deletes go too.
 *
 * Returns the attachment paths that no longer have a row, so the caller can
 * remove the files. Rows first, files second: a crash in between leaves orphan
 * files (swept later), never rows pointing at nothing.
 */
export async function purgeDeleted(
  db: SQLiteDatabase,
  options: { includeUnsynced?: boolean } = {},
) {
  const where = options.includeUnsynced
    ? "deleted_at IS NOT NULL"
    : `deleted_at IS NOT NULL AND dirty = 0
       AND NOT EXISTS (SELECT 1 FROM outbox o WHERE o.entity_id = entries.id)`;

  const doomed = `SELECT id FROM entries WHERE ${where}`;
  const files: string[] = [];
  let purged = 0;

  await db.withTransactionAsync(async () => {
    const attachments = await db.getAllAsync<{
      file_uri: string;
      thumb_uri: string | null;
    }>(
      `SELECT file_uri, thumb_uri FROM attachments WHERE entry_id IN (${doomed})`,
    );
    for (const a of attachments) {
      files.push(a.file_uri);
      if (a.thumb_uri) files.push(a.thumb_uri);
    }
    // Safe to run first: the includeUnsynced `where` does not look at outbox.
    if (options.includeUnsynced)
      await db.runAsync(`DELETE FROM outbox WHERE entity_id IN (${doomed})`);
    // entry_tags and attachments go with it: ON DELETE CASCADE.
    const result = await db.runAsync(`DELETE FROM entries WHERE ${where}`);
    purged = result.changes;
  });

  return { purged, files };
}

// ---------------------------------------------------------------------------
// Reads — pure functions of the db handle, mapped to UI shapes at the boundary
// ---------------------------------------------------------------------------

type ListRow = EntryRow & { tag_names: string; attachment_count: number };

const SELECT_WITH_TAGS = `
  SELECT e.*,
         COALESCE(GROUP_CONCAT(t.name), '') AS tag_names,
         (SELECT COUNT(*) FROM attachments a WHERE a.entry_id = e.id) AS attachment_count
  FROM entries e
  LEFT JOIN entry_tags et ON et.entry_id = e.id
  LEFT JOIN tags t        ON t.id = et.tag_id`;

function toEntry(row: ListRow): Entry {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    mood: row.mood,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    // GROUP_CONCAT gives one string; splitting here means no component ever
    // has to know the storage shape. normalizeTag strips commas, so this is safe.
    tags: row.tag_names ? row.tag_names.split(",") : [],
    attachmentCount: row.attachment_count,
  };
}

export type ListOptions = {
  limit?: number;
  offset?: number;
  /** Inclusive lower bound, epoch ms. */
  from?: number;
  /** Exclusive upper bound, epoch ms. */
  to?: number;
};

export async function listEntries(
  db: SQLiteDatabase,
  { limit = 100, offset = 0, from, to }: ListOptions = {},
): Promise<Entry[]> {
  const rows = await db.getAllAsync<ListRow>(
    `${SELECT_WITH_TAGS}
     WHERE e.deleted_at IS NULL
       AND e.created_at >= ? AND e.created_at < ?
     GROUP BY e.id
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`,
    from ?? 0,
    to ?? Number.MAX_SAFE_INTEGER,
    limit,
    offset,
  );
  return rows.map(toEntry);
}

export async function getEntry(
  db: SQLiteDatabase,
  id: string,
): Promise<Entry | null> {
  const row = await db.getFirstAsync<ListRow>(
    `${SELECT_WITH_TAGS}
     WHERE e.id = ? AND e.deleted_at IS NULL
     GROUP BY e.id`,
    id,
  );
  return row ? toEntry(row) : null;
}

export async function countEntries(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM entries WHERE deleted_at IS NULL",
  );
  return row?.n ?? 0;
}

/**
 * Creation timestamps in a range — the calendar buckets them into local days in
 * JS, so day boundaries always match what the timeline shows (SQLite's
 * 'localtime' modifier and the JS runtime can disagree around DST).
 */
export async function entryTimestamps(
  db: SQLiteDatabase,
  from: number,
  to: number,
) {
  const rows = await db.getAllAsync<{ created_at: number }>(
    `SELECT created_at FROM entries
     WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?`,
    from,
    to,
  );
  return rows.map((row) => row.created_at);
}

async function tagNames(db: SQLiteDatabase, entryId: string) {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT t.name FROM tags t
     JOIN entry_tags et ON et.tag_id = t.id
     WHERE et.entry_id = ?`,
    entryId,
  );
  return rows.map((row) => row.name);
}

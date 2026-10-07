import type { SQLiteDatabase } from "expo-sqlite";

import type { TagCount } from "../../models/Entry";
import { ulid } from "../../utils/id";
import { normalizeTags } from "../../utils/text";

/**
 * Replaces an entry's tag set. Runs WITHOUT its own transaction on purpose so it
 * can ride inside `saveEntry`'s — SQLite has no nested BEGIN. Use `setTags` when
 * you are not already in one.
 */
export async function writeTags(
  db: SQLiteDatabase,
  entryId: string,
  names: string[],
) {
  const clean = normalizeTags(names);

  // Autosave calls this on every pause; rewriting an unchanged set would wake
  // every live query watching entry_tags for nothing.
  const current = await db.getAllAsync<{ name: string }>(
    `SELECT t.name FROM tags t
     JOIN entry_tags et ON et.tag_id = t.id
     WHERE et.entry_id = ?`,
    entryId,
  );
  if (
    current.length === clean.length &&
    current.every(({ name }) => clean.includes(name))
  )
    return;

  for (const name of clean) {
    await db.runAsync(
      "INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT (name) DO NOTHING",
      ulid(),
      name,
    );
  }
  await db.runAsync("DELETE FROM entry_tags WHERE entry_id = ?", entryId);
  for (const name of clean) {
    await db.runAsync(
      `INSERT INTO entry_tags (entry_id, tag_id)
       VALUES (?, (SELECT id FROM tags WHERE name = ?))`,
      entryId,
      name,
    );
  }
}

export async function setTags(
  db: SQLiteDatabase,
  entryId: string,
  names: string[],
) {
  await db.withTransactionAsync(() => writeTags(db, entryId, names));
}

/** Tags in use by live entries, most-used first — for filter chips and suggestions. */
export async function listTags(db: SQLiteDatabase): Promise<TagCount[]> {
  return db.getAllAsync<TagCount>(
    `SELECT t.name AS name, COUNT(e.id) AS count
     FROM tags t
     JOIN entry_tags et ON et.tag_id = t.id
     JOIN entries e     ON e.id = et.entry_id AND e.deleted_at IS NULL
     GROUP BY t.id
     ORDER BY count DESC, t.name`,
  );
}

/** Tags no entry points at any more. Cheap housekeeping after purges. */
export async function pruneUnusedTags(db: SQLiteDatabase) {
  const result = await db.runAsync(
    "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM entry_tags)",
  );
  return result.changes;
}

import type { SQLiteDatabase } from "expo-sqlite";

export const SCHEMA_VERSION = 4;

const V1 = `
CREATE TABLE entries (
  id          TEXT    PRIMARY KEY NOT NULL,   -- ULID, generated on device
  title       TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL DEFAULT '',
  mood        INTEGER,                        -- 1..5, null = not set
  created_at  INTEGER NOT NULL,               -- epoch ms
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER,                        -- soft delete; hard deletes break sync
  remote_id   TEXT,
  dirty       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_entries_timeline ON entries (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_dirty    ON entries (dirty) WHERE dirty = 1;

CREATE TABLE tags (
  id   TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags (id)    ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE attachments (
  id       TEXT    PRIMARY KEY NOT NULL,
  entry_id TEXT    NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
  file_uri TEXT    NOT NULL,                  -- the blob lives on disk, not here
  mime     TEXT    NOT NULL,
  width    INTEGER,
  height   INTEGER,
  bytes    INTEGER
);
CREATE INDEX idx_attachments_entry ON attachments (entry_id);

CREATE TABLE outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,   -- FIFO by insertion
  op              TEXT    NOT NULL,                    -- create | update | delete
  entity          TEXT    NOT NULL,
  entity_id       TEXT    NOT NULL,
  payload         TEXT    NOT NULL,                    -- JSON
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,          -- backoff gate
  last_error      TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_outbox_ready ON outbox (next_attempt_at, id);

CREATE TABLE sync_meta (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;

const V2 = `
-- External-content FTS5: the index stores no copy of the text, it points at
-- entries.rowid. That is why every write needs a trigger below.
CREATE VIRTUAL TABLE entries_fts USING fts5(
  title, body, content = 'entries', content_rowid = 'rowid'
);

-- Backfill first. Skip this and every pre-existing entry is unsearchable.
INSERT INTO entries_fts (rowid, title, body)
  SELECT rowid, title, body FROM entries;

CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts (rowid, title, body)
    VALUES (new.rowid, new.title, new.body);
END;

CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts (entries_fts, rowid, title, body)
    VALUES ('delete', old.rowid, old.title, old.body);
END;

CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts (entries_fts, rowid, title, body)
    VALUES ('delete', old.rowid, old.title, old.body);
  INSERT INTO entries_fts (rowid, title, body)
    VALUES (new.rowid, new.title, new.body);
END;
`;

// The "do it twice" migration. ALTER TABLE ... ADD COLUMN is the one schema
// change SQLite does in place without a table rebuild, so existing attachment
// rows survive untouched — their new columns are simply NULL until a thumbnail
// is generated.
const V3 = `
ALTER TABLE attachments ADD COLUMN thumb_uri  TEXT;
ALTER TABLE attachments ADD COLUMN blurhash   TEXT;
ALTER TABLE attachments ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
`;

// V2 shipped `entries_au` as AFTER UPDATE ON entries, so every bookkeeping
// write — markDone flipping `dirty`, a soft delete, `remote_id` — deleted and
// re-inserted the row in the index for nothing. The index only covers title and
// body, so only those columns need the trigger. V2 is never edited (devices
// already ran it); a shipped trigger is replaced by a new step.
const V4 = `
DROP TRIGGER entries_au;

CREATE TRIGGER entries_au AFTER UPDATE OF title, body ON entries BEGIN
  INSERT INTO entries_fts (entries_fts, rowid, title, body)
    VALUES ('delete', old.rowid, old.title, old.body);
  INSERT INTO entries_fts (rowid, title, body)
    VALUES (new.rowid, new.title, new.body);
END;
`;

/** Step N takes the schema from user_version N-1 to N. Exported for the tests. */
export const MIGRATIONS: Record<number, string> = {
  1: V1,
  2: V2,
  3: V3,
  4: V4,
};

export async function migrate(db: SQLiteDatabase) {
  // PRAGMAs go outside the transaction: journal_mode cannot change inside one.
  await db.execAsync("PRAGMA journal_mode = WAL");
  await db.execAsync("PRAGMA foreign_keys = ON");

  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;

  while (version < SCHEMA_VERSION) {
    const next = version + 1;
    // One transaction per step, and the version bump rides inside it — a crash
    // mid-upgrade leaves you on a version that actually matches the schema.
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[next]);
      await db.execAsync(`PRAGMA user_version = ${next}`); // cannot be a bound param
    });
    version = next;
  }
}

/** Repair tool for when a trigger was missing or wrong. */
export async function rebuildSearchIndex(db: SQLiteDatabase) {
  await db.execAsync(
    "INSERT INTO entries_fts (entries_fts) VALUES ('rebuild')",
  );
}

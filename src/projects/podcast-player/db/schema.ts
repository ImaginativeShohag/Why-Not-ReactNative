import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Forward-only migrations keyed on PRAGMA user_version. Each step runs in its
 * own transaction so a crash mid-migration leaves the previous version intact.
 */
const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE podcasts (
    id                TEXT PRIMARY KEY NOT NULL,
    feed_url          TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    author            TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    artwork_url       TEXT,
    link              TEXT,
    categories        TEXT NOT NULL DEFAULT '[]',   -- JSON array
    subscribed        INTEGER NOT NULL DEFAULT 0,
    auto_download     INTEGER NOT NULL DEFAULT 0,
    last_refreshed_at INTEGER,
    etag              TEXT,                         -- conditional GET validators
    last_modified     TEXT,
    created_at        INTEGER NOT NULL
  );
  CREATE INDEX idx_podcasts_subscribed ON podcasts (subscribed) WHERE subscribed = 1;

  CREATE TABLE episodes (
    id               TEXT PRIMARY KEY NOT NULL,
    podcast_id       TEXT NOT NULL REFERENCES podcasts (id) ON DELETE CASCADE,
    guid             TEXT NOT NULL,
    title            TEXT NOT NULL,
    notes            TEXT NOT NULL DEFAULT '',
    notes_html       TEXT NOT NULL DEFAULT '',
    audio_url        TEXT NOT NULL,
    mime_type        TEXT,
    enclosure_length INTEGER,
    duration         INTEGER,                        -- seconds, null = unknown
    published_at     INTEGER,
    artwork_url      TEXT,
    season           INTEGER,
    episode_number   INTEGER,
    chapters         TEXT NOT NULL DEFAULT '[]',     -- JSON array of Chapter
    chapters_url     TEXT,
    content_hash     TEXT NOT NULL,                  -- skip no-op updates on refresh
    first_seen_at    INTEGER NOT NULL,
    UNIQUE (podcast_id, guid)
  );
  CREATE INDEX idx_episodes_podcast ON episodes (podcast_id, published_at DESC);
  CREATE INDEX idx_episodes_published ON episodes (published_at DESC);

  CREATE TABLE progress (
    episode_id TEXT PRIMARY KEY NOT NULL,
    position   REAL NOT NULL DEFAULT 0,
    duration   REAL,
    played     INTEGER NOT NULL DEFAULT 0,
    played_at  INTEGER,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_progress_recent ON progress (updated_at DESC);

  CREATE TABLE downloads (
    episode_id      TEXT PRIMARY KEY NOT NULL,
    podcast_id      TEXT NOT NULL,
    url             TEXT NOT NULL,
    state           TEXT NOT NULL,                   -- DownloadState
    relative_path   TEXT NOT NULL,                   -- NEVER an absolute URI
    bytes_written   INTEGER NOT NULL DEFAULT 0,
    total_bytes     INTEGER NOT NULL DEFAULT 0,
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER NOT NULL DEFAULT 0,
    snapshot        TEXT,                            -- JSON DownloadPauseState
    priority        INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    completed_at    INTEGER,
    error           TEXT
  );
  CREATE INDEX idx_downloads_state ON downloads (state);

  CREATE TABLE queue (
    episode_id TEXT PRIMARY KEY NOT NULL,
    sort       INTEGER NOT NULL,
    added_at   INTEGER NOT NULL
  );

  CREATE TABLE kv (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}

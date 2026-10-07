import type { SQLiteDatabase } from "expo-sqlite";

/** Own database file — projects never share a DB (isolation rule 3). */
export const DATABASE_NAME = "camera-social.db";

export const SCHEMA_VERSION = 1;

const V1 = `
CREATE TABLE captures (
  id            TEXT    PRIMARY KEY NOT NULL,
  kind          TEXT    NOT NULL,              -- photo | video
  origin        TEXT    NOT NULL,              -- camera | library | share | edit
  path          TEXT    NOT NULL,              -- relative to Documents, never absolute
  thumb_path    TEXT    NOT NULL,
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  bytes         INTEGER NOT NULL DEFAULT 0,
  mime          TEXT    NOT NULL,
  duration_ms   INTEGER,
  exif          TEXT,                          -- JSON
  caption       TEXT    NOT NULL DEFAULT '',
  favorite      INTEGER NOT NULL DEFAULT 0,
  source_id     TEXT,                          -- set on edited derivatives
  operations    TEXT,                          -- JSON Op[] that produced this file
  trim_start_ms INTEGER,
  trim_end_ms   INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_captures_timeline ON captures (created_at DESC);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

const MIGRATIONS: Record<number, string> = { 1: V1 };

/** PRAGMA user_version-driven migrations, run by SQLiteProvider's onInit. */
export async function migrate(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;
  while (version < SCHEMA_VERSION) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[next]);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}

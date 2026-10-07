import type { SQLiteDatabase } from "expo-sqlite";

/**
 * WAL is not optional here: the background task writes points while the UI
 * reads them. In rollback-journal mode a reader blocks the writer, and a
 * blocked write inside a task callback is a lost point.
 */
const PRAGMAS = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 3000;
`;

const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    distance_m REAL NOT NULL DEFAULT 0,
    moving_ms INTEGER NOT NULL DEFAULT 0,
    elevation_gain_m REAL NOT NULL DEFAULT 0,
    elevation_loss_m REAL NOT NULL DEFAULT 0,
    calories INTEGER NOT NULL DEFAULT 0,
    steps INTEGER NOT NULL DEFAULT 0,
    avg_hr REAL,
    point_count INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL,
    goal_type TEXT NOT NULL DEFAULT 'open',
    goal_value REAL NOT NULL DEFAULT 0,
    battery_start REAL,
    battery_end REAL,
    low_power INTEGER NOT NULL DEFAULT 0,
    health_synced_at INTEGER,
    thumbnail TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts (started_at DESC);

  CREATE TABLE IF NOT EXISTS points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id TEXT NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
    t INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    alt REAL,
    acc REAL,
    speed REAL,
    segment INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_points_workout_t ON points (workout_id, t);

  CREATE TABLE IF NOT EXISTS splits (
    workout_id TEXT NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    distance_m REAL NOT NULL,
    duration_ms INTEGER NOT NULL,
    elevation_delta_m REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (workout_id, idx)
  );

  -- Single-row table: the live session survives a JS restart or a kill.
  CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prefs (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(PRAGMAS);
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version += 1;
    // PRAGMA can't be parameterised; `version` is a local integer.
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

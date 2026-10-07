import type { SQLiteDatabase } from "expo-sqlite";

import type {
  ActivityType,
  GoalType,
  TrackingMode,
  Workout,
  WorkoutStatus,
} from "../../models/Workout";

type WorkoutRow = {
  id: string;
  type: ActivityType;
  status: WorkoutStatus;
  title: string;
  started_at: number;
  ended_at: number | null;
  distance_m: number;
  moving_ms: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  calories: number;
  steps: number;
  avg_hr: number | null;
  point_count: number;
  mode: TrackingMode;
  goal_type: GoalType;
  goal_value: number;
  battery_start: number | null;
  battery_end: number | null;
  low_power: number;
  health_synced_at: number | null;
  thumbnail: string | null;
};

const COLUMNS: Record<keyof Omit<Workout, "id">, keyof WorkoutRow> = {
  type: "type",
  status: "status",
  title: "title",
  startedAt: "started_at",
  endedAt: "ended_at",
  distanceM: "distance_m",
  movingMs: "moving_ms",
  elevationGainM: "elevation_gain_m",
  elevationLossM: "elevation_loss_m",
  calories: "calories",
  steps: "steps",
  avgHeartRate: "avg_hr",
  pointCount: "point_count",
  mode: "mode",
  goalType: "goal_type",
  goalValue: "goal_value",
  batteryStart: "battery_start",
  batteryEnd: "battery_end",
  lowPowerMode: "low_power",
  healthSyncedAt: "health_synced_at",
  thumbnail: "thumbnail",
};

function toRow(value: unknown, key: keyof Omit<Workout, "id">) {
  if (key === "thumbnail") return value == null ? null : JSON.stringify(value);
  if (key === "lowPowerMode") return value ? 1 : 0;
  return value as string | number | null;
}

function mapWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceM: row.distance_m,
    movingMs: row.moving_ms,
    elevationGainM: row.elevation_gain_m,
    elevationLossM: row.elevation_loss_m,
    calories: row.calories,
    steps: row.steps,
    avgHeartRate: row.avg_hr,
    pointCount: row.point_count,
    mode: row.mode,
    goalType: row.goal_type,
    goalValue: row.goal_value,
    batteryStart: row.battery_start,
    batteryEnd: row.battery_end,
    lowPowerMode: row.low_power === 1,
    healthSyncedAt: row.health_synced_at,
    thumbnail: row.thumbnail
      ? (JSON.parse(row.thumbnail) as [number, number][])
      : null,
  };
}

export async function insertWorkout(
  db: SQLiteDatabase,
  w: Pick<
    Workout,
    "id" | "type" | "title" | "startedAt" | "mode" | "goalType" | "goalValue"
  > &
    Partial<Pick<Workout, "batteryStart" | "lowPowerMode">>,
) {
  await db.runAsync(
    `INSERT INTO workouts (id, type, status, title, started_at, mode, goal_type, goal_value, battery_start, low_power)
     VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
    w.id,
    w.type,
    w.title,
    w.startedAt,
    w.mode,
    w.goalType,
    w.goalValue,
    w.batteryStart ?? null,
    w.lowPowerMode ? 1 : 0,
  );
}

export async function updateWorkout(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Omit<Workout, "id">>,
) {
  const keys = Object.keys(patch) as (keyof Omit<Workout, "id">)[];
  if (!keys.length) return;
  const sets = keys.map((k) => `${COLUMNS[k]} = ?`).join(", ");
  const values = keys.map((k) => toRow(patch[k], k));
  await db.runAsync(`UPDATE workouts SET ${sets} WHERE id = ?`, ...values, id);
}

/**
 * Rolling aggregates from the pipeline — increments, so batches can't race
 * each other. Returns the updated row, saving the pipeline a re-read.
 */
export async function addRolling(
  db: SQLiteDatabase,
  id: string,
  delta: {
    distanceM: number;
    movingMs: number;
    gainM: number;
    lossM: number;
    points: number;
  },
) {
  const row = await db.getFirstAsync<WorkoutRow>(
    `UPDATE workouts SET
       distance_m = distance_m + ?,
       moving_ms = moving_ms + ?,
       elevation_gain_m = elevation_gain_m + ?,
       elevation_loss_m = elevation_loss_m + ?,
       point_count = point_count + ?
     WHERE id = ?
     RETURNING *`,
    delta.distanceM,
    delta.movingMs,
    delta.gainM,
    delta.lossM,
    delta.points,
    id,
  );
  return row ? mapWorkout(row) : null;
}

export async function getWorkout(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<WorkoutRow>(
    "SELECT * FROM workouts WHERE id = ?",
    id,
  );
  return row ? mapWorkout(row) : null;
}

export async function listWorkouts(
  db: SQLiteDatabase,
  options: { type?: ActivityType | null; limit?: number; since?: number } = {},
) {
  const where = ["status = 'finished'"];
  const params: (string | number)[] = [];
  if (options.type) {
    where.push("type = ?");
    params.push(options.type);
  }
  if (options.since != null) {
    where.push("started_at >= ?");
    params.push(options.since);
  }
  params.push(options.limit ?? 500);
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT * FROM workouts WHERE ${where.join(" AND ")} ORDER BY started_at DESC LIMIT ?`,
    ...params,
  );
  return rows.map(mapWorkout);
}

/** Workouts that were never finished — the kill/crash recovery candidates. */
export async function listUnfinished(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<WorkoutRow>(
    "SELECT * FROM workouts WHERE status IN ('active', 'paused', 'autopaused') ORDER BY started_at DESC",
  );
  return rows.map(mapWorkout);
}

export async function deleteWorkout(db: SQLiteDatabase, id: string) {
  await db.runAsync("DELETE FROM workouts WHERE id = ?", id);
}

export type DayTotal = {
  day: number;
  distanceM: number;
  movingMs: number;
  calories: number;
  count: number;
};

/** Per-day totals since `since` (local-time day buckets computed in SQL). */
export async function dailyTotals(
  db: SQLiteDatabase,
  since: number,
): Promise<DayTotal[]> {
  return db.getAllAsync<DayTotal>(
    `SELECT
       CAST(strftime('%s', date(started_at / 1000, 'unixepoch', 'localtime'), 'utc') AS INTEGER) * 1000 AS day,
       SUM(distance_m) AS distanceM,
       SUM(moving_ms) AS movingMs,
       SUM(calories) AS calories,
       COUNT(*) AS count
     FROM workouts
     WHERE status = 'finished' AND started_at >= ?
     GROUP BY day
     ORDER BY day`,
    since,
  );
}

/** Distinct local days with a finished workout, newest first — for the streak. */
export async function activeDays(db: SQLiteDatabase, limit = 400) {
  const rows = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(started_at / 1000, 'unixepoch', 'localtime') AS day
     FROM workouts WHERE status = 'finished' ORDER BY day DESC LIMIT ?`,
    limit,
  );
  return rows.map((r) => r.day);
}

export type PersonalBests = {
  longestDistance: Workout | null;
  longestDuration: Workout | null;
  fastestPace: Workout | null;
  mostClimb: Workout | null;
  fastestKmMs: number | null;
};

export async function personalBests(
  db: SQLiteDatabase,
): Promise<PersonalBests> {
  const one = async (orderBy: string, where = "1 = 1") => {
    const row = await db.getFirstAsync<WorkoutRow>(
      `SELECT * FROM workouts WHERE status = 'finished' AND ${where} ORDER BY ${orderBy} LIMIT 1`,
    );
    return row ? mapWorkout(row) : null;
  };
  const [longestDistance, longestDuration, fastestPace, mostClimb, fastestKm] =
    await Promise.all([
      one("distance_m DESC", "distance_m > 0"),
      one("moving_ms DESC", "moving_ms > 0"),
      one("CAST(moving_ms AS REAL) / distance_m ASC", "distance_m >= 1000"),
      one("elevation_gain_m DESC", "elevation_gain_m > 0"),
      db.getFirstAsync<{ ms: number | null }>(
        `SELECT MIN(s.duration_ms) AS ms FROM splits s
         JOIN workouts w ON w.id = s.workout_id
         WHERE w.status = 'finished' AND s.distance_m >= 999`,
      ),
    ]);
  return {
    longestDistance,
    longestDuration,
    fastestPace,
    mostClimb,
    fastestKmMs: fastestKm?.ms ?? null,
  };
}

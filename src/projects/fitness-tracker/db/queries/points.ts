import type { SQLiteDatabase } from "expo-sqlite";

import type { Point } from "../../models/Workout";

const SELECT = "SELECT t, lat, lng, alt, acc, speed, segment FROM points";

/**
 * One prepared statement reused for the batch. Run it inside the caller's
 * transaction (the pipeline wraps each fix batch in one): a single fsync for a
 * 30-point deferred batch instead of thirty.
 */
export async function insertPoints(
  db: SQLiteDatabase,
  workoutId: string,
  points: readonly Point[],
) {
  if (!points.length) return;
  const stmt = await db.prepareAsync(
    "INSERT INTO points (workout_id, t, lat, lng, alt, acc, speed, segment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  try {
    for (const p of points) {
      await stmt.executeAsync(
        workoutId,
        p.t,
        p.lat,
        p.lng,
        p.alt,
        p.acc,
        p.speed,
        p.segment,
      );
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getPoints(
  db: SQLiteDatabase,
  workoutId: string,
  sinceT = 0,
) {
  return db.getAllAsync<Point>(
    `${SELECT} WHERE workout_id = ? AND t > ? ORDER BY t`,
    workoutId,
    sinceT,
  );
}

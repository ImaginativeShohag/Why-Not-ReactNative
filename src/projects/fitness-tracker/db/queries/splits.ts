import type { SQLiteDatabase } from "expo-sqlite";

import type { Split } from "../../models/Workout";
import { paceSecPerKm } from "../../tracking/metrics";

export async function replaceSplits(
  db: SQLiteDatabase,
  workoutId: string,
  splits: readonly Split[],
) {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM splits WHERE workout_id = ?", workoutId);
    for (const s of splits) {
      await db.runAsync(
        "INSERT INTO splits (workout_id, idx, distance_m, duration_ms, elevation_delta_m) VALUES (?, ?, ?, ?, ?)",
        workoutId,
        s.index,
        s.distanceM,
        Math.round(s.durationMs),
        s.elevationDeltaM,
      );
    }
  });
}

export async function getSplits(
  db: SQLiteDatabase,
  workoutId: string,
): Promise<Split[]> {
  const rows = await db.getAllAsync<{
    idx: number;
    distance_m: number;
    duration_ms: number;
    elevation_delta_m: number;
  }>("SELECT * FROM splits WHERE workout_id = ? ORDER BY idx", workoutId);
  return rows.map((r) => ({
    index: r.idx,
    distanceM: r.distance_m,
    durationMs: r.duration_ms,
    // Splits are ≥ 50 m, so null only for a zero duration — whose pace is 0.
    paceSecPerKm: paceSecPerKm(r.distance_m, r.duration_ms) ?? 0,
    elevationDeltaM: r.elevation_delta_m,
  }));
}

import type { SQLiteDatabase } from "expo-sqlite";

import type {
  ActivityType,
  GoalType,
  TrackingMode,
} from "../../models/Workout";

export type Prefs = {
  activity: ActivityType;
  goalType: GoalType;
  /** km for distance, minutes for time, kcal for calories. */
  goalValue: number;
  autoPause: boolean;
  voiceCues: boolean;
  mode: TrackingMode;
  dailyStepGoal: number;
  dailyDistanceGoalKm: number;
};

export const DEFAULT_PREFS: Prefs = {
  activity: "run",
  goalType: "distance",
  goalValue: 5,
  autoPause: true,
  voiceCues: true,
  mode: "accurate",
  dailyStepGoal: 8000,
  dailyDistanceGoalKm: 5,
};

export async function getPrefs(db: SQLiteDatabase): Promise<Prefs> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM prefs",
  );
  const stored = Object.fromEntries(
    rows.map((r) => [r.key, JSON.parse(r.value)]),
  );
  return { ...DEFAULT_PREFS, ...stored };
}

export async function setPrefs(db: SQLiteDatabase, patch: Partial<Prefs>) {
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(patch)) {
      await db.runAsync(
        "INSERT INTO prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        key,
        JSON.stringify(value),
      );
    }
  });
}

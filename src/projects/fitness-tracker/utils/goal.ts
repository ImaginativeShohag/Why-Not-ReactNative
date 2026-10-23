import type { GoalType } from "../models/Workout";

export type GoalProgress = { label: string; fraction: number };

/** "2.10 / 5 km" plus 0…1 progress for the goal picked on the Start screen. */
export function goalProgress(
  goalType: GoalType,
  goalValue: number,
  totals: { distanceM: number; elapsedMs: number; calories: number },
): GoalProgress | null {
  if (goalType === "open" || !(goalValue > 0)) return null;
  const [current, label] =
    goalType === "distance"
      ? [
          totals.distanceM / 1000,
          `${(totals.distanceM / 1000).toFixed(2)} / ${goalValue} km`,
        ]
      : goalType === "time"
        ? [
            totals.elapsedMs / 60_000,
            `${Math.floor(totals.elapsedMs / 60_000)} / ${goalValue} min`,
          ]
        : [totals.calories, `${totals.calories} / ${goalValue} kcal`];
  return { label, fraction: Math.min(1, Math.max(0, current / goalValue)) };
}

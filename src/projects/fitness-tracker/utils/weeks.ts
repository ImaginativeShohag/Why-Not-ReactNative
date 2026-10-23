import type { Workout } from "../models/Workout";
import { addDays, startOfWeek } from "./dates";

export type WeekBucket = {
  weekStart: number;
  distanceM: number;
  elevationM: number;
};

/**
 * Calendar weeks (Monday starts), oldest first, each workout in its own week. Buckets are
 * matched by their local-midnight start, never by `diff / 7 days`: a week
 * containing a DST change is an hour shorter or longer.
 */
export function bucketWeeks(
  workouts: readonly Pick<
    Workout,
    "startedAt" | "distanceM" | "elevationGainM"
  >[],
  now: number,
  weeks: number,
): WeekBucket[] {
  const thisWeek = startOfWeek(now);
  const weekly = Array.from({ length: weeks }, (_, i) => ({
    weekStart: addDays(thisWeek, (i - (weeks - 1)) * 7),
    distanceM: 0,
    elevationM: 0,
  }));
  const byStart = new Map(weekly.map((w) => [w.weekStart, w]));
  for (const w of workouts) {
    const bucket = byStart.get(startOfWeek(w.startedAt));
    if (bucket) {
      bucket.distanceM += w.distanceM;
      bucket.elevationM += w.elevationGainM;
    }
  }
  return weekly;
}

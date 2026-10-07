export type ActivityType = "run" | "walk" | "cycle" | "hike";

export type GoalType = "open" | "distance" | "time" | "calories";

/** Accurate = BestForNavigation / 5 m / 1 s. Saver = Balanced / 25 m / deferred batches. */
export type TrackingMode = "accurate" | "saver";

/**
 * `autopaused` is kept distinct from `paused`: auto-pause resumes itself when
 * movement is detected, a manual pause never does.
 */
export type WorkoutStatus =
  "active" | "paused" | "autopaused" | "finished" | "discarded";

/** A fix as it arrives from the OS, before any filtering. */
export type RawFix = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
};

/** An accepted, smoothed point as persisted in SQLite. */
export type Point = {
  lat: number;
  lng: number;
  alt: number | null;
  acc: number | null;
  speed: number | null;
  /** ms since epoch */
  t: number;
  /**
   * Increments on every resume. Distance is never accumulated across a segment
   * boundary, so a pause followed by a 2 km bus ride doesn't count.
   */
  segment: number;
};

export type Split = {
  index: number;
  /** Usually 1000; the final partial split is shorter. */
  distanceM: number;
  durationMs: number;
  paceSecPerKm: number;
  elevationDeltaM: number;
};

export type Summary = {
  distanceM: number;
  /** Time spent actually moving — sum of intra-segment durations. */
  movingMs: number;
  /** First to last point, including pauses. */
  elapsedMs: number;
  avgPaceSecPerKm: number | null;
  avgSpeedMps: number;
  maxSpeedMps: number;
  elevationGainM: number;
  elevationLossM: number;
  minAltM: number | null;
  maxAltM: number | null;
  splits: Split[];
  pointCount: number;
};

export type Workout = {
  id: string;
  type: ActivityType;
  status: WorkoutStatus;
  title: string;
  startedAt: number;
  endedAt: number | null;
  distanceM: number;
  movingMs: number;
  elevationGainM: number;
  elevationLossM: number;
  calories: number;
  steps: number;
  avgHeartRate: number | null;
  pointCount: number;
  mode: TrackingMode;
  goalType: GoalType;
  goalValue: number;
  batteryStart: number | null;
  batteryEnd: number | null;
  lowPowerMode: boolean;
  healthSyncedAt: number | null;
  /** Normalised [x, y] pairs in 0..1 for the history thumbnail, computed once at finish. */
  thumbnail: [number, number][] | null;
};

export type HeartRateSample = { t: number; bpm: number };

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: "Run",
  walk: "Walk",
  cycle: "Cycle",
  hike: "Hike",
};

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  run: "🏃",
  walk: "🚶",
  cycle: "🚴",
  hike: "🥾",
};

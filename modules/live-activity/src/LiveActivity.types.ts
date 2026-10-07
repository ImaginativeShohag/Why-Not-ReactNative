/** Static for the lifetime of one Live Activity / notification. */
export type WorkoutActivityAttributes = {
  workoutId: string;
  /** "run" | "walk" | "cycle" | "hike" — native side picks the glyph. */
  activityType: string;
  title: string;
};

/** Everything that changes while the workout runs. Keep it small: iOS caps payloads at 4 KB. */
export type WorkoutActivityState = {
  /**
   * Epoch ms the timer should count from (now − active elapsed). Native views
   * render a self-ticking timer from this, so the lock screen advances every
   * second without JS pushing an update every second.
   */
  timerStart: number;
  elapsedSec: number;
  distanceM: number;
  paceSecPerKm: number | null;
  heartRate: number | null;
  isPaused: boolean;
};

export type LiveActivityAction = "pause" | "resume" | "end";

export type LiveActivityActionEvent = { action: LiveActivityAction };

/** Mirrored into the App Group (iOS) / SharedPreferences (Android) for widgets. */
export type WidgetData = {
  steps: number;
  stepGoal: number;
  distanceM: number;
  distanceGoalM: number;
  streakDays: number;
  updatedAt: number;
};

export type LiveActivityEvents = {
  onAction: (event: LiveActivityActionEvent) => void;
};

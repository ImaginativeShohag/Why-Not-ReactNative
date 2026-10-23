import * as Location from "expo-location";

import type { TrackingMode } from "../models/Workout";
import { silenceMeansStillMs } from "./autoPause";

export const LOCATION_TASK = "fitness-tracker-location";

/** One table for the task, the foreground watch and the silence thresholds. */
const INTERVALS: Record<
  TrackingMode,
  { distanceInterval: number; timeInterval: number }
> = {
  accurate: { distanceInterval: 5, timeInterval: 1000 },
  saver: { distanceInterval: 25, timeInterval: 10_000 },
};

/** No fix for this long while moving slowly = the user is standing still. */
export function stillAfterSilenceMs(mode: TrackingMode) {
  const { distanceInterval, timeInterval } = INTERVALS[mode];
  return silenceMeansStillMs(distanceInterval, timeInterval);
}

/**
 * No fix for this long *while the last fixes said "moving"* = signal lost.
 * Stopping is covered by `stillAfterSilenceMs`; the distance filter keeps
 * a standing user silent, which is not a lost signal.
 */
export function staleFixMs(mode: TrackingMode) {
  return Math.max(20_000, 2 * stillAfterSilenceMs(mode));
}

/**
 * The accuracy/battery trade-off table from the spec. Measure both on the
 * same 30-minute route and record the battery delta — that's the deliverable.
 */
export function locationTaskOptions(
  mode: TrackingMode,
  title: string,
): Location.LocationTaskOptions {
  const common: Location.LocationTaskOptions = {
    activityType: Location.LocationActivityType.Fitness,
    // iOS would otherwise pause updates when it *thinks* you've stopped —
    // which is exactly when auto-pause needs to see you start again.
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: title,
      notificationBody: "Recording your route",
      notificationColor: "#16a34a",
      // Keep the foreground service (and recording) alive if the user swipes
      // the app away from recents; `true` would destroy it with the app.
      killServiceOnDestroy: false,
    },
  };
  if (mode === "accurate") {
    return {
      ...common,
      accuracy: Location.Accuracy.BestForNavigation,
      ...INTERVALS.accurate,
    };
  }
  return {
    ...common,
    accuracy: Location.Accuracy.Balanced,
    ...INTERVALS.saver,
    deferredUpdatesDistance: 100,
    deferredUpdatesInterval: 60_000,
  };
}

export function watchOptions(mode: TrackingMode): Location.LocationOptions {
  return mode === "accurate"
    ? { accuracy: Location.Accuracy.BestForNavigation, ...INTERVALS.accurate }
    : { accuracy: Location.Accuracy.Balanced, ...INTERVALS.saver };
}

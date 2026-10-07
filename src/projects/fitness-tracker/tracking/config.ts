import * as Location from "expo-location";

import type { TrackingMode } from "../models/Workout";

export const LOCATION_TASK = "fitness-tracker-location";

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
      distanceInterval: 5,
      timeInterval: 1000,
    };
  }
  return {
    ...common,
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 25,
    timeInterval: 10_000,
    deferredUpdatesDistance: 100,
    deferredUpdatesInterval: 60_000,
  };
}

export function watchOptions(mode: TrackingMode): Location.LocationOptions {
  return mode === "accurate"
    ? {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 1000,
      }
    : {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 10_000,
      };
}

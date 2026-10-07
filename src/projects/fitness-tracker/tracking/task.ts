/**
 * Module scope, on purpose. The OS can relaunch the app headless to deliver
 * locations; only a task defined while the bundle *evaluates* exists then. A
 * defineTask inside a component works in the foreground and silently records
 * nothing in the background — the most common background-location bug.
 */
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";

import * as liveActivity from "../liveactivity";
import type { RawFix } from "../models/Workout";
import { LOCATION_TASK } from "./config";
import { handleAction } from "./controller";
import { ingest } from "./pipeline";

if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: LocationObject[] }>(
    LOCATION_TASK,
    async ({ data, error }) => {
      if (error) {
        console.warn("[fitness] location task error", error.message);
        return;
      }
      const fixes: RawFix[] = (data?.locations ?? []).map((loc) => ({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        timestamp: loc.timestamp,
      }));
      // Awaited: the OS may suspend us as soon as this promise settles.
      await ingest(fixes);
    },
  );
}

// Pause / Resume / End from the lock screen or notification, handled without
// any UI mounted — the whole point of the Live Activity buttons.
liveActivity.addActionListener(({ action }) => {
  handleAction(action);
});

/** An action tapped while JS was dead is parked natively; replay it once. */
export function replayPendingAction() {
  const action = liveActivity.consumePendingAction();
  if (action) handleAction(action);
}

let replayStarted = false;

/**
 * Called once from the root layout, so a parked action runs on any launch
 * (headless included), not only once the user opens the tracker. Safe without
 * UI: `handleAction` only goes through the controller's serialized entry
 * points (SQLite, location updates, Live Activity). Also replays whenever the
 * app returns to the foreground, in case an action was parked meanwhile.
 */
export function startPendingActionReplay() {
  if (replayStarted) return;
  replayStarted = true;
  replayPendingAction();
  AppState.addEventListener("change", (state) => {
    if (state === "active") replayPendingAction();
  });
}

export { LOCATION_TASK };

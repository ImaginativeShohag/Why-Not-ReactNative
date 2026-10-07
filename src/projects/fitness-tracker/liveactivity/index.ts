/**
 * The only thing screens and the pipeline import for Live Activities / the
 * Android ongoing notification / widgets. Adds the ~1 Hz throttle: iOS
 * throttles or kills an activity that is updated at GPS rate.
 */
import {
  addActionListener,
  consumePendingAction,
  endLiveActivity,
  isAvailable,
  setWidgetData,
  startLiveActivity,
  updateLiveActivity,
  type LiveActivityAction,
  type WidgetData,
  type WorkoutActivityState,
} from "@/modules/live-activity";

import { paceSecPerKm } from "../tracking/metrics";
import type { Session } from "../tracking/state";
import { activeElapsedMs } from "../tracking/state";

export type { LiveActivityAction, WidgetData };

const MIN_INTERVAL_MS = 1000;
let lastPush = 0;
let pending: ReturnType<typeof setTimeout> | null = null;
let latest: WorkoutActivityState | null = null;

export function buildState(
  session: Session,
  totals: { distanceM: number; movingMs: number },
  heartRate: number | null = null,
  now = Date.now(),
): WorkoutActivityState {
  const elapsed = activeElapsedMs(session, now);
  return {
    timerStart: now - elapsed,
    elapsedSec: Math.floor(elapsed / 1000),
    distanceM: totals.distanceM,
    paceSecPerKm: paceSecPerKm(totals.distanceM, totals.movingMs, 20),
    heartRate,
    isPaused: session.status !== "active",
  };
}

export async function start(session: Session) {
  lastPush = Date.now();
  try {
    await startLiveActivity(
      {
        workoutId: session.workoutId,
        activityType: session.activity,
        title: session.title,
      },
      buildState(session, { distanceM: 0, movingMs: 0 }),
    );
  } catch (error) {
    // User disabled Live Activities, or too many active — tracking goes on.
    console.warn("[fitness] live activity start failed", error);
  }
}

/** Throttled: coalesces bursts, always delivers the most recent state. */
export function update(state: WorkoutActivityState, force = false) {
  latest = state;
  const wait = MIN_INTERVAL_MS - (Date.now() - lastPush);
  if (force || wait <= 0) {
    if (pending) clearTimeout(pending);
    pending = null;
    lastPush = Date.now();
    updateLiveActivity(state).catch(() => {});
    return;
  }
  if (!pending) {
    pending = setTimeout(() => {
      pending = null;
      lastPush = Date.now();
      if (latest) updateLiveActivity(latest).catch(() => {});
    }, wait);
  }
}

export async function end(finalState: WorkoutActivityState | null) {
  if (pending) clearTimeout(pending);
  pending = null;
  await endLiveActivity(finalState, finalState == null).catch(() => {});
}

export { addActionListener, consumePendingAction, isAvailable, setWidgetData };

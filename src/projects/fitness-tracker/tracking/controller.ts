/**
 * start / pause / resume / stop / discard. Every entry point is idempotent:
 * double taps, a notification action racing a UI tap, or a resume after the
 * app was killed must all converge on the same state.
 */
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { getDb } from "../db/client";
import { getPoints } from "../db/queries/points";
import type { Prefs } from "../db/queries/prefs";
import { replaceSplits } from "../db/queries/splits";
import {
  deleteWorkout,
  getWorkout,
  insertWorkout,
  listUnfinished,
  updateWorkout,
} from "../db/queries/workouts";
import * as liveActivity from "../liveactivity";
import { ACTIVITY_LABELS } from "../models/Workout";
import { defaultTitle } from "../utils/format";
import { newId } from "../utils/dates";
import { LOCATION_TASK, locationTaskOptions, watchOptions } from "./config";
import { estimateCalories, summarize, thumbnailPath } from "./metrics";
import { ingest } from "./pipeline";
import { enqueue } from "./queue";
import {
  clearSession,
  getSession,
  newSession,
  pauseSession,
  resumeSession,
  saveSession,
  type Session,
} from "./state";
import { syncWidget } from "./widget";

export type StartOptions = Pick<
  Prefs,
  "activity" | "mode" | "goalType" | "goalValue" | "autoPause" | "voiceCues"
>;

/** Foreground-only fallback subscription (no background permission). */
let watchSubscription: Location.LocationSubscription | null = null;

async function ensureTracking(session: Session) {
  if (session.background) {
    const running = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK,
    ).catch(() => false);
    if (!running) {
      await Location.startLocationUpdatesAsync(
        LOCATION_TASK,
        locationTaskOptions(session.mode, session.title),
      );
    }
    return;
  }
  if (!watchSubscription) {
    watchSubscription = await Location.watchPositionAsync(
      watchOptions(session.mode),
      (loc) => {
        ingest([
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude,
            accuracy: loc.coords.accuracy,
            speed: loc.coords.speed,
            timestamp: loc.timestamp,
          },
        ]);
      },
    );
  }
}

async function stopTracking() {
  watchSubscription?.remove();
  watchSubscription = null;
  const registered = await TaskManager.isTaskRegisteredAsync(
    LOCATION_TASK,
  ).catch(() => false);
  if (
    registered &&
    (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
      () => false,
    ))
  ) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export function startWorkout(options: StartOptions): Promise<string> {
  return enqueue(async () => {
    const db = await getDb();
    const existing = await getSession(db);
    if (existing) {
      await ensureTracking(existing);
      return existing.workoutId;
    }

    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted)
      throw new Error("Location permission is required to record a workout.");
    const bg = await Location.getBackgroundPermissionsAsync().catch(() => null);

    const startedAt = Date.now();
    const title = defaultTitle(startedAt, ACTIVITY_LABELS[options.activity]);
    const [battery, lowPower] = await Promise.all([
      Battery.getBatteryLevelAsync().catch(() => -1),
      Battery.isLowPowerModeEnabledAsync().catch(() => false),
    ]);

    const id = newId();
    await insertWorkout(db, {
      id,
      type: options.activity,
      title,
      startedAt,
      mode: options.mode,
      goalType: options.goalType,
      goalValue: options.goalValue,
      batteryStart: battery >= 0 ? battery : null,
      lowPowerMode: lowPower,
    });

    const session = newSession({
      workoutId: id,
      title,
      activity: options.activity,
      mode: options.mode,
      startedAt,
      autoPause: options.autoPause,
      voiceCues: options.voiceCues,
      background: bg?.granted ?? false,
    });
    // Persist the session *before* starting updates, so the very first task
    // invocation finds it.
    await saveSession(db, session);
    await ensureTracking(session);
    await liveActivity.start(session);
    return id;
  });
}

async function transition(fn: (s: Session, now: number) => Session) {
  return enqueue(async () => {
    const db = await getDb();
    const session = await getSession(db);
    if (!session) return null;
    const next = fn(session, Date.now());
    if (next === session) return session;
    await saveSession(db, next);
    await updateWorkout(db, next.workoutId, { status: next.status });
    const workout = await getWorkout(db, next.workoutId);
    if (workout)
      liveActivity.update(
        liveActivity.buildState(next, workout, workout.avgHeartRate),
        true,
      );
    return next;
  });
}

export const pauseWorkout = () =>
  transition((s, now) =>
    s.status === "paused" ? s : pauseSession(s, now, "paused"),
  );

export async function resumeWorkout() {
  const next = await transition((s, now) => resumeSession(s, now));
  if (next) await ensureTracking(next);
  return next;
}

/** Foreground device-motion auto-pause (GPS-speed auto-pause lives in the pipeline). */
export const autoPauseFromMotion = (action: "pause" | "resume") =>
  transition((s, now) => {
    if (!s.autoPause) return s;
    if (action === "pause" && s.status === "active")
      return pauseSession(s, now, "autopaused");
    if (action === "resume" && s.status === "autopaused")
      return resumeSession(s, now);
    return s;
  });

export function stopWorkout(): Promise<string | null> {
  return enqueue(async () => {
    const db = await getDb();
    const session = await getSession(db);
    if (!session) return null;
    await stopTracking();

    const now = Date.now();
    const points = await getPoints(db, session.workoutId);
    const summary = summarize(points);
    const workout = await getWorkout(db, session.workoutId);
    const battery = await Battery.getBatteryLevelAsync().catch(() => -1);

    await replaceSplits(db, session.workoutId, summary.splits);
    await updateWorkout(db, session.workoutId, {
      status: "finished",
      endedAt: now,
      // Recompute from points: the rolling values are for display only.
      distanceM: summary.distanceM,
      movingMs: summary.movingMs,
      elevationGainM: summary.elevationGainM,
      elevationLossM: summary.elevationLossM,
      pointCount: summary.pointCount,
      calories: estimateCalories(
        session.activity,
        summary.distanceM,
        summary.movingMs,
      ),
      batteryEnd: battery >= 0 ? battery : null,
      thumbnail: thumbnailPath(points),
    });
    await clearSession(db);

    const final = liveActivity.buildState(
      { ...session, status: "paused", pausedAt: session.pausedAt ?? now },
      summary,
    );
    await liveActivity.end(workout ? final : null);
    await syncWidget();
    return session.workoutId;
  });
}

export function discardWorkout(): Promise<void> {
  return enqueue(async () => {
    const db = await getDb();
    const session = await getSession(db);
    await stopTracking();
    if (session) await deleteWorkout(db, session.workoutId);
    await clearSession(db);
    await liveActivity.end(null);
  });
}

/**
 * Crash/kill recovery. A session row that exists on launch means a workout
 * was running when the process died. Orphan workout rows without a session
 * (killed between insert and saveSession) are discarded.
 *
 * Serialized like every other entry point: run between `insertWorkout` and
 * `saveSession` of an in-flight `startWorkout`, the new row would look like
 * an orphan and be deleted under the session that is about to point at it.
 */
export function findRecoverable() {
  return enqueue(async () => {
    const db = await getDb();
    const session = await getSession(db);
    const unfinished = await listUnfinished(db);
    for (const w of unfinished) {
      if (w.id !== session?.workoutId) await deleteWorkout(db, w.id);
    }
    if (!session) return null;
    const tracking = session.background
      ? await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
          () => false,
        )
      : watchSubscription != null;
    return { session, tracking };
  });
}

/** Re-arm the location source after a kill without changing pause state. */
export function reattach() {
  return enqueue(async () => {
    const db = await getDb();
    const session = await getSession(db);
    if (session) await ensureTracking(session);
    return session;
  });
}

export function handleAction(action: liveActivity.LiveActivityAction) {
  if (action === "pause") return pauseWorkout();
  if (action === "resume") return resumeWorkout();
  return stopWorkout();
}

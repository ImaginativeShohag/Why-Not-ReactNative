/**
 * raw fix → filter → smooth → persist → rolling metrics → Live Activity.
 * Called from the TaskManager task (background) or the foreground
 * watchPositionAsync fallback. Writes every accepted point immediately: a task
 * invocation may be the last JS that ever runs for this workout.
 */
import * as Speech from "expo-speech";

import { getDb } from "../db/client";
import { insertPoints } from "../db/queries/points";
import { addRolling, getWorkout, updateWorkout } from "../db/queries/workouts";
import * as liveActivity from "../liveactivity";
import type { Point, RawFix, Workout } from "../models/Workout";
import { formatPace } from "../utils/format";
import { STILL_SPEED_MPS, stepAutoPause } from "./autoPause";
import { processFix } from "./filters";
import { haversine, paceSecPerKm, stepElevation } from "./metrics";
import { enqueue } from "./queue";
import {
  getSession,
  pauseSession,
  resumeSession,
  saveSession,
  type Session,
} from "./state";

export function ingest(fixes: readonly RawFix[]) {
  return enqueue(() => ingestNow(fixes)).catch((error) => {
    console.warn("[fitness] ingest failed", error);
  });
}

async function ingestNow(fixes: readonly RawFix[]) {
  if (!fixes.length) return;
  const db = await getDb();
  const initial = await getSession(db);
  // Manual pause: ignore fixes entirely (updates keep running for instant resume).
  if (!initial || initial.status === "paused") return;

  let session: Session = initial;
  const accepted: Point[] = [];
  let distance = 0;
  let moving = 0;
  let gain = 0;
  let loss = 0;
  let prevRaw: RawFix | null = null;

  for (const fix of [...fixes].sort((a, b) => a.timestamp - b.timestamp)) {
    if (session.autoPause) {
      const speed =
        fix.speed != null && fix.speed >= 0
          ? fix.speed
          : prevRaw && fix.timestamp > prevRaw.timestamp
            ? haversine(
                { lat: prevRaw.latitude, lng: prevRaw.longitude },
                { lat: fix.latitude, lng: fix.longitude },
              ) /
              ((fix.timestamp - prevRaw.timestamp) / 1000)
            : null;
      if (speed != null) {
        const step = stepAutoPause(
          session.autoPauseState,
          { t: fix.timestamp, moving: speed > STILL_SPEED_MPS },
          session.status === "autopaused",
        );
        session = { ...session, autoPauseState: step.state };
        if (step.action === "pause")
          session = pauseSession(session, fix.timestamp, "autopaused");
        if (step.action === "resume")
          session = resumeSession(session, fix.timestamp);
      }
    }
    prevRaw = fix;
    if (session.status !== "active") continue;

    const prev = session.filter.last;
    const result = processFix(session.filter, fix, {
      activity: session.activity,
      segment: session.segment,
    });
    session = { ...session, filter: result.state };
    if (!result.point) continue;

    const p = result.point;
    accepted.push(p);
    if (prev && prev.segment === p.segment) {
      distance += haversine(prev, p);
      moving += p.t - prev.t;
    }
    const elev = stepElevation(session.elevationRef, p.alt);
    session = { ...session, elevationRef: elev.ref };
    gain += elev.gain;
    loss += elev.loss;
  }

  // One transaction per batch: a single commit instead of one per write, and
  // points, totals and session can never disagree after a kill.
  // `as` keeps TS from narrowing these to `null` across the async callback.
  let workout = null as Workout | null;
  let cue = null as string | null;
  await db.withTransactionAsync(async () => {
    await insertPoints(db, session.workoutId, accepted);
    if (session.status !== initial.status) {
      await updateWorkout(db, session.workoutId, { status: session.status });
    }
    workout = accepted.length
      ? await addRolling(db, session.workoutId, {
          distanceM: distance,
          movingMs: moving,
          gainM: gain,
          lossM: loss,
          points: accepted.length,
        })
      : await getWorkout(db, session.workoutId);

    if (workout && session.voiceCues) {
      const km = Math.floor(workout.distanceM / 1000);
      if (km > session.lastKmAnnounced) {
        session = { ...session, lastKmAnnounced: km };
        const pace = paceSecPerKm(workout.distanceM, workout.movingMs);
        cue = `${km} kilometre${km > 1 ? "s" : ""}. Average pace ${formatPace(pace).replace("'", " minutes ").replace('"', " seconds")}`;
      }
    }
    await saveSession(db, session);
  });
  if (cue) Speech.speak(cue);

  if (workout) {
    liveActivity.update(
      liveActivity.buildState(session, workout, workout.avgHeartRate),
      session.status !== initial.status,
    );
  }
}

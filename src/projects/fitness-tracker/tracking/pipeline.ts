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
import {
  gpsMayAct,
  silentStopAt,
  STILL_SPEED_MPS,
  stepAutoPause,
} from "./autoPause";
import { stillAfterSilenceMs } from "./config";
import { processFix } from "./filters";
import { haversine, paceSecPerKm, stepElevation } from "./metrics";
import { enqueue } from "./queue";
import {
  activeSince,
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

/** How much of an auto-pause is kept so a resume can replay it. */
const RESUME_BUFFER_MS = 10_000;

/**
 * Same as `ingest`, for callers that already hold the queue (a controller
 * transition replaying buffered fixes after a motion resume). Enqueueing
 * from inside a queued job would deadlock.
 */
export async function ingestNow(fixes: readonly RawFix[]) {
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
  const silenceMs = stillAfterSilenceMs(session.mode);

  const accept = (fix: RawFix) => {
    const prev = session.filter.last;
    const result = processFix(session.filter, fix, {
      activity: session.activity,
      segment: session.segment,
      notBefore: session.startedAt,
    });
    session = { ...session, filter: result.state };
    if (!result.point) return;

    const p = result.point;
    // The filter opens a new segment after a long gap or a re-anchor.
    if (p.segment !== session.segment)
      session = { ...session, segment: p.segment };
    accepted.push(p);
    if (prev && prev.segment === p.segment) {
      distance += haversine(prev, p);
      moving += p.t - prev.t;
    }
    const elev = stepElevation(session.elevationRef, p.alt);
    session = { ...session, elevationRef: elev.ref };
    gain += elev.gain;
    loss += elev.loss;
  };

  for (const fix of [...fixes].sort((a, b) => a.timestamp - b.timestamp)) {
    // A cached pre-start fix is not part of this workout.
    if (fix.timestamp < session.startedAt) continue;
    const prevRaw = session.lastRaw ?? null;
    if (!prevRaw || fix.timestamp > prevRaw.timestamp)
      session = { ...session, lastRaw: fix };

    if (session.autoPause) {
      // The distance filter sends nothing while you stand still: a long
      // silence before this fix means you were stopped. Pause retroactively.
      if (session.status === "active" && prevRaw) {
        const at = silentStopAt(
          prevRaw.timestamp,
          activeSince(session),
          fix.timestamp,
          silenceMs,
        );
        if (
          at != null &&
          gpsMayAct("pause", fix.timestamp, session.motionDecision)
        ) {
          session = {
            ...pauseSession(session, at, "autopaused"),
            autoPauseState: {
              stillSince: prevRaw.timestamp,
              movingSince: null,
            },
          };
        }
      }

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
        if (
          step.action === "pause" &&
          gpsMayAct("pause", fix.timestamp, session.motionDecision)
        )
          session = pauseSession(session, fix.timestamp, "autopaused");
        if (
          step.action === "resume" &&
          gpsMayAct("resume", fix.timestamp, session.motionDecision)
        ) {
          // Restart the clock when movement began, and keep the fixes from
          // the confirmation window instead of dropping them.
          const at = step.state.movingSince ?? fix.timestamp;
          const replay = (session.resumeBuffer ?? []).filter(
            (f) => f.timestamp >= at,
          );
          session = resumeSession(session, at);
          for (const f of replay) accept(f);
        }
      }
      if (session.status === "autopaused") {
        session = {
          ...session,
          resumeBuffer: [...(session.resumeBuffer ?? []), fix].filter(
            (f) => f.timestamp >= fix.timestamp - RESUME_BUFFER_MS,
          ),
        };
      }
    }
    if (session.status !== "active") continue;
    accept(fix);
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

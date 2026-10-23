/**
 * PURE fix filtering and smoothing. The pipeline order matters and matches the
 * spec: accuracy gate → stale timestamp → implied-speed outlier → smooth →
 * min-movement (jitter) gate. Everything here is `(state, fix) => result` so
 * the background task can persist `FilterState` between invocations.
 */
import type { ActivityType, Point, RawFix } from "../models/Workout";
import { haversine } from "./metrics";

export const MAX_ACCURACY_M = 25;
export const MIN_MOVE_M = 5;
/**
 * A gap this long between two accepted points (process killed, GPS dead,
 * phone in a drawer) starts a new segment instead of drawing a straight line
 * and counting the gap as distance and moving time.
 */
export const MAX_GAP_MS = 60_000;
/**
 * After this many speed rejections in a row the anchor is the problem (a bad
 * point slipped in, or the user really is that fast): re-anchor on the newest
 * fix in a fresh segment instead of rejecting everything from here on.
 */
export const SPEED_RESET_AFTER = 3;

/** Anything faster than this for the activity is a GPS jump, not the user. */
export const MAX_SPEED_MPS: Record<ActivityType, number> = {
  walk: 4,
  hike: 4,
  run: 10,
  cycle: 25,
};

export type RejectReason =
  "invalid" | "accuracy" | "stale" | "speed" | "jitter";

export type KalmanState = {
  lat: number;
  lng: number;
  /** metres² */
  variance: number;
  t: number;
};

export type FilterState = {
  /** Last *accepted* point — the reference for speed and jitter checks. */
  last: Point | null;
  kalman: KalmanState | null;
  /** Consecutive speed rejections against `last`. Optional: older persisted sessions lack it. */
  speedRejects?: number;
};

export type FilterOptions = {
  activity: ActivityType;
  segment: number;
  /** Fixes older than this (e.g. the session start) are stale: cached pre-start positions. */
  notBefore?: number;
  maxAccuracyM?: number;
  minMoveM?: number;
};

export type FilterResult =
  | { state: FilterState; point: Point; reason: null }
  | { state: FilterState; point: null; reason: RejectReason };

export const initialFilterState: FilterState = { last: null, kalman: null };

/**
 * One-dimensional Kalman filter applied to lat and lng with a shared variance,
 * using the fix's accuracy as measurement noise. `qMps` is how fast we believe
 * the true position can drift per second — higher = trusts new fixes more.
 */
export function kalmanStep(
  state: KalmanState | null,
  fix: { lat: number; lng: number; acc: number; t: number },
  qMps = 3,
): KalmanState {
  const acc = Math.max(fix.acc, 1);
  if (!state)
    return { lat: fix.lat, lng: fix.lng, variance: acc * acc, t: fix.t };

  let variance = state.variance;
  const dt = (fix.t - state.t) / 1000;
  if (dt > 0) variance += dt * qMps * qMps;

  const k = variance / (variance + acc * acc);
  return {
    lat: state.lat + k * (fix.lat - state.lat),
    lng: state.lng + k * (fix.lng - state.lng),
    variance: (1 - k) * variance,
    t: fix.t,
  };
}

export function isValidFix(fix: RawFix) {
  return (
    Number.isFinite(fix.latitude) &&
    Number.isFinite(fix.longitude) &&
    Math.abs(fix.latitude) <= 90 &&
    Math.abs(fix.longitude) <= 180 &&
    !(fix.latitude === 0 && fix.longitude === 0)
  );
}

export function processFix(
  state: FilterState,
  fix: RawFix,
  options: FilterOptions,
): FilterResult {
  const maxAcc = options.maxAccuracyM ?? MAX_ACCURACY_M;
  const minMove = options.minMoveM ?? MIN_MOVE_M;
  const reject = (reason: RejectReason, next = state): FilterResult => ({
    state: next,
    point: null,
    reason,
  });

  if (!isValidFix(fix)) return reject("invalid");
  if (fix.accuracy != null && fix.accuracy > maxAcc) return reject("accuracy");

  const last = state.last;
  // A new segment (after resume) must not be compared with the pre-pause point.
  const sameSegment = last != null && last.segment === options.segment;

  if (options.notBefore != null && fix.timestamp < options.notBefore)
    return reject("stale");
  if (last && fix.timestamp <= last.t) return reject("stale");

  // Continue the current segment unless the gap or a re-anchor says otherwise.
  let segment = options.segment;
  let continues = sameSegment;
  // Measured from the last fix the filter *saw* (jitter fixes keep the
  // Kalman clock warm), so standing still at a light is not a gap.
  const seenAt = Math.max(last?.t ?? 0, state.kalman?.t ?? 0);
  if (continues && last && fix.timestamp - seenAt > MAX_GAP_MS) {
    continues = false;
    segment = options.segment + 1;
  }

  if (continues && last) {
    const dt = (fix.timestamp - last.t) / 1000;
    const d = haversine(last, { lat: fix.latitude, lng: fix.longitude });
    if (d / dt > MAX_SPEED_MPS[options.activity]) {
      const streak = (state.speedRejects ?? 0) + 1;
      if (streak < SPEED_RESET_AFTER) {
        return reject("speed", { ...state, speedRejects: streak });
      }
      // Never bridge the jump: the distance across it is not trustworthy.
      continues = false;
      segment = options.segment + 1;
    }
  }

  const kalman = kalmanStep(continues ? state.kalman : null, {
    lat: fix.latitude,
    lng: fix.longitude,
    acc: fix.accuracy ?? maxAcc,
    t: fix.timestamp,
  });

  const point: Point = {
    lat: kalman.lat,
    lng: kalman.lng,
    alt: fix.altitude,
    acc: fix.accuracy,
    speed: fix.speed != null && fix.speed >= 0 ? fix.speed : null,
    t: fix.timestamp,
    segment,
  };

  // Standing still: keep the filter warm but don't write a point.
  if (continues && last && haversine(last, point) < minMove) {
    return reject("jitter", { last, kalman, speedRejects: 0 });
  }

  // `point.segment` may be ahead of `options.segment`: the caller adopts it.
  return {
    state: { last: point, kalman, speedRejects: 0 },
    point,
    reason: null,
  };
}

/** Batch helper — filters a whole array of fixes, oldest first. */
export function processFixes(
  state: FilterState,
  fixes: readonly RawFix[],
  options: FilterOptions,
) {
  const accepted: Point[] = [];
  const rejected: Partial<Record<RejectReason, number>> = {};
  let current = state;
  const sorted = [...fixes].sort((a, b) => a.timestamp - b.timestamp);
  for (const fix of sorted) {
    const result = processFix(current, fix, options);
    current = result.state;
    if (result.point) accepted.push(result.point);
    else rejected[result.reason] = (rejected[result.reason] ?? 0) + 1;
  }
  return { state: current, accepted, rejected };
}

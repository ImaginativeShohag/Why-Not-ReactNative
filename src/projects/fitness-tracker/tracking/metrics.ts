/**
 * PURE metrics. No React, no SQLite, no location API — just
 * `(points) => numbers`. That constraint is what makes tracking correctness
 * unit-testable against a recorded GPX instead of going outside for a walk.
 */
import type { ActivityType, Point, Split, Summary } from "../models/Workout";

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_008.8;

/**
 * Altitude has to move this far from the last reference before it counts.
 * GPS altitude jitters ±5 m at rest; without hysteresis a flat 10 km run
 * "climbs" 300 m.
 */
export const ELEVATION_HYSTERESIS_M = 3;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Pace in seconds per km, or null when there's not enough to say. Live
 * displays pass `minDistanceM` (20 m) so the first fixes don't flash an
 * absurd pace.
 */
export function paceSecPerKm(
  distanceM: number,
  durationMs: number,
  minDistanceM = 1,
) {
  if (distanceM < minDistanceM || durationMs <= 0) return null;
  return durationMs / 1000 / (distanceM / 1000);
}

/** Total distance, never bridging a segment boundary (i.e. a pause). */
export function totalDistance(points: readonly Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].segment !== points[i - 1].segment) continue;
    d += haversine(points[i - 1], points[i]);
  }
  return d;
}

/** Sum of time between consecutive points inside the same segment. */
export function movingTime(points: readonly Point[]): number {
  let ms = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].segment !== points[i - 1].segment) continue;
    ms += points[i].t - points[i - 1].t;
  }
  return ms;
}

export function elevationChange(
  altitudes: readonly (number | null)[],
  threshold = ELEVATION_HYSTERESIS_M,
) {
  let gain = 0;
  let loss = 0;
  let ref: number | null = null;
  for (const alt of altitudes) {
    if (alt == null) continue;
    if (ref == null) {
      ref = alt;
      continue;
    }
    const delta = alt - ref;
    if (delta >= threshold) {
      gain += delta;
      ref = alt;
    } else if (delta <= -threshold) {
      loss += -delta;
      ref = alt;
    }
  }
  return { gain, loss };
}

/**
 * Incremental version of `elevationChange` for the live pipeline. The caller
 * persists `ref` between task invocations.
 */
export function stepElevation(
  ref: number | null,
  alt: number | null,
  threshold = ELEVATION_HYSTERESIS_M,
) {
  if (alt == null) return { ref, gain: 0, loss: 0 };
  if (ref == null) return { ref: alt, gain: 0, loss: 0 };
  const delta = alt - ref;
  if (delta >= threshold) return { ref: alt, gain: delta, loss: 0 };
  if (delta <= -threshold) return { ref: alt, gain: 0, loss: -delta };
  return { ref, gain: 0, loss: 0 };
}

/**
 * Kilometre (or any `splitM`) splits using moving time. The boundary instant
 * is linearly interpolated between the two points that straddle it, so a
 * sparse battery-saver track still yields sensible split times.
 */
export function computeSplits(
  points: readonly Point[],
  splitM = 1000,
): Split[] {
  const splits: Split[] = [];
  if (points.length < 2) return splits;

  let cumD = 0;
  let cumT = 0;
  let splitStartD = 0;
  let splitStartT = 0;
  let splitStartAlt: number | null = points[0].alt;
  let lastAlt: number | null = points[0].alt;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.alt != null) lastAlt = b.alt;
    if (a.segment !== b.segment) continue;

    const d = haversine(a, b);
    const dt = b.t - a.t;

    // A single leg may cross more than one boundary (very sparse data).
    const legStartD = cumD;
    const legStartT = cumT;
    while (d > 0 && legStartD + d >= splitStartD + splitM) {
      const boundaryD = splitStartD + splitM;
      const frac = (boundaryD - legStartD) / d;
      const tAt = legStartT + dt * frac;
      const altAt =
        a.alt != null && b.alt != null
          ? a.alt + (b.alt - a.alt) * frac
          : lastAlt;
      const durationMs = tAt - splitStartT;
      splits.push({
        index: splits.length + 1,
        distanceM: splitM,
        durationMs,
        paceSecPerKm: (durationMs / 1000 / splitM) * 1000,
        elevationDeltaM:
          altAt != null && splitStartAlt != null ? altAt - splitStartAlt : 0,
      });
      splitStartD = boundaryD;
      splitStartT = tAt;
      splitStartAlt = altAt;
    }
    cumD = legStartD + d;
    cumT = legStartT + dt;
  }

  const tailD = cumD - splitStartD;
  // Drop a trailing sliver — a 12 m "split" has a meaningless pace.
  if (tailD >= 50) {
    const durationMs = cumT - splitStartT;
    splits.push({
      index: splits.length + 1,
      distanceM: tailD,
      durationMs,
      paceSecPerKm: (durationMs / 1000 / tailD) * 1000,
      elevationDeltaM:
        lastAlt != null && splitStartAlt != null ? lastAlt - splitStartAlt : 0,
    });
  }
  return splits;
}

export function summarize(points: readonly Point[]): Summary {
  const distanceM = totalDistance(points);
  const movingMs = movingTime(points);
  const elapsedMs =
    points.length > 1 ? points[points.length - 1].t - points[0].t : 0;
  const { gain, loss } = elevationChange(points.map((p) => p.alt));

  let maxSpeed = 0;
  let minAlt: number | null = null;
  let maxAlt: number | null = null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.alt != null) {
      minAlt = minAlt == null ? p.alt : Math.min(minAlt, p.alt);
      maxAlt = maxAlt == null ? p.alt : Math.max(maxAlt, p.alt);
    }
    // Derived speed is more trustworthy than `coords.speed`, which is -1 or
    // null on many Android fixes.
    if (i > 0 && points[i - 1].segment === p.segment) {
      const dt = (p.t - points[i - 1].t) / 1000;
      if (dt >= 1)
        maxSpeed = Math.max(maxSpeed, haversine(points[i - 1], p) / dt);
    }
  }

  return {
    distanceM,
    movingMs,
    elapsedMs,
    avgPaceSecPerKm: paceSecPerKm(distanceM, movingMs),
    avgSpeedMps: movingMs > 0 ? distanceM / (movingMs / 1000) : 0,
    maxSpeedMps: maxSpeed,
    elevationGainM: gain,
    elevationLossM: loss,
    minAltM: minAlt,
    maxAltM: maxAlt,
    splits: computeSplits(points),
    pointCount: points.length,
  };
}

export type SeriesPoint = { x: number; y: number };

/**
 * Pace per `bucketM` of distance, x = distance in metres. Bucketing by
 * distance (not time) keeps the chart's x-axis aligned with the splits.
 */
export function paceSeries(
  points: readonly Point[],
  bucketM = 200,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let cumD = 0;
  let bucketD = 0;
  let bucketT = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.segment !== b.segment) continue;
    const d = haversine(a, b);
    cumD += d;
    bucketD += d;
    bucketT += b.t - a.t;
    if (bucketD >= bucketM) {
      const pace = paceSecPerKm(bucketD, bucketT);
      if (pace != null) out.push({ x: cumD, y: pace });
      bucketD = 0;
      bucketT = 0;
    }
  }
  return out;
}

/** Altitude against distance. */
export function elevationSeries(points: readonly Point[]): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let cumD = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0 && points[i].segment === points[i - 1].segment) {
      cumD += haversine(points[i - 1], points[i]);
    }
    const alt = points[i].alt;
    if (alt != null) out.push({ x: cumD, y: alt });
  }
  return out;
}

/**
 * Iterative Douglas–Peucker. Recursion would blow the stack on a 12k-point
 * hike under Hermes, so it uses an explicit stack. Distances are computed on a
 * local equirectangular projection — accurate to well under a metre over the
 * extent of any single workout.
 */
export function douglasPeucker<T extends LatLng>(
  points: readonly T[],
  epsilonM: number,
): T[] {
  if (points.length <= 2) return points.slice();

  const lat0 = toRad(points[0].lat);
  const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const mPerDegLng = mPerDegLat * Math.cos(lat0);
  const xs = points.map((p) => (p.lng - points[0].lng) * mPerDegLng);
  const ys = points.map((p) => (p.lat - points[0].lat) * mPerDegLat);

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop()!;
    const ax = xs[start];
    const ay = ys[start];
    const dx = xs[end] - ax;
    const dy = ys[end] - ay;
    const lenSq = dx * dx + dy * dy;

    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      let dist: number;
      if (lenSq === 0) {
        dist = Math.hypot(xs[i] - ax, ys[i] - ay);
      } else {
        const t = Math.max(
          0,
          Math.min(1, ((xs[i] - ax) * dx + (ys[i] - ay) * dy) / lenSq),
        );
        dist = Math.hypot(xs[i] - (ax + t * dx), ys[i] - (ay + t * dy));
      }
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (index !== -1 && maxDist > epsilonM) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }

  const out: T[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/** Split into segments, then simplify each one independently. */
export function simplifyRoute(
  points: readonly Point[],
  epsilonM: number,
): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];
  for (const p of points) {
    if (current.length && current[current.length - 1].segment !== p.segment) {
      segments.push(current);
      current = [];
    }
    current.push(p);
  }
  if (current.length) segments.push(current);
  return segments.map((s) => douglasPeucker(s, epsilonM));
}

/**
 * Normalise a route into a unit box ([0..1], y down) for thumbnails, keeping
 * the aspect ratio. Runs Douglas–Peucker first so a thumbnail never holds more
 * than a handful of points.
 */
export function thumbnailPath(
  points: readonly Point[],
  epsilonM = 15,
): [number, number][] {
  if (points.length < 2) return [];
  const simplified = douglasPeucker(points, epsilonM);
  const lat0 = toRad(points[0].lat);
  const xs = simplified.map((p) => p.lng * Math.cos(lat0));
  const ys = simplified.map((p) => -p.lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const offX = (1 - (Math.max(...xs) - minX) / span) / 2;
  const offY = (1 - (Math.max(...ys) - minY) / span) / 2;
  return simplified.map((_, i) => [
    round4((xs[i] - minX) / span + offX),
    round4((ys[i] - minY) / span + offY),
  ]);
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/** Rough MET values. Good enough for a demo; real apps use HR-based models. */
const MET: Record<ActivityType, (speedKmh: number) => number> = {
  walk: (v) => (v < 4 ? 2.8 : v < 5.5 ? 3.5 : 4.3),
  hike: () => 6,
  run: (v) => Math.max(6, v * 1.0),
  cycle: (v) => (v < 16 ? 4 : v < 20 ? 6.8 : v < 25 ? 8 : 10),
};

export function estimateCalories(
  type: ActivityType,
  distanceM: number,
  movingMs: number,
  weightKg = 70,
): number {
  if (movingMs <= 0) return 0;
  const hours = movingMs / 3_600_000;
  const speedKmh = distanceM / 1000 / hours;
  return Math.round(MET[type](speedKmh) * weightKg * hours);
}

/** Coordinates where each full kilometre was reached — split markers on the map. */
export function kmMarkers(
  points: readonly Point[],
  every = 1000,
): { km: number; lat: number; lng: number }[] {
  const out: { km: number; lat: number; lng: number }[] = [];
  let cum = 0;
  let next = every;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.segment !== b.segment) continue;
    const d = haversine(a, b);
    while (d > 0 && cum + d >= next) {
      const f = (next - cum) / d;
      out.push({
        km: next / every,
        lat: a.lat + (b.lat - a.lat) * f,
        lng: a.lng + (b.lng - a.lng) * f,
      });
      next += every;
    }
    cum += d;
  }
  return out;
}

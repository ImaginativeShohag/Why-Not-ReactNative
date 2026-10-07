import type { Point } from "../models/Workout";
import { haversine } from "../tracking/metrics";

/** Fast → slow. Chosen to stay distinguishable for red–green colour blindness. */
export const PACE_COLORS = [
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#eab308",
  "#f97316",
  "#dc2626",
];

export type ColoredSegment = {
  color: string;
  coordinates: { latitude: number; longitude: number }[];
};

/**
 * Groups consecutive legs of similar pace into one polyline each. Drawing one
 * `<Polyline>` per leg would put thousands of native views on the map; grouping
 * by bucket keeps it to tens.
 *
 * Buckets are relative to this workout's own pace spread (10th–90th
 * percentile), so a walk and a sprint both use the full colour range.
 */
export function paceColoredSegments(
  points: readonly Point[],
): ColoredSegment[] {
  if (points.length < 2) return [];

  const paces: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = haversine(a, b);
    const dt = (b.t - a.t) / 1000;
    paces.push(
      a.segment === b.segment && d > 0 && dt > 0 ? dt / (d / 1000) : NaN,
    );
  }
  const sorted = paces.filter(Number.isFinite).sort((x, y) => x - y);
  const lo = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const hi = sorted[Math.floor(sorted.length * 0.9)] ?? lo + 1;
  const bucketOf = (pace: number) => {
    if (!Number.isFinite(pace)) return -1;
    const f = (pace - lo) / Math.max(hi - lo, 1);
    return Math.max(
      0,
      Math.min(PACE_COLORS.length - 1, Math.floor(f * PACE_COLORS.length)),
    );
  };

  const out: ColoredSegment[] = [];
  let currentBucket = -2;
  let current: ColoredSegment | null = null;
  for (let i = 1; i < points.length; i++) {
    const bucket = bucketOf(paces[i - 1]);
    if (bucket === -1) {
      // Segment boundary — break the line.
      current = null;
      currentBucket = -2;
      continue;
    }
    const a = { latitude: points[i - 1].lat, longitude: points[i - 1].lng };
    const b = { latitude: points[i].lat, longitude: points[i].lng };
    if (current && bucket === currentBucket) {
      current.coordinates.push(b);
    } else {
      current = { color: PACE_COLORS[bucket], coordinates: [a, b] };
      currentBucket = bucket;
      out.push(current);
    }
  }
  return out;
}

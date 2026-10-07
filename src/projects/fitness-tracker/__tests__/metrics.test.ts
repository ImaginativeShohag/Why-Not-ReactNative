import { readFileSync } from "fs";
import { join } from "path";

import { parseGpx } from "../export/gpx";
import type { Point } from "../models/Workout";
import {
  computeSplits,
  douglasPeucker,
  elevationChange,
  estimateCalories,
  haversine,
  movingTime,
  paceSeries,
  simplifyRoute,
  stepElevation,
  summarize,
  thumbnailPath,
  totalDistance,
} from "../tracking/metrics";

/*
 * Fixture: segment 1 is 2100 m due north at 5'00"/km (10 m every 3 s) with
 * altitude 20 → 30 m; then a 10-minute pause and a 500 m jump east; segment 2
 * is 400 m north at 6'00"/km. Known truth: 2500 m, 774 s moving.
 */
const points = parseGpx(
  readFileSync(join(__dirname, "fixtures/track.gpx"), "utf8"),
);

const pt = (
  lat: number,
  lng: number,
  t: number,
  segment = 0,
  alt: number | null = null,
): Point => ({
  lat,
  lng,
  alt,
  acc: 5,
  speed: null,
  t,
  segment,
});

describe("haversine", () => {
  it("is zero for identical points", () => {
    expect(haversine({ lat: 10, lng: 10 }, { lat: 10, lng: 10 })).toBe(0);
  });

  it("measures one degree of latitude as ~111.2 km", () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(
      111_195,
      -1,
    );
  });

  it("matches a known city pair (London → Paris ≈ 343.5 km)", () => {
    const d = haversine(
      { lat: 51.5074, lng: -0.1278 },
      { lat: 48.8566, lng: 2.3522 },
    );
    expect(d / 1000).toBeCloseTo(343.5, 0);
  });
});

describe("fixture track", () => {
  it("parses both segments", () => {
    expect(points).toHaveLength(211 + 41);
    expect(new Set(points.map((p) => p.segment))).toEqual(new Set([0, 1]));
  });

  it("does not count the jump across the pause", () => {
    expect(totalDistance(points)).toBeCloseTo(2500, 0);
  });

  it("moving time excludes the pause", () => {
    expect(movingTime(points)).toBe(630_000 + 144_000);
  });

  it("summarises distance, pace, elevation and elapsed time", () => {
    const s = summarize(points);
    expect(s.distanceM).toBeCloseTo(2500, 0);
    expect(s.movingMs).toBe(774_000);
    expect(s.elapsedMs).toBe(630_000 + 600_000 + 144_000);
    expect(s.avgPaceSecPerKm!).toBeCloseTo(774 / 2.5, 0);
    // Hysteresis counts 20→23→26→29; the final metre to 30 stays uncounted.
    expect(s.elevationGainM).toBeCloseTo(9, 5);
    expect(s.elevationLossM).toBe(0);
    expect(s.maxSpeedMps).toBeCloseTo(10 / 3, 1);
    expect(s.pointCount).toBe(252);
  });
});

describe("splits", () => {
  it("produces 1 km splits plus the partial tail", () => {
    const splits = computeSplits(points);
    expect(splits).toHaveLength(3);
    expect(splits[0].durationMs).toBeCloseTo(300_000, -2);
    expect(splits[0].paceSecPerKm).toBeCloseTo(300, 0);
    expect(splits[1].paceSecPerKm).toBeCloseTo(300, 0);
    // 100 m @ 5'00" + 400 m @ 6'00" = 500 m in 174 s.
    expect(splits[2].distanceM).toBeCloseTo(500, 0);
    expect(splits[2].durationMs).toBeCloseTo(174_000, -2);
    expect(splits[0].elevationDeltaM).toBeCloseTo(10, 0);
  });

  it("interpolates boundaries inside a single long leg", () => {
    // Two points 2.5 km apart, 750 s — a very sparse battery-saver track.
    const sparse = [pt(0, 0, 0), pt(2500 / 111_195, 0, 750_000)];
    const splits = computeSplits(sparse);
    expect(splits).toHaveLength(3);
    expect(splits[0].durationMs).toBeCloseTo(300_000, -3);
    expect(splits[1].durationMs).toBeCloseTo(300_000, -3);
  });

  it("drops a meaningless trailing sliver", () => {
    const pts = [pt(0, 0, 0), pt(1020 / 111_195, 0, 300_000)];
    expect(computeSplits(pts)).toHaveLength(1);
  });

  it("returns nothing for fewer than two points", () => {
    expect(computeSplits([])).toEqual([]);
    expect(computeSplits([pt(0, 0, 0)])).toEqual([]);
  });
});

describe("elevation", () => {
  it("ignores jitter below the hysteresis threshold", () => {
    expect(elevationChange([10, 11, 9, 11, 10, 12, 10])).toEqual({
      gain: 0,
      loss: 0,
    });
  });

  it("counts real climbs and descents", () => {
    expect(elevationChange([10, 15, 20, 12, null, 5])).toEqual({
      gain: 10,
      loss: 15,
    });
  });

  it("incremental stepping agrees with the batch version", () => {
    const alts = [100, 101, 104, 103, 99, 98, 110, 111];
    let ref: number | null = null;
    let gain = 0;
    let loss = 0;
    for (const a of alts) {
      const r = stepElevation(ref, a);
      ref = r.ref;
      gain += r.gain;
      loss += r.loss;
    }
    expect({ gain, loss }).toEqual(elevationChange(alts));
  });
});

describe("douglasPeucker", () => {
  it("collapses a straight line to its endpoints", () => {
    const line = Array.from({ length: 1000 }, (_, i) => pt(i * 0.0001, 0, i));
    const out = douglasPeucker(line, 1);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(line[0]);
    expect(out[1]).toBe(line[999]);
  });

  it("keeps a corner", () => {
    const corner = [
      pt(0, 0, 0),
      pt(0.001, 0, 1),
      pt(0.002, 0, 2),
      pt(0.002, 0.001, 3),
      pt(0.002, 0.002, 4),
    ];
    const out = douglasPeucker(corner, 1);
    expect(out.map((p) => p.t)).toEqual([0, 2, 4]);
  });

  it("handles 12k points without blowing the stack", () => {
    const zigzag = Array.from({ length: 12_000 }, (_, i) =>
      pt(i * 0.00005, (i % 2) * 0.00002 + Math.sin(i / 50) * 0.001, i),
    );
    const out = douglasPeucker(zigzag, 5);
    expect(out.length).toBeLessThan(2000);
    expect(out.length).toBeGreaterThan(2);
  });

  it("simplifies per segment and never bridges a pause", () => {
    const segs = simplifyRoute(points, 2);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toHaveLength(2);
    expect(segs[1]).toHaveLength(2);
  });
});

describe("derived series", () => {
  it("pace series is ~300 s/km in segment one", () => {
    const series = paceSeries(points, 200);
    expect(series.length).toBeGreaterThan(5);
    expect(series[0].y).toBeCloseTo(300, 0);
  });

  it("thumbnail path is normalised into the unit box", () => {
    const path = thumbnailPath(points);
    expect(path.length).toBeGreaterThanOrEqual(2);
    for (const [x, y] of path) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it("estimates calories in a plausible range", () => {
    const kcal = estimateCalories("run", 10_000, 50 * 60_000);
    expect(kcal).toBeGreaterThan(500);
    expect(kcal).toBeLessThan(1000);
    expect(estimateCalories("walk", 0, 0)).toBe(0);
  });
});

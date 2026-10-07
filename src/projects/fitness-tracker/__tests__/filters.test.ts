import {
  DEFAULT_AUTO_PAUSE,
  initialAutoPause,
  stepAutoPause,
} from "../tracking/autoPause";
import {
  initialFilterState,
  kalmanStep,
  MAX_ACCURACY_M,
  processFix,
  processFixes,
} from "../tracking/filters";
import type { RawFix } from "../models/Workout";

const M_PER_DEG = 111_195;

const fix = (
  northM: number,
  t: number,
  accuracy: number | null = 5,
): RawFix => ({
  latitude: 51.5 + northM / M_PER_DEG,
  longitude: -0.1,
  altitude: 20,
  accuracy,
  speed: 3,
  timestamp: t,
});

const opts = { activity: "run" as const, segment: 0 };

describe("processFix", () => {
  it("accepts the first good fix", () => {
    const r = processFix(initialFilterState, fix(0, 1000), opts);
    expect(r.reason).toBeNull();
    expect(r.point?.segment).toBe(0);
  });

  it(`rejects accuracy worse than ${MAX_ACCURACY_M} m`, () => {
    const r = processFix(initialFilterState, fix(0, 1000, 40), opts);
    expect(r.reason).toBe("accuracy");
    expect(r.state).toBe(initialFilterState);
  });

  it("rejects invalid coordinates, including null island", () => {
    const bad = { ...fix(0, 1000), latitude: 0, longitude: 0 };
    expect(processFix(initialFilterState, bad, opts).reason).toBe("invalid");
    expect(
      processFix(initialFilterState, { ...fix(0, 1), latitude: NaN }, opts)
        .reason,
    ).toBe("invalid");
  });

  it("rejects stale or duplicate timestamps", () => {
    const first = processFix(initialFilterState, fix(0, 10_000), opts);
    expect(processFix(first.state, fix(20, 9_000), opts).reason).toBe("stale");
    expect(processFix(first.state, fix(20, 10_000), opts).reason).toBe("stale");
  });

  it("rejects implied-speed outliers for the activity", () => {
    const first = processFix(initialFilterState, fix(0, 0), opts);
    // 200 m in 2 s = 100 m/s: a GPS jump.
    expect(processFix(first.state, fix(200, 2000), opts).reason).toBe("speed");
    // Same jump is fine for a cyclist at 20 s: 10 m/s.
    expect(
      processFix(first.state, fix(200, 20_000), { ...opts, activity: "cycle" })
        .reason,
    ).toBeNull();
    // A walker can't do 6 m/s.
    expect(
      processFix(first.state, fix(60, 10_000), { ...opts, activity: "walk" })
        .reason,
    ).toBe("speed");
  });

  it("skips sub-5 m jitter while standing still but keeps the filter warm", () => {
    const first = processFix(initialFilterState, fix(0, 0), opts);
    const jitter = processFix(first.state, fix(2, 1000), opts);
    expect(jitter.reason).toBe("jitter");
    expect(jitter.state.last).toBe(first.state.last);
    expect(jitter.state.kalman?.t).toBe(1000);
  });

  it("does not compare across a segment boundary (resume after a pause)", () => {
    const first = processFix(initialFilterState, fix(0, 0), opts);
    // 2 km away 60 s later would be a speed outlier within a segment…
    const resumed = processFix(first.state, fix(2000, 60_000), {
      ...opts,
      segment: 1,
    });
    expect(resumed.reason).toBeNull();
    expect(resumed.point?.segment).toBe(1);
    // …and the smoother restarts rather than dragging the point back.
    expect(resumed.point!.lat).toBeCloseTo(51.5 + 2000 / M_PER_DEG, 6);
  });

  it("stops standing-still drift from accumulating distance", () => {
    // Five minutes stationary with ±4 m noise: the spec's failure mode.
    const fixes: RawFix[] = Array.from({ length: 300 }, (_, i) => ({
      ...fix(Math.sin(i * 1.7) * 4, i * 1000, 8),
      longitude: -0.1 + (Math.cos(i * 2.3) * 4) / (M_PER_DEG * 0.62),
    }));
    const { accepted } = processFixes(initialFilterState, fixes, opts);
    expect(accepted.length).toBeLessThan(10);
  });
});

describe("kalmanStep", () => {
  it("pulls a noisy measurement toward the estimate", () => {
    const s0 = kalmanStep(null, { lat: 0, lng: 0, acc: 5, t: 0 });
    const s1 = kalmanStep(s0, { lat: 0.001, lng: 0, acc: 20, t: 1000 });
    expect(s1.lat).toBeGreaterThan(0);
    expect(s1.lat).toBeLessThan(0.001);
    expect(s1.variance).toBeLessThan(20 * 20);
  });
});

describe("processFixes", () => {
  it("sorts out-of-order batches and counts rejections", () => {
    const { accepted, rejected } = processFixes(
      initialFilterState,
      [fix(20, 6000), fix(0, 0), fix(10, 3000), fix(10, 3500, 60)],
      opts,
    );
    expect(accepted.map((p) => p.t)).toEqual([0, 3000, 6000]);
    expect(rejected.accuracy).toBe(1);
  });
});

describe("auto-pause", () => {
  it("pauses only after being still for the configured time", () => {
    let s = initialAutoPause;
    let action: string | null = null;
    for (let t = 0; t <= DEFAULT_AUTO_PAUSE.stopAfterMs; t += 1000) {
      ({ state: s, action } = stepAutoPause(s, { t, moving: false }, false));
      if (t < DEFAULT_AUTO_PAUSE.stopAfterMs) expect(action).toBeNull();
    }
    expect(action).toBe("pause");
  });

  it("resumes after sustained movement, not a single blip", () => {
    let s = stepAutoPause(initialAutoPause, { t: 0, moving: true }, true).state;
    expect(
      stepAutoPause(s, { t: 1000, moving: false }, true).action,
    ).toBeNull();
    s = stepAutoPause(s, { t: 1000, moving: false }, true).state;
    s = stepAutoPause(s, { t: 2000, moving: true }, true).state;
    expect(stepAutoPause(s, { t: 5000, moving: true }, true).action).toBe(
      "resume",
    );
  });
});

import {
  DEFAULT_AUTO_PAUSE,
  gpsMayAct,
  initialAutoPause,
  MOTION_PRIORITY_MS,
  silenceMeansStillMs,
  silentStopAt,
  stepAutoPause,
} from "../tracking/autoPause";
import {
  initialFilterState,
  kalmanStep,
  MAX_ACCURACY_M,
  MAX_GAP_MS,
  processFix,
  processFixes,
  SPEED_RESET_AFTER,
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

describe("processFix: session start, speed lockout, gaps", () => {
  it("drops cached fixes older than the session start", () => {
    const r = processFix(initialFilterState, fix(0, 999), {
      ...opts,
      notBefore: 1000,
    });
    expect(r.reason).toBe("stale");
    expect(
      processFix(initialFilterState, fix(0, 1000), { ...opts, notBefore: 1000 })
        .reason,
    ).toBeNull();
  });

  it(`re-anchors in a new segment after ${SPEED_RESET_AFTER} speed rejections in a row`, () => {
    // A bad anchor 500 m off, then the real track: every fix looks like a jump.
    let state = processFix(initialFilterState, fix(500, 0), opts).state;
    for (let i = 1; i < SPEED_RESET_AFTER; i++) {
      const r = processFix(state, fix(i * 3, i * 1000), opts);
      expect(r.reason).toBe("speed");
      state = r.state;
    }
    const r = processFix(
      state,
      fix(SPEED_RESET_AFTER * 3, SPEED_RESET_AFTER * 1000),
      opts,
    );
    expect(r.reason).toBeNull();
    // New segment: the impossible jump is never counted as distance.
    expect(r.point?.segment).toBe(1);
    // And the next fix continues normally from the new anchor.
    const next = processFix(r.state, fix(SPEED_RESET_AFTER * 3 + 10, 5000), {
      ...opts,
      segment: 1,
    });
    expect(next.reason).toBeNull();
    expect(next.point?.segment).toBe(1);
  });

  it("resets the rejection streak once a fix is accepted", () => {
    const first = processFix(initialFilterState, fix(0, 0), opts);
    const jump = processFix(first.state, fix(500, 1000), opts);
    expect(jump.state.speedRejects).toBe(1);
    const ok = processFix(jump.state, fix(10, 2000), opts);
    expect(ok.reason).toBeNull();
    expect(ok.state.speedRejects).toBe(0);
  });

  it("starts a new segment after a long gap (process killed)", () => {
    const first = processFix(initialFilterState, fix(0, 0), opts);
    const later = processFix(first.state, fix(3000, MAX_GAP_MS + 1000), opts);
    // 3 km in a minute would be a speed outlier inside one segment.
    expect(later.reason).toBeNull();
    expect(later.point?.segment).toBe(1);
    // A normal gap stays in the segment.
    const near = processFix(first.state, fix(20, 5000), opts);
    expect(near.point?.segment).toBe(0);
  });
});

describe("silence-based auto-pause", () => {
  it("scales the silence threshold with the distance interval", () => {
    expect(silenceMeansStillMs(5, 1000)).toBeGreaterThanOrEqual(
      DEFAULT_AUTO_PAUSE.stopAfterMs,
    );
    expect(silenceMeansStillMs(25, 10_000)).toBeGreaterThan(
      silenceMeansStillMs(5, 1000),
    );
  });

  it("pauses one stop window after the last fix once silence is long enough", () => {
    expect(silentStopAt(10_000, 0, 15_000, 10_000)).toBeNull();
    expect(silentStopAt(10_000, 0, 20_000, 10_000)).toBe(
      10_000 + DEFAULT_AUTO_PAUSE.stopAfterMs,
    );
  });

  it("ignores fixes from before the last resume and having no fix yet", () => {
    expect(silentStopAt(null, 0, 60_000, 10_000)).toBeNull();
    expect(silentStopAt(5_000, 6_000, 60_000, 10_000)).toBeNull();
  });

  it("lets a recent motion decision win over GPS", () => {
    const motion = { action: "pause" as const, at: 1000 };
    expect(gpsMayAct("resume", 2000, motion)).toBe(false);
    expect(gpsMayAct("pause", 2000, motion)).toBe(true);
    expect(gpsMayAct("resume", 1000 + MOTION_PRIORITY_MS, motion)).toBe(true);
    expect(gpsMayAct("resume", 2000, null)).toBe(true);
  });
});

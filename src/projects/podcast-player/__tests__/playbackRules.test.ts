import { isAtEnd } from "@/src/projects/podcast-player/playback/progress";
import {
  clampRate,
  resolveStartRate,
} from "@/src/projects/podcast-player/playback/rate";

describe("resolveStartRate", () => {
  it("uses the Default speed setting when nothing else was chosen", () => {
    expect(resolveStartRate({ userRate: null, defaultRate: 1.5 })).toBe(1.5);
  });

  it("prefers a speed the user picked this run over the setting", () => {
    expect(resolveStartRate({ userRate: 2, defaultRate: 1.5 })).toBe(2);
  });

  it("prefers an explicit (restored session) rate over everything", () => {
    expect(
      resolveStartRate({ explicit: 1.2, userRate: 2, defaultRate: 1.5 }),
    ).toBe(1.2);
  });

  it("ignores missing or zero explicit rates", () => {
    expect(
      resolveStartRate({ explicit: 0, userRate: null, defaultRate: 1.75 }),
    ).toBe(1.75);
    expect(
      resolveStartRate({ explicit: null, userRate: null, defaultRate: 0.8 }),
    ).toBe(0.8);
  });
});

describe("clampRate", () => {
  it("clamps to 0.5–3 and falls back to 1 for nonsense", () => {
    expect(clampRate(5)).toBe(3);
    expect(clampRate(0.1)).toBe(0.5);
    expect(clampRate(Number.NaN)).toBe(1);
    expect(clampRate(-1)).toBe(1);
  });
});

describe("isAtEnd", () => {
  it("is true only when parked at the end of a known duration", () => {
    expect(isAtEnd(600, 600)).toBe(true);
    expect(isAtEnd(599.7, 600)).toBe(true);
    expect(isAtEnd(590, 600)).toBe(false);
    expect(isAtEnd(0, 0)).toBe(false);
  });
});

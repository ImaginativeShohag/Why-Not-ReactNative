/**
 * Calendar math across DST. The dates are US spring-forward (9 March 2025);
 * the DST-only assertions run when the local zone has that change, e.g.
 * `TZ=America/New_York npx jest dates`. The invariants hold in every zone.
 */
import { goalProgress } from "../utils/goal";
import {
  addDays,
  DAY_MS,
  lastDays,
  startOfDay,
  startOfWeek,
} from "../utils/dates";
import { regionForCoordinates } from "../utils/region";
import { bucketWeeks } from "../utils/weeks";

const local = (y: number, m: number, d: number, h = 0) =>
  new Date(y, m - 1, d, h).getTime();

describe("calendar days across DST", () => {
  // US spring forward: Sunday 9 March 2025.
  it("addDays lands on local midnight where `- DAY_MS` does not", () => {
    const tue = local(2025, 3, 11);
    expect(addDays(tue, -3)).toBe(local(2025, 3, 8));
    const usDst =
      new Date(2025, 2, 8).getTimezoneOffset() !==
      new Date(2025, 2, 10).getTimezoneOffset();
    if (usDst) expect(new Date(tue - 3 * DAY_MS).getHours()).toBe(23);
  });

  it("lastDays returns seven local midnights matching startOfDay buckets", () => {
    const days = lastDays(local(2025, 3, 12, 15), 7);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe(local(2025, 3, 6));
    expect(days[6]).toBe(local(2025, 3, 12));
    for (const d of days) expect(startOfDay(d)).toBe(d);
  });

  it("buckets workouts into the right week after a DST change", () => {
    const now = local(2025, 3, 26, 12);
    const weekly = bucketWeeks(
      [
        {
          startedAt: local(2025, 3, 10, 7),
          distanceM: 5000,
          elevationGainM: 10,
        },
        { startedAt: local(2025, 3, 3, 7), distanceM: 3000, elevationGainM: 0 },
      ],
      now,
      4,
    );
    expect(weekly.map((w) => w.weekStart)).toEqual([
      local(2025, 3, 3),
      local(2025, 3, 10),
      local(2025, 3, 17),
      local(2025, 3, 24),
    ]);
    expect(weekly[0].distanceM).toBe(3000);
    expect(weekly[1].distanceM).toBe(5000);
    expect(startOfWeek(now)).toBe(local(2025, 3, 24));
  });
});

describe("goalProgress", () => {
  const totals = { distanceM: 2100, elapsedMs: 15 * 60_000, calories: 150 };
  it("is null for an open goal", () => {
    expect(goalProgress("open", 0, totals)).toBeNull();
  });
  it("formats distance, time and calories goals", () => {
    const distance = goalProgress("distance", 5, totals);
    expect(distance?.label).toBe("2.10 / 5 km");
    expect(distance?.fraction).toBeCloseTo(0.42, 6);
    expect(goalProgress("time", 30, totals)?.fraction).toBe(0.5);
    expect(goalProgress("calories", 100, totals)?.fraction).toBe(1);
  });
});

describe("regionForCoordinates", () => {
  it("contains every coordinate with padding", () => {
    const r = regionForCoordinates([
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 51.52, longitude: -0.08 },
    ])!;
    expect(r.latitude).toBeCloseTo(51.51, 6);
    expect(r.latitudeDelta).toBeGreaterThan(0.02);
    expect(r.longitudeDelta).toBeGreaterThan(0.02);
    expect(regionForCoordinates([])).toBeNull();
  });
});

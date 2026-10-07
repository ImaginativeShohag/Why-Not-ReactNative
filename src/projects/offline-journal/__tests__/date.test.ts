import { describe, expect, it } from "@jest/globals";

import {
  addMonths,
  dayBounds,
  dayKey,
  DAY_MS,
  formatClock,
  formatRelative,
  monthBounds,
  monthGrid,
  parseDayKey,
} from "../utils/date";

describe("dayKey / parseDayKey", () => {
  it("formats local dates with zero padding", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("round-trips", () => {
    const date = parseDayKey("2026-08-06");
    expect(date).not.toBeNull();
    expect(dayKey(date!)).toBe("2026-08-06");
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseDayKey(undefined)).toBeNull();
    expect(parseDayKey("")).toBeNull();
    expect(parseDayKey("2026-8-6")).toBeNull();
    expect(parseDayKey("2026-02-31")).toBeNull();
    expect(parseDayKey("not-a-date")).toBeNull();
  });
});

describe("dayBounds", () => {
  it("covers exactly one local day, half-open", () => {
    const bounds = dayBounds("2026-08-06")!;
    expect(bounds.from).toBe(new Date(2026, 7, 6).getTime());
    expect(bounds.to).toBe(new Date(2026, 7, 7).getTime());
    expect(dayKey(new Date(bounds.to - 1))).toBe("2026-08-06");
  });

  it("returns null for a bad key", () => {
    expect(dayBounds("nope")).toBeNull();
  });
});

describe("months", () => {
  it("monthBounds spans the whole month", () => {
    const { from, to } = monthBounds(2026, 1);
    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(to).getMonth()).toBe(2);
  });

  it("addMonths wraps years in both directions", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("monthGrid pads to full weeks and contains every day once", () => {
    // August 2026 starts on a Saturday.
    const weeks = monthGrid(2026, 7);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]).toBe(1);
    const days = weeks.flat().filter((d): d is number => d !== null);
    expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it("monthGrid honours a Monday week start", () => {
    const weeks = monthGrid(2026, 7, 1);
    expect(weeks[0].indexOf(1)).toBe(5);
  });
});

describe("formatters", () => {
  it("formatClock is 24h and padded", () => {
    expect(formatClock(9, 5)).toBe("09:05");
    expect(formatClock(21, 0)).toBe("21:00");
  });

  it("formatRelative buckets by age", () => {
    const now = new Date(2026, 7, 6, 12).getTime();
    expect(formatRelative(now - 10_000, now)).toBe("just now");
    expect(formatRelative(now - 2 * 60_000, now)).toBe("2 min ago");
    expect(formatRelative(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(formatRelative(now - DAY_MS - 3_600_000, now)).toBe("yesterday");
    // Future timestamps (clock skew) never render as negative.
    expect(formatRelative(now + 5_000, now)).toBe("just now");
  });
});

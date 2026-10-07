import {
  formatBytes,
  formatDuration,
  formatDurationShort,
  formatRelativeDate,
  formatRemaining,
  parseDuration,
  parseTimestamp,
} from "../utils/format";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [75, "1:15"],
    [599.9, "9:59"],
    [3600, "1:00:00"],
    [3725, "1:02:05"],
    [36000, "10:00:00"],
  ])("%p → %p", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it("handles garbage", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(undefined)).toBe("0:00");
    expect(formatDuration(-4)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
    expect(formatDuration(Infinity)).toBe("0:00");
  });

  it("formats remaining time", () => {
    expect(formatRemaining(724, 2755)).toBe("-33:51");
    expect(formatRemaining(3000, 2000)).toBe("-0:00");
  });
});

describe("formatDurationShort", () => {
  it("renders list labels", () => {
    expect(formatDurationShort(45)).toBe("45 s");
    expect(formatDurationShort(51 * 60)).toBe("51 min");
    expect(formatDurationShort(72 * 60)).toBe("1 h 12 min");
    expect(formatDurationShort(120 * 60)).toBe("2 h");
    expect(formatDurationShort(null)).toBe("");
    expect(formatDurationShort(0)).toBe("");
  });
});

describe("parseDuration (itunes:duration)", () => {
  it.each([
    ["3725", 3725],
    ["3725.4", 3725],
    ["62:05", 3725],
    ["1:02:05", 3725],
    ["01:02:05", 3725],
    ["00:45:00", 2700],
    [" 12:00 ", 720],
    [1800, 1800],
  ])("%p → %p", (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each([
    [""],
    ["abc"],
    ["1:2:3:4"],
    ["-5"],
    ["0"],
    ["00:00"],
    [null],
    [undefined],
    ["1h 20m"],
  ])("%p → null", (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});

describe("parseTimestamp", () => {
  it("parses show-note timestamps", () => {
    expect(parseTimestamp("09:30")).toBe(570);
    expect(parseTimestamp("1:02:03")).toBe(3723);
    expect(parseTimestamp("9:75")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
  });
});

describe("formatBytes / formatRelativeDate", () => {
  it("formats sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(12_700_000)).toBe("12.1 MB");
    expect(formatBytes(2.1 * 1024 ** 3)).toBe("2.1 GB");
  });

  it("formats relative dates", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    expect(formatRelativeDate(now - 2 * 3600_000, now)).toBe("2h ago");
    expect(formatRelativeDate(now - 26 * 3600_000, now)).toBe("1d ago");
    expect(formatRelativeDate(null, now)).toBe("");
  });
});

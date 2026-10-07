import { parseGpx, toGpx } from "../export/gpx";
import type { Point } from "../models/Workout";
import { totalDistance } from "../tracking/metrics";
import { formatDistance, formatDuration, formatPace } from "../utils/format";
import { paceColoredSegments, PACE_COLORS } from "../utils/paceColor";

const T0 = Date.parse("2026-08-06T06:12:00Z");
const pts: Point[] = [
  { lat: 51.5, lng: -0.1, alt: 20, acc: 5, speed: 3, t: T0, segment: 0 },
  {
    lat: 51.5001,
    lng: -0.1,
    alt: 21.24,
    acc: 5,
    speed: 3,
    t: T0 + 3000,
    segment: 0,
  },
  {
    lat: 51.51,
    lng: -0.1,
    alt: null,
    acc: 5,
    speed: 3,
    t: T0 + 600_000,
    segment: 1,
  },
  {
    lat: 51.5101,
    lng: -0.1,
    alt: 22,
    acc: 5,
    speed: 3,
    t: T0 + 603_000,
    segment: 1,
  },
];

describe("formatPace", () => {
  it.each([
    [342, `5'42"`],
    [300, `5'00"`],
    [359.6, `6'00"`],
    [59, `0'59"`],
  ])("%s s/km → %s", (sec, expected) => {
    expect(formatPace(sec)).toBe(expected);
  });

  it("shows a dash for unknown or absurd pace", () => {
    expect(formatPace(null)).toBe("—");
    expect(formatPace(Infinity)).toBe("—");
    expect(formatPace(0)).toBe("—");
    expect(formatPace(7200)).toBe("—");
  });
});

describe("formatDuration / formatDistance", () => {
  it("formats durations", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(1_457_000)).toBe("24:17");
    expect(formatDuration(1_457_000, true)).toBe("00:24:17");
    expect(formatDuration(2 * 3_600_000 + 5_000)).toBe("02:00:05");
  });

  it("formats distances", () => {
    expect(formatDistance(420)).toBe("420 m");
    expect(formatDistance(3420)).toBe("3.42 km");
  });
});

describe("GPX export", () => {
  const xml = toGpx(
    { title: "Morning <Run> & co", type: "run", startedAt: T0 },
    pts,
  );

  it("is well-formed-looking GPX 1.1 with escaped metadata", () => {
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
    expect(xml).toContain(`<gpx version="1.1"`);
    expect(xml).toContain("Morning &lt;Run&gt; &amp; co");
    expect(xml).toContain("<type>running</type>");
  });

  it("writes one trkseg per pause-separated segment", () => {
    expect(xml.match(/<trkseg>/g)).toHaveLength(2);
    expect(xml.match(/<trkpt /g)).toHaveLength(4);
  });

  it("writes ISO timestamps and omits missing elevation", () => {
    expect(xml).toContain("<time>2026-08-06T06:12:00.000Z</time>");
    expect(xml).toContain("<ele>21.2</ele>");
    expect(xml.match(/<ele>/g)).toHaveLength(3);
  });

  it("round-trips through the parser", () => {
    const back = parseGpx(xml);
    expect(back).toHaveLength(4);
    expect(back.map((p) => p.segment)).toEqual([0, 0, 1, 1]);
    expect(back[1].t).toBe(T0 + 3000);
    expect(totalDistance(back)).toBeCloseTo(totalDistance(pts), 3);
  });
});

describe("paceColoredSegments", () => {
  it("breaks the line at segment boundaries and uses palette colours", () => {
    const segs = paceColoredSegments(pts);
    expect(segs).toHaveLength(2);
    for (const s of segs) expect(PACE_COLORS).toContain(s.color);
  });
});

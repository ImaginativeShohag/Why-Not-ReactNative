/**
 * PURE GPX 1.1 serialisation. Each workout segment (split by pauses) becomes
 * its own <trkseg>, which is exactly what GPX segments are for — importers
 * like Strava won't draw a line across a pause.
 */
import type { ActivityType, Point } from "../models/Workout";

const GPX_TYPE: Record<ActivityType, string> = {
  run: "running",
  walk: "walking",
  cycle: "cycling",
  hike: "hiking",
};

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function toGpx(
  meta: { title: string; type: ActivityType; startedAt: number },
  points: readonly Point[],
): string {
  const segments: Point[][] = [];
  for (const p of points) {
    const last = segments[segments.length - 1];
    if (!last || last[last.length - 1].segment !== p.segment)
      segments.push([p]);
    else last.push(p);
  }

  const trkpt = (p: Point) =>
    `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">` +
    (p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : "") +
    `<time>${new Date(p.t).toISOString()}</time></trkpt>`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<gpx version="1.1" creator="Why-Not-ReactNative" xmlns="http://www.topografix.com/GPX/1/1">`,
    `  <metadata><name>${escapeXml(meta.title)}</name><time>${new Date(meta.startedAt).toISOString()}</time></metadata>`,
    `  <trk>`,
    `    <name>${escapeXml(meta.title)}</name>`,
    `    <type>${GPX_TYPE[meta.type]}</type>`,
    ...segments.map((seg) =>
      [`    <trkseg>`, ...seg.map(trkpt), `    </trkseg>`].join("\n"),
    ),
    `  </trk>`,
    `</gpx>`,
    "",
  ].join("\n");
}

/**
 * Minimal GPX reader — enough to load a recorded track as test fixtures or
 * to replay a route. Not a general-purpose XML parser.
 */
export function parseGpx(xml: string): Point[] {
  const points: Point[] = [];
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/g;
  const ptRe =
    /<trkpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"\s*>([\s\S]*?)<\/trkpt>/g;
  let segIndex = 0;
  let seg: RegExpExecArray | null;
  while ((seg = segRe.exec(xml))) {
    let pt: RegExpExecArray | null;
    while ((pt = ptRe.exec(seg[1]))) {
      const body = pt[3];
      const ele = /<ele>([-\d.]+)<\/ele>/.exec(body);
      const time = /<time>([^<]+)<\/time>/.exec(body);
      points.push({
        lat: Number(pt[1]),
        lng: Number(pt[2]),
        alt: ele ? Number(ele[1]) : null,
        acc: null,
        speed: null,
        t: time ? Date.parse(time[1]) : 0,
        segment: segIndex,
      });
    }
    segIndex++;
  }
  return points;
}

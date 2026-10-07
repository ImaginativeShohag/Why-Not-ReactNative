/**
 * EXIF helpers. Camera and media-library EXIF comes in different shapes per
 * platform (iOS nests `{Exif}` / `{TIFF}` dictionaries, Android is flat), so
 * flatten first and read a small, known set of tags.
 */

export type ExifSummary = {
  camera: string | null;
  lens: string | null;
  exposure: string | null;
  takenAt: number | null;
  orientation: number;
};

type Dict = Record<string, unknown>;

export function flattenExif(exif: Dict | null | undefined): Dict {
  const out: Dict = {};
  if (!exif) return out;
  for (const [key, value] of Object.entries(exif)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenExif(value as Dict));
    } else if (!(key in out)) {
      out[key] = value;
    }
  }
  return out;
}

const num = (v: unknown): number | null => {
  const n = Array.isArray(v) ? Number(v[0]) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** 0.008333 → "1/120", 2 → "2s". */
export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${Math.round(seconds * 10) / 10}s`;
  return `1/${Math.round(1 / seconds)}`;
}

/** "2026:08:06 18:42:11" (EXIF's own format) → epoch ms (local time). */
export function parseExifDate(value: unknown): number | null {
  const s = str(value);
  if (!s) return null;
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi, se).getTime();
}

export function summarizeExif(exif: Dict | null | undefined): ExifSummary {
  const f = flattenExif(exif);
  const make = str(f.Make);
  const model = str(f.Model);
  const camera =
    make && model && !model.startsWith(make)
      ? `${make} ${model}`
      : (model ?? make);

  const fNumber = num(f.FNumber);
  const shutter = num(f.ExposureTime);
  const iso = num(f.ISOSpeedRatings ?? f.PhotographicSensitivity);
  const parts = [
    fNumber ? `f/${Math.round(fNumber * 10) / 10}` : null,
    shutter ? formatShutter(shutter) : null,
    iso ? `ISO ${iso}` : null,
  ].filter(Boolean);

  return {
    camera,
    lens: str(f.LensModel),
    exposure: parts.length ? parts.join(" · ") : null,
    takenAt: parseExifDate(f.DateTimeOriginal ?? f.DateTime),
    orientation: num(f.Orientation) ?? 1,
  };
}

/**
 * After orientation has been baked into the pixels, the stored EXIF must say
 * "upright" too — otherwise viewers rotate the already-rotated image again.
 */
export function withUprightOrientation(
  exif: Dict | null | undefined,
): Dict | null {
  if (!exif) return null;
  const out: Dict = {};
  for (const [key, value] of Object.entries(exif)) {
    if (key === "Orientation") out[key] = 1;
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = withUprightOrientation(value as Dict);
    } else out[key] = value;
  }
  return out;
}

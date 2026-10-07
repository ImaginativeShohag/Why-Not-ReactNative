/**
 * Pure formatting/parsing helpers. No React Native imports so Jest can load
 * them without the native preset doing any work.
 */

/** 75 → "1:15", 3725 → "1:02:05". Negative/NaN render as "0:00". */
export function formatDuration(
  totalSeconds: number | null | undefined,
): string {
  if (
    totalSeconds == null ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 0
  ) {
    return "0:00";
  }
  const s = Math.floor(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/** Remaining time label as shown under the scrubber: "-33:51". */
export function formatRemaining(position: number, duration: number): string {
  return `-${formatDuration(Math.max(0, duration - position))}`;
}

/** Compact human label for lists: "51 min", "1 h 12 min", "45 s". */
export function formatDurationShort(
  totalSeconds: number | null | undefined,
): string {
  if (
    totalSeconds == null ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds <= 0
  ) {
    return "";
  }
  if (totalSeconds < 60) return `${Math.round(totalSeconds)} s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Parses `itunes:duration`, which in the wild is any of: "3725", "62:05",
 * "1:02:05", "01:02:05.500", "3725.4", "" or garbage. Returns seconds or null.
 */
export function parseDuration(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }
  const text = String(raw).trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const n = Math.round(parseFloat(text));
    return n > 0 ? n : null;
  }

  const parts = text.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d+(\.\d+)?$/.test(p.trim()))) return null;

  const nums = parts.map((p) => parseFloat(p));
  const [h, m, s] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
  const total = Math.round(h * 3600 + m * 60 + s);
  return total > 0 ? total : null;
}

/** 12_700_000 → "12.1 MB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** "2h ago", "1d ago", "3 Mar 2024". `now` is injectable for tests. */
export function formatRelativeDate(
  epochMs: number | null,
  now = Date.now(),
): string {
  if (!epochMs) return "";
  const diff = Math.max(0, now - epochMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(epochMs).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Parses "00:09:30" / "9:30" style timestamps used in show notes. */
export function parseTimestamp(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d{1,2}$/.test(p))) return null;
  const nums = parts.map(Number);
  const [h, m, s] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
}

/** Small stable string hash (FNV-1a), used for ids and colour seeds. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

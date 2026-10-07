/**
 * Date helpers. Everything here works in the device's LOCAL time zone on
 * purpose: "which day was this written" is a question about the writer's wall
 * clock, not UTC. SQLite stores epoch ms; conversion happens in JS so the day
 * boundaries always agree with what the UI shows.
 */

export const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD` in local time. Stable string key for grouping and route params. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Inverse of `dayKey`. Returns local midnight, or null for anything malformed. */
export function parseDayKey(key: string | undefined | null): Date | null {
  if (!key) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects 2026-02-31 and friends, which Date would silently roll over.
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** Half-open `[from, to)` epoch-ms range covering one local day (DST-safe). */
export function dayBounds(key: string): { from: number; to: number } | null {
  const start = parseDayKey(key);
  if (!start) return null;
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
  );
  return { from: start.getTime(), to: end.getTime() };
}

/** Half-open range covering a whole month. `month` is 0-based like Date. */
export function monthBounds(year: number, month: number) {
  return {
    from: new Date(year, month, 1).getTime(),
    to: new Date(year, month + 1, 1).getTime(),
  };
}

export function addMonths(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Month grid as weeks of day-of-month numbers, padded with nulls so every week
 * has 7 cells. `weekStartsOn` 0 = Sunday, 1 = Monday.
 */
export function monthGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 0,
): (number | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7;

  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 24h `HH:MM` for reminder times — independent of locale so it never jitters. */
export function formatClock(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

/** "Thu, 6 Aug 2026 · 07:12" — the compose/detail header. */
export function formatLongDate(date: Date) {
  const day = date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${day} · ${formatTime(date)}`;
}

/** "6 Aug" — list rows and detail titles. */
export function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** "just now", "2 min ago", "3 h ago", "yesterday", else a short date. */
export function formatRelative(then: number, now: number = Date.now()) {
  const diff = Math.max(0, now - then);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)} h ago`;
  if (dayKey(new Date(then)) === dayKey(new Date(now - DAY_MS)))
    return "yesterday";
  return formatShortDate(new Date(then));
}

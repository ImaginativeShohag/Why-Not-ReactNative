/** Sortable-ish unique id: time prefix keeps SQLite's primary-key b-tree append-only. */
export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday-based week start. */
export function startOfWeek(ms: number) {
  const d = new Date(startOfDay(ms));
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/**
 * Calendar-day arithmetic: local midnight `days` days away. Never
 * `ms + days * DAY_MS` — across a DST change that lands on 23:00 or 01:00
 * and no longer matches the day buckets.
 */
export function addDays(ms: number, days: number) {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** The last `n` local midnights, oldest first, ending with the day of `ms`. */
export function lastDays(ms: number, n: number) {
  const today = startOfDay(ms);
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

export const DAY_MS = 86_400_000;

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

export const DAY_MS = 86_400_000;

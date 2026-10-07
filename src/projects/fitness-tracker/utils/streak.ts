const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Consecutive active days ending today — or yesterday, so the streak doesn't
 * read 0 at 7 am before today's run. `days` are local YYYY-MM-DD, newest first.
 */
export function computeStreak(days: readonly string[], today: Date): number {
  const set = new Set(days);
  const cursor = new Date(today);
  if (!set.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(iso(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

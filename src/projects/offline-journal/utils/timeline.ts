import type { Entry } from "../models/Entry";
import { dayKey, yesterdayKey } from "./date";

export type TimelineRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "entry"; key: string; entry: Entry };

const DAY = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/**
 * One flat array of headers and entries — FlashList wants a single list, not
 * SectionList's nested shape. Assumes `entries` is already newest-first.
 *
 * `now` is injectable so "TODAY"/"YESTERDAY" labels are testable.
 */
export function toRows(
  entries: Entry[],
  now: number = Date.now(),
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let currentDay = "";

  for (const entry of entries) {
    const day = dayKey(entry.createdAt);
    if (day !== currentDay) {
      currentDay = day;
      rows.push({
        kind: "header",
        key: `day:${day}`,
        label: labelFor(entry.createdAt, now),
      });
    }
    rows.push({ kind: "entry", key: entry.id, entry });
  }

  return rows;
}

/** Indices of the header rows — exactly what `stickyHeaderIndices` wants. */
export function headerIndices(rows: TimelineRow[]) {
  return rows.flatMap((row, index) => (row.kind === "header" ? [index] : []));
}

function labelFor(date: Date, now: number) {
  const day = dayKey(date);
  const today = dayKey(new Date(now));
  const yesterday = yesterdayKey(now);

  if (day === today) return `TODAY · ${DAY.format(date)}`;
  if (day === yesterday) return `YESTERDAY · ${DAY.format(date)}`;
  return DAY.format(date).toUpperCase();
}

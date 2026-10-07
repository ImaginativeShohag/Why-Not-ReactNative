import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { useCallback } from "react";

import {
  entryTimestamps,
  getEntry,
  listEntries,
  saveEntry,
  softDeleteEntry,
  type EntryInput,
} from "../db/queries/entries";
import { listTags } from "../db/queries/tags";
import type { Entry, TagCount } from "../models/Entry";
import { kickSoon } from "../sync/syncEngine";
import { dayBounds, dayKey } from "../utils/date";
import { useLiveQuery } from "./useLiveQuery";

// Stable identities, declared once at module scope.
const TABLES = ["entries", "entry_tags", "tags", "attachments"] as const;
const NO_ENTRIES: Entry[] = [];
const NO_TAGS: TagCount[] = [];

/**
 * Timeline data. `day` (a `YYYY-MM-DD` key) narrows it to one local day;
 * `limit` grows as the list scrolls, so 5,000 entries never load at once.
 */
export function useEntries({
  day,
  limit = 100,
}: { day?: string | null; limit?: number } = {}) {
  const select = useCallback(
    (db: SQLiteDatabase) => {
      const bounds = day ? dayBounds(day) : null;
      return listEntries(db, {
        limit,
        from: bounds?.from,
        to: bounds?.to,
      });
    },
    [day, limit],
  );
  return useLiveQuery(TABLES, select, NO_ENTRIES);
}

export function useEntry(id: string) {
  const select = useCallback((db: SQLiteDatabase) => getEntry(db, id), [id]);
  return useLiveQuery(TABLES, select, null as Entry | null);
}

export function useTags() {
  return useLiveQuery(TABLES, listTags, NO_TAGS);
}

const EMPTY_COUNTS: Record<string, number> = {};

/** Entry counts per local day in `[from, to)` — the calendar's dots. */
export function useEntryDays(from: number, to: number) {
  const select = useCallback(
    async (db: SQLiteDatabase) => {
      const counts: Record<string, number> = {};
      for (const at of await entryTimestamps(db, from, to)) {
        const key = dayKey(new Date(at));
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return counts;
    },
    [from, to],
  );
  return useLiveQuery(["entries"], select, EMPTY_COUNTS);
}

export function useSaveEntry() {
  const db = useSQLiteContext();
  return useCallback(
    async (input: EntryInput) => {
      const id = await saveEntry(db, input);
      // The local write is done and the UI already has it; shipping it is a
      // side quest, debounced so autosave doesn't sync on every typing pause.
      kickSoon();
      return id;
    },
    [db],
  );
}

export function useDeleteEntry() {
  const db = useSQLiteContext();
  return useCallback(
    async (id: string) => {
      await softDeleteEntry(db, id);
      kickSoon();
    },
    [db],
  );
}

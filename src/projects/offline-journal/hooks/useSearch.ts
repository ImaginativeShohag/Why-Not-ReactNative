import type { SQLiteDatabase } from "expo-sqlite";
import { useCallback } from "react";

import { searchEntries } from "../db/queries/search";
import type { Mood, SearchHit } from "../models/Entry";
import { useDebouncedValue } from "./useDebouncedValue";
import { useLiveQuery } from "./useLiveQuery";

const NO_HITS: SearchHit[] = [];
const TABLES = ["entries", "entry_tags"] as const;

/**
 * Debounced, live search. The select is memoised on the DEBOUNCED text, so the
 * query re-runs at most every 250 ms — not on every keystroke — and still
 * refreshes when an entry changes underneath the results.
 */
export function useSearch(text: string, mood: Mood | null, tag: string | null) {
  const query = useDebouncedValue(text, 250);
  const select = useCallback(
    (db: SQLiteDatabase) => searchEntries(db, { text: query, mood, tag }),
    [query, mood, tag],
  );
  const result = useLiveQuery(TABLES, select, NO_HITS);
  return { ...result, query, settled: query === text };
}

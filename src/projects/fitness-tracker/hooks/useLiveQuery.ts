import { useIsFocused } from "expo-router";
import { addDatabaseChangeListener, type SQLiteDatabase } from "expo-sqlite";
import { useEffect, useState } from "react";

import { getDb } from "../db/client";

/**
 * Runs `select` against the shared connection and re-runs it whenever one of
 * `tables` changes — including writes made by the background task, because
 * both use the same connection. The UI reads the database, never task memory.
 *
 * Only listens while the screen is focused, and reloads on refocus. During a
 * workout every fix batch writes `workouts`; without this the History, Today
 * and Stats tabs stacked under the active screen would re-run their heavy
 * queries about once a second.
 *
 * `select` must be referentially stable: module-level, or an inline closure in
 * a hook (the React Compiler memoizes it on the values it captures).
 */
export function useLiveQuery<T>(
  tables: readonly string[],
  select: (db: SQLiteDatabase) => Promise<T>,
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watched = tables.join(",");
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      getDb()
        .then(select)
        .then((next) => {
          if (cancelled) return;
          setData(next);
          setLoading(false);
        })
        .catch((cause) => !cancelled && setError(cause as Error));
    };
    load();

    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (!watched.split(",").includes(tableName)) return;
      // A batch insert fires one event per row — coalesce the burst.
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 100);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [select, watched, focused]);

  return { data, loading, error };
}

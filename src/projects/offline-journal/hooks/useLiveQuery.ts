import {
  addDatabaseChangeListener,
  useSQLiteContext,
  type SQLiteDatabase,
} from "expo-sqlite";
import { useEffect, useState } from "react";

/**
 * Build this before reaching for a library version. Runs `select` once, then
 * re-runs it whenever one of `tables` changes.
 *
 * `select` must be a stable reference (module-level function or useCallback) —
 * a fresh arrow function per render re-subscribes on every render.
 */
export function useLiveQuery<T>(
  tables: readonly string[],
  select: (db: SQLiteDatabase) => Promise<T>,
  initial: T,
) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<Error | null>(null);
  // Distinguishes "still loading" from "loaded, and the answer is empty/null" —
  // the detail screen needs that to tell a spinner from a not-found state.
  const [loaded, setLoaded] = useState(false);
  const watched = tables.join(",");
  // The change listener is process-global: every database opened with
  // `enableChangeListener` (fitness, on every GPS point it stores) emits through
  // it. Table names alone only work until another project adds a `tags` table,
  // so match the file too. By basename, not full path: SQLite reports the path
  // it resolved (on iOS `/private/var/…` for `/var/…`), not the one we passed.
  const file = basename(db.databasePath);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      select(db)
        .then((next) => {
          if (cancelled) return;
          setData(next);
          setError(null);
          setLoaded(true);
        })
        .catch((cause) => {
          if (cancelled) return;
          setError(cause as Error);
          setLoaded(true);
        });
    };

    load();

    const subscription = addDatabaseChangeListener((event) => {
      if (basename(event.databaseFilePath) !== file) return;
      if (!watched.split(",").includes(event.tableName)) return;
      // A transaction fires one event per changed row — coalesce the burst.
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 50);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [db, select, watched, file]);

  return { data, error, loaded };
}

const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1);

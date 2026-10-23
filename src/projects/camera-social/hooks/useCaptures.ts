import {
  addDatabaseChangeListener,
  useSQLiteContext,
  type SQLiteDatabase,
} from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import {
  captureStats,
  getCapture,
  listCaptureGrid,
  listCapturePages,
  type CaptureGridItem,
  type CapturePage,
  type CaptureStats,
} from "@/src/projects/camera-social/db/captures";
import { DATABASE_NAME } from "@/src/projects/camera-social/db/schema";
import type { Capture } from "@/src/projects/camera-social/models/Asset";

/**
 * Re-runs `select` whenever the captures table changes. The change listener
 * is process-wide (every project's DB fires it), so filter on our file name.
 */
function useCapturesQuery<T>(
  select: (db: SQLiteDatabase) => Promise<T>,
  initial: T,
) {
  const db = useSQLiteContext();
  const [fallback] = useState(initial);
  // `source` records which query produced the data, so a new `select` (a new
  // id) reads as loading at once instead of returning the previous row.
  const [state, setState] = useState<{
    data: T;
    loading: boolean;
    source: typeof select | null;
  }>({ data: initial, loading: true, source: null });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = () => {
      select(db)
        .then(
          (data) =>
            !cancelled && setState({ data, loading: false, source: select }),
        )
        .catch(
          () =>
            !cancelled &&
            setState((s) =>
              s.source === select
                ? { ...s, loading: false }
                : { data: fallback, loading: false, source: select },
            ),
        );
    };
    load();
    const sub = addDatabaseChangeListener(({ tableName, databaseFilePath }) => {
      if (tableName !== "captures") return;
      if (!databaseFilePath.endsWith(DATABASE_NAME)) return;
      // One event per row — coalesce bursts (rapid-fire shutter).
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 40);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [db, fallback, select]);

  return state.source === select
    ? { data: state.data, loading: state.loading }
    : { data: fallback, loading: true };
}

/** Feed grid rows — thumbnail-level columns only. */
export function useCaptureGrid() {
  const { data, loading } = useCapturesQuery<CaptureGridItem[]>(
    listCaptureGrid,
    [],
  );
  return { captures: data, loading };
}

/** Post pager rows — everything the viewer shows, minus edit lineage. */
export function useCapturePages() {
  const { data, loading } = useCapturesQuery<CapturePage[]>(
    listCapturePages,
    [],
  );
  return { captures: data, loading };
}

export function useCaptureItem(id: string | undefined) {
  const select = useCallback(
    (db: SQLiteDatabase) => (id ? getCapture(db, id) : Promise.resolve(null)),
    [id],
  );
  const { data, loading } = useCapturesQuery<Capture | null>(select, null);
  return { capture: data, loading };
}

const EMPTY_STATS: CaptureStats = {
  photos: 0,
  videos: 0,
  edits: 0,
  favorites: 0,
  bytes: 0,
};

export function useCaptureStats() {
  return useCapturesQuery<CaptureStats>(captureStats, EMPTY_STATS).data;
}

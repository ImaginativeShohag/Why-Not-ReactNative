import { addDatabaseChangeListener } from "expo-sqlite";
import { useEffect, useState } from "react";

import { getDb } from "../db/client";
import { getPoints } from "../db/queries/points";
import type { Point } from "../models/Workout";

/**
 * Incremental point feed for the active screen: only fetches rows newer than
 * the last one it has, so a 3-hour workout doesn't re-read 10k rows per fix.
 */
export function useLivePoints(workoutId: string | undefined) {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    if (!workoutId) return;
    let cancelled = false;
    let lastT = 0;
    let acc: Point[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      const db = await getDb();
      const fresh = await getPoints(db, workoutId, lastT);
      if (cancelled || !fresh.length) return;
      lastT = fresh[fresh.length - 1].t;
      acc = acc.concat(fresh);
      setPoints(acc);
    };
    load().catch(() => {});

    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (tableName !== "points") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load().catch(() => {}), 150);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [workoutId]);

  return points;
}

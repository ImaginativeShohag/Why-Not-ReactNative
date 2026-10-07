import { useEffect, useState } from "react";

import { health } from "../health/sync";
import type { HeartRateSample, Workout } from "../models/Workout";

export function useHeartRate(workout: Workout | null) {
  const [samples, setSamples] = useState<HeartRateSample[]>([]);
  const start = workout?.startedAt;
  const end = workout?.endedAt;
  useEffect(() => {
    if (start == null || end == null) return;
    let cancelled = false;
    health.readHeartRate(start, end).then((s) => !cancelled && setSamples(s));
    return () => {
      cancelled = true;
    };
  }, [start, end]);
  return samples;
}

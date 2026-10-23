import { useEffect, useState } from "react";

import {
  getTodaySteps,
  isPedometerAvailable,
  watchSteps,
} from "../sensors/pedometer";

/** Today's steps: CoreMotion history + live delta (iOS), live-only (Android). */
export function useTodaySteps() {
  const [base, setBase] = useState<number | null>(null);
  const [live, setLive] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let sub: { remove(): void } | null = null;
    let cancelled = false;
    (async () => {
      const ok = await isPedometerAvailable();
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) return;
      const today = await getTodaySteps();
      // Unmounted while the history query ran: subscribing now would leak.
      if (cancelled) return;
      setBase(today);
      sub = watchSteps(setLive);
    })().catch(() => setAvailable(false));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return { steps: (base ?? 0) + live, available, hasHistory: base != null };
}

import { useEffect, useState } from "react";

import {
  isBarometerAvailable,
  watchRelativeAltitude,
} from "../sensors/barometer";

/** Relative altitude since mount; null when the device has no barometer. */
export function useBarometerElevation(enabled: boolean) {
  const [relative, setRelative] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let sub: { remove(): void } | null = null;
    let cancelled = false;
    isBarometerAvailable().then((ok) => {
      if (ok && !cancelled) sub = watchRelativeAltitude(setRelative);
    });
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);
  return relative;
}

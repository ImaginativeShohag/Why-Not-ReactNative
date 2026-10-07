import * as Location from "expo-location";
import { useEffect, useState } from "react";

export type GpsQuality = "none" | "poor" | "fair" | "good";

export function gpsQuality(accuracy: number | null): GpsQuality {
  if (accuracy == null) return "none";
  if (accuracy <= 10) return "good";
  if (accuracy <= 25) return "fair";
  return "poor";
}

/**
 * Pre-start fix indicator (and the "GPS degraded" banner during a workout).
 * Its own lightweight watch — it never writes points.
 */
export function useGpsFix(enabled: boolean) {
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (loc) => setAccuracy(loc.coords.accuracy),
      );
      if (cancelled) sub.remove();
    })().catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { accuracy, quality: gpsQuality(accuracy) };
}

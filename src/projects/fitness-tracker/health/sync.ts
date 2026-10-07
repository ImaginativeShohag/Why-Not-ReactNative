/**
 * Fallback (web / unsupported). Metro picks sync.ios.ts / sync.android.ts on
 * device, so HealthKit code never loads on Android and vice versa.
 */
import type { HealthSync } from "./types";

export const health: HealthSync = {
  storeName: "Health",
  isAvailable: async () => false,
  saveWorkout: async () => ({
    ok: false,
    message: "Health sync isn't available on this platform.",
  }),
  readHeartRate: async () => [],
};

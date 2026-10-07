import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * User preferences. Persisted with AsyncStorage (not SQLite) because they are
 * tiny, read synchronously after hydration, and needed by the singletons
 * (see `ensureSettingsHydrated` for callers that may run before hydration).
 */

// Typed `readonly number[]` (not `as const`) so they line up with the plain
// `number` settings fields they select between.
export const SKIP_OPTIONS: readonly number[] = [10, 15, 30, 45, 60];
export const RATE_OPTIONS: readonly number[] = [0.8, 1, 1.2, 1.5, 1.75, 2];
export const AUTO_DELETE_OPTIONS: readonly number[] = [0, 1, 3, 7, 14, 30]; // days; 0 = never
export const STORAGE_CAP_OPTIONS_GB: readonly number[] = [1, 2, 4, 8, 16];
export const CONCURRENT_DOWNLOAD_OPTIONS: readonly number[] = [1, 2, 3];

export type PodcastSettings = {
  skipBackSec: number;
  skipForwardSec: number;
  defaultRate: number;
  wifiOnly: boolean;
  autoDeleteDays: number;
  deleteWhenPlayed: boolean;
  storageCapBytes: number;
  maxConcurrentDownloads: number;
  autoDownloadNewForNewSubscriptions: boolean;
};

type SettingsState = PodcastSettings & {
  update: (patch: Partial<PodcastSettings>) => void;
};

export const DEFAULT_SETTINGS: PodcastSettings = {
  skipBackSec: 15,
  skipForwardSec: 30,
  defaultRate: 1,
  wifiOnly: true,
  autoDeleteDays: 7,
  deleteWhenPlayed: false,
  storageCapBytes: 2 * 1024 ** 3,
  maxConcurrentDownloads: 2,
  autoDownloadNewForNewSubscriptions: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
    }),
    {
      name: "podcast-player/settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ update: _update, ...rest }) => rest,
    },
  ),
);

/**
 * Non-React read for the singletons. Synchronous, so it returns
 * DEFAULT_SETTINGS until AsyncStorage hydration finishes. Code that can run
 * before any screen (the headless background task) awaits
 * `ensureSettingsHydrated()` first.
 */
export function getSettings(): PodcastSettings {
  return useSettingsStore.getState();
}

/**
 * Resolves once the persisted settings are loaded. `rehydrate()` rather than
 * waiting for `onFinishHydration`: its promise also settles when the storage
 * read fails, where the listener would never fire and the task would hang.
 */
export async function ensureSettingsHydrated(): Promise<PodcastSettings> {
  if (!useSettingsStore.persist.hasHydrated())
    await useSettingsStore.persist.rehydrate();
  return getSettings();
}

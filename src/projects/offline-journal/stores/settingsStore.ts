import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { env } from "@/src/shared/constants/env";

export type ThemePreference = "system" | "light" | "dark";
export type FontSize = "small" | "medium" | "large";

export type SyncSettings = {
  enabled: boolean;
  /** Your mock server. On the Android emulator, the host machine is 10.0.2.2. */
  baseUrl: string;
  /** Test knobs: exercise the retry paths on demand instead of waiting for bad Wi-Fi. */
  latencyMs: number;
  failureRate: number;
};

export type Settings = {
  theme: ThemePreference;
  fontSize: FontSize;
  biometricLock: boolean;
  lockAfterMs: number;
  reminder: { enabled: boolean; hour: number; minute: number };
  sync: SyncSettings;
  onboarded: boolean;
};

type SettingsState = Settings & {
  patch: (partial: Partial<Settings>) => void;
  patchSync: (partial: Partial<SyncSettings>) => void;
};

export const DEFAULT_SYNC: SyncSettings = {
  enabled: false,
  // From app.config.ts `extra.journalSyncUrl`; the user can override it in Settings.
  baseUrl: env.journalSyncUrl,
  latencyMs: 0,
  failureRate: 0,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      fontSize: "medium",
      biometricLock: false,
      lockAfterMs: 0,
      reminder: { enabled: false, hour: 21, minute: 0 },
      sync: DEFAULT_SYNC,
      onboarded: false,
      patch: (partial) => set(partial),
      patchSync: (partial) =>
        set((state) => ({ sync: { ...state.sync, ...partial } })),
    }),
    {
      name: "journal-settings",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Functions are not state; never write them to disk.
      partialize: ({ patch, patchSync, ...settings }) => settings,
      // Shallow merge would drop new nested keys added in a later release.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Settings>;
        return {
          ...current,
          ...saved,
          reminder: { ...current.reminder, ...saved.reminder },
          sync: { ...current.sync, ...saved.sync },
        };
      },
    },
  ),
);

// AsyncStorage is async, so the first render sees the defaults. Gate anything
// that depends on persisted values (the onboarding redirect, the app lock) on
// hydration, or every cold start flashes the wrong thing. useSyncExternalStore
// rather than useState + effect: no missed event between render and subscribe.
const subscribeHydration = (onChange: () => void) =>
  useSettingsStore.persist.onFinishHydration(onChange);
const getHydrated = () => useSettingsStore.persist.hasHydrated();

export function useSettingsHydrated() {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}

/**
 * For non-React callers (the headless background task): make sure persisted
 * settings are loaded before reading them with `getState()`.
 */
export async function ensureSettingsHydrated() {
  if (!useSettingsStore.persist.hasHydrated())
    await useSettingsStore.persist.rehydrate();
  return useSettingsStore.getState();
}

import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { useCallback, useEffect } from "react";

import {
  getSetting,
  setSetting,
} from "@/src/projects/camera-social/db/captures";
import {
  hydrateSettings,
  patchSettings,
  useSettingsStore,
  type CameraSettings,
} from "@/src/projects/camera-social/stores/settingsStore";
import { alertError } from "@/src/projects/camera-social/utils/alertError";

export {
  DEFAULT_SETTINGS,
  type CameraSettings,
} from "@/src/projects/camera-social/stores/settingsStore";

const KEY = "camera-settings";

function persist(db: SQLiteDatabase, settings: CameraSettings) {
  setSetting(db, KEY, JSON.stringify(settings)).catch((e: unknown) =>
    alertError("Couldn't save settings", e),
  );
}

/** The database the shared store was last hydrated from (once per connection). */
let hydratedFrom: SQLiteDatabase | null = null;

function hydrate(db: SQLiteDatabase) {
  if (hydratedFrom === db) return;
  hydratedFrom = db;
  getSetting(db, KEY)
    .catch(() => null)
    .then((raw) => {
      if (hydratedFrom !== db) return;
      const hadPending =
        Object.keys(useSettingsStore.getState().pending).length > 0;
      useSettingsStore.setState((s) => hydrateSettings(s, raw));
      // Changes made while loading were held back; write the merged result.
      if (hadPending) persist(db, useSettingsStore.getState().settings);
    });
}

/**
 * Settings persisted as one JSON blob in the project's own `settings` table.
 * Every caller reads the same store, so the camera and the Profile tab never
 * hold diverging copies.
 */
export function useSettings() {
  const db = useSQLiteContext();
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    hydrate(db);
  }, [db]);

  const update = useCallback(
    (patch: Partial<CameraSettings>) => {
      useSettingsStore.setState((s) => patchSettings(s, patch));
      // Side effect outside the updater, from the merged latest state.
      const { hydrated, settings: next } = useSettingsStore.getState();
      if (hydrated) persist(db, next);
    },
    [db],
  );

  return { settings, update };
}

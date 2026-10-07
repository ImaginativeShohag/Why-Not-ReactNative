import { create } from "zustand";

export type CameraSettings = {
  /** Also write every capture to the device gallery album. */
  saveToGallery: boolean;
  shutterSound: boolean;
  haptics: boolean;
  /** Keep EXIF (incl. location) on captures. */
  keepExif: boolean;
  maxVideoSeconds: number;
};

export const DEFAULT_SETTINGS: CameraSettings = {
  saveToGallery: false,
  shutterSound: true,
  haptics: true,
  keepExif: true,
  maxVideoSeconds: 60,
};

/**
 * One shared copy of the settings for every screen. The Profile tab stays
 * mounted under the camera modal, so per-hook state would go stale there and
 * its next write would overwrite what the camera's quick settings changed.
 * SQLite is the durable copy; this store is hydrated from it once.
 */
export type SettingsState = {
  settings: CameraSettings;
  /** The persisted blob has been read; only then is it safe to write it back. */
  hydrated: boolean;
  /** Patches made before hydration, re-applied on top of the persisted values. */
  pending: Partial<CameraSettings>;
};

/** Persisted JSON → settings. Missing keys take defaults; a corrupt blob is ignored. */
export function parseSettings(raw: string | null): CameraSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Merge a patch into the *latest* state, key by key. */
export function patchSettings(
  state: SettingsState,
  patch: Partial<CameraSettings>,
): SettingsState {
  return {
    settings: { ...state.settings, ...patch },
    hydrated: state.hydrated,
    pending: state.hydrated ? state.pending : { ...state.pending, ...patch },
  };
}

/** Apply the persisted blob, keeping any change the user made while it loaded. */
export function hydrateSettings(
  state: SettingsState,
  raw: string | null,
): SettingsState {
  return {
    settings: { ...parseSettings(raw), ...state.pending },
    hydrated: true,
    pending: {},
  };
}

export const useSettingsStore = create<SettingsState>()(() => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  pending: {},
}));

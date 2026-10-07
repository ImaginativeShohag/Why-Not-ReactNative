import {
  DEFAULT_SETTINGS,
  hydrateSettings,
  parseSettings,
  patchSettings,
  type SettingsState,
} from "@/src/projects/camera-social/stores/settingsStore";

const fresh: SettingsState = {
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  pending: {},
};

describe("camera settings store", () => {
  it("parses the blob over defaults and ignores corrupt JSON", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{not json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"haptics":false}')).toEqual({
      ...DEFAULT_SETTINGS,
      haptics: false,
    });
  });

  it("merges each patch into the latest state, key by key", () => {
    const loaded = hydrateSettings(fresh, null);
    // Camera quick settings, then the (still mounted) Profile tab.
    const a = patchSettings(loaded, { haptics: false });
    const b = patchSettings(a, { keepExif: false });
    expect(b.settings).toEqual({
      ...DEFAULT_SETTINGS,
      haptics: false,
      keepExif: false,
    });
    expect(b.pending).toEqual({});
  });

  it("keeps a change made before hydration on top of the persisted blob", () => {
    const early = patchSettings(fresh, { shutterSound: false });
    expect(early.pending).toEqual({ shutterSound: false });

    const loaded = hydrateSettings(
      early,
      JSON.stringify({ ...DEFAULT_SETTINGS, saveToGallery: true }),
    );
    expect(loaded).toEqual({
      settings: {
        ...DEFAULT_SETTINGS,
        saveToGallery: true,
        shutterSound: false,
      },
      hydrated: true,
      pending: {},
    });
  });
});

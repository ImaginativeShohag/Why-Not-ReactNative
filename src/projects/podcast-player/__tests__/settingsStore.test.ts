import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_SETTINGS,
  ensureSettingsHydrated,
  getSettings,
  useSettingsStore,
} from "@/src/projects/podcast-player/stores/settingsStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const KEY = "podcast-player/settings";

describe("ensureSettingsHydrated (headless background task)", () => {
  beforeEach(async () => {
    // setState on a persisted store also writes to storage; reset first,
    // let that write land, then start from an empty storage.
    useSettingsStore.setState(DEFAULT_SETTINGS);
    await new Promise((r) => setTimeout(r, 0));
    await AsyncStorage.clear();
  });

  it("returns the persisted values, not the defaults a sync read can see", async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          ...DEFAULT_SETTINGS,
          wifiOnly: false,
          maxConcurrentDownloads: 3,
        },
        version: 0,
      }),
    );
    // Simulate a fresh headless launch: hydration hasn't happened yet, so the
    // synchronous getter still reports the defaults.
    const hasHydrated = jest
      .spyOn(useSettingsStore.persist, "hasHydrated")
      .mockReturnValueOnce(false);
    expect(getSettings().wifiOnly).toBe(true);

    const settings = await ensureSettingsHydrated();

    expect(settings.wifiOnly).toBe(false);
    expect(settings.maxConcurrentDownloads).toBe(3);
    expect(getSettings().wifiOnly).toBe(false);
    hasHydrated.mockRestore();
  });

  it("doesn't re-read storage once hydrated", async () => {
    await useSettingsStore.persist.rehydrate();
    const rehydrate = jest.spyOn(useSettingsStore.persist, "rehydrate");
    await ensureSettingsHydrated();
    expect(rehydrate).not.toHaveBeenCalled();
    rehydrate.mockRestore();
  });

  it("still resolves (with defaults) when the storage read fails", async () => {
    const getItem = jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("disk I/O"));
    const hasHydrated = jest
      .spyOn(useSettingsStore.persist, "hasHydrated")
      .mockReturnValueOnce(false);

    await expect(ensureSettingsHydrated()).resolves.toEqual(
      expect.objectContaining({ wifiOnly: DEFAULT_SETTINGS.wifiOnly }),
    );
    getItem.mockRestore();
    hasHydrated.mockRestore();
  });
});

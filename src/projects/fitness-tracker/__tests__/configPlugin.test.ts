/**
 * @jest-environment node
 */
import type { ExpoConfig } from "expo/config";
import { compileModsAsync } from "expo/config-plugins";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The plugin is CommonJS build-time tooling at the repo root (not app code).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withWorkoutCapabilities = require("../../../../plugins/withWorkoutCapabilities");
const { withWorkoutCapabilitiesUnwrapped } = withWorkoutCapabilities;

const APP_GROUP = "group.org.example.app";

// An empty project root, so introspection starts from Expo's templates rather
// than a leftover prebuilt ios/ or android/ folder in the repo (which would
// leak the real app's entitlements into the assertions).
let projectRoot: string;
beforeAll(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "config-plugin-"));
});
afterAll(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

type Introspected = ExpoConfig & {
  _internal: {
    modResults: {
      android: {
        manifest: {
          manifest: {
            "uses-permission"?: { $: { "android:name": string } }[];
            application?: {
              receiver?: { $: { "android:name": string } }[];
            }[];
          };
        };
      };
    };
  };
};

/**
 * Runs the plugin's mods in memory (introspection mode — the same thing
 * `npx expo config --type introspect` does): no native folders are written,
 * dangerous mods (file copies) are skipped.
 */
async function introspect(
  applyTimes = 1,
  seed: Partial<ExpoConfig> = {},
  plugin = withWorkoutCapabilities,
) {
  let config: ExpoConfig = {
    name: "test",
    slug: "test",
    ios: { bundleIdentifier: "org.example.app" },
    android: { package: "org.example.app" },
    ...seed,
    _internal: { projectRoot },
  };
  for (let i = 0; i < applyTimes; i++) {
    config = plugin(config, { appGroup: APP_GROUP });
  }
  return (await compileModsAsync(config, {
    projectRoot,
    introspect: true,
    platforms: ["ios", "android"],
  })) as Introspected;
}

const permissions = (config: Introspected) =>
  (
    config._internal.modResults.android.manifest.manifest["uses-permission"] ??
    []
  ).map((p) => p.$["android:name"]);

describe("withWorkoutCapabilities", () => {
  it("adds iOS background location, Live Activities and the App Group", async () => {
    const config = await introspect();
    expect(config.ios?.infoPlist?.UIBackgroundModes).toContain("location");
    expect(config.ios?.infoPlist?.NSSupportsLiveActivities).toBe(true);
    expect(
      config.ios?.entitlements?.["com.apple.security.application-groups"],
    ).toEqual([APP_GROUP]);
    expect(config.ios?.entitlements?.["com.apple.developer.healthkit"]).toBe(
      true,
    );
  });

  it("adds the Android permissions a location foreground service needs", async () => {
    const perms = permissions(await introspect());
    expect(perms).toEqual(
      expect.arrayContaining([
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.ACTIVITY_RECOGNITION",
        "android.permission.POST_NOTIFICATIONS",
      ]),
    );
  });

  it("registers the home-screen widget receiver", async () => {
    const config = await introspect();
    const receivers =
      config._internal.modResults.android.manifest.manifest.application?.[0]
        ?.receiver ?? [];
    expect(receivers.map((r) => r.$["android:name"])).toContain(
      "expo.modules.liveactivity.WorkoutWidgetProvider",
    );
  });

  it("the run-once wrapper skips a second application", async () => {
    const config = await introspect(2);
    const perms = permissions(config);
    expect(new Set(perms).size).toBe(perms.length);
    const modes = config.ios?.infoPlist?.UIBackgroundModes as string[];
    expect(new Set(modes).size).toBe(modes.length);
  });

  // Bypasses createRunOncePlugin, so both copies of every mod run and the
  // second one sees the first one's output — the same situation as prebuild
  // without --clean. This is what exercises addUnique, ensurePermissions and
  // the receiver / app-extension existence checks.
  it("each mod is idempotent on its own — the unwrapped plugin twice duplicates nothing", async () => {
    const config = await introspect(2, {}, withWorkoutCapabilitiesUnwrapped);
    const perms = permissions(config);
    expect(perms).toContain("android.permission.FOREGROUND_SERVICE_LOCATION");
    expect(new Set(perms).size).toBe(perms.length);
    expect(config.ios?.infoPlist?.UIBackgroundModes).toEqual(["location"]);
    expect(
      config.ios?.entitlements?.["com.apple.security.application-groups"],
    ).toEqual([APP_GROUP]);
    const receivers = (
      config._internal.modResults.android.manifest.manifest.application?.[0]
        ?.receiver ?? []
    ).filter(
      (r) =>
        r.$["android:name"] ===
        "expo.modules.liveactivity.WorkoutWidgetProvider",
    );
    expect(receivers).toHaveLength(1);
    expect(
      config.extra?.eas?.build?.experimental?.ios?.appExtensions,
    ).toHaveLength(1);
  });

  it("collapses an App Group another plugin already duplicated", async () => {
    const config = await introspect(1, {
      ios: {
        bundleIdentifier: "org.example.app",
        entitlements: {
          "com.apple.security.application-groups": [APP_GROUP, APP_GROUP],
        },
      },
    });
    expect(
      config.ios?.entitlements?.["com.apple.security.application-groups"],
    ).toEqual([APP_GROUP]);
  });

  it("fails fast on an App Group id that would silently break the widget", () => {
    expect(() =>
      withWorkoutCapabilities({ name: "t", slug: "t" }, { appGroup: "oops" }),
    ).toThrow(/group\./);
  });
});

/* global __dirname */
/**
 * Project 04 · hand-written config plugin.
 *
 * Everything the fitness tracker needs from the native projects, expressed as
 * mods so `npx expo prebuild --clean` regenerates it from scratch:
 *
 *   withInfoPlist         background location, Live Activities, App Group key
 *   withEntitlementsPlist App Group (app ↔ widget), HealthKit
 *   withAndroidManifest   background/foreground-service/activity/notification
 *                         + Health Connect permissions, widget receiver
 *   withDangerousMod      copy the widget Swift sources into ios/WorkoutWidget
 *   withXcodeProject      register the WorkoutWidget app-extension target
 *
 * Every mod is idempotent — running prebuild twice without --clean must not
 * duplicate a permission, a background mode or a target.
 */
const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const TARGET_NAME = "WorkoutWidget";
const WIDGET_SOURCE_DIR = path.join(__dirname, "workout-widget");
// Single source of truth for the ActivityAttributes type shared by app + extension.
const SHARED_ATTRIBUTES = path.join(
  __dirname,
  "..",
  "modules",
  "live-activity",
  "ios",
  "WorkoutAttributes.swift",
);
const SWIFT_SOURCES = [
  "WorkoutWidgetBundle.swift",
  "WorkoutLiveActivity.swift",
  "TodayWidget.swift",
  "WorkoutAttributes.swift",
];
const ENTITLEMENTS_FILE = `${TARGET_NAME}.entitlements`;
const WIDGET_DEPLOYMENT_TARGET = "16.4";

const ANDROID_PERMISSIONS = [
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.FOREGROUND_SERVICE",
  // Android 14+: starting a location FGS without this throws at runtime, not build time.
  "android.permission.FOREGROUND_SERVICE_LOCATION",
  "android.permission.ACTIVITY_RECOGNITION",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.health.READ_HEART_RATE",
  "android.permission.health.READ_EXERCISE",
  "android.permission.health.WRITE_EXERCISE",
  "android.permission.health.WRITE_EXERCISE_ROUTE",
  "android.permission.health.WRITE_DISTANCE",
  "android.permission.health.WRITE_TOTAL_CALORIES_BURNED",
];

const WIDGET_RECEIVER = "expo.modules.liveactivity.WorkoutWidgetProvider";

function assertAppGroup(props) {
  const appGroup = props && props.appGroup;
  if (!appGroup || !appGroup.startsWith("group.")) {
    throw new Error(
      `[withWorkoutCapabilities] "appGroup" must be an App Group id starting with "group." (got ${appGroup}).`,
    );
  }
  return appGroup;
}

/**
 * Union that also collapses duplicates already in `list`. Other plugins don't
 * all dedupe (expo-share-intent prepends its App Group unconditionally), and
 * this plugin is ordered to run after them, so it leaves the arrays clean.
 */
const addUnique = (list, ...values) => [
  ...new Set([...(Array.isArray(list) ? list : []), ...values]),
];

/* ------------------------------------------------------------------ iOS */

function withWorkoutInfoPlist(config, { appGroup }) {
  return withInfoPlist(config, (config) => {
    const plist = config.modResults;
    plist.UIBackgroundModes = addUnique(plist.UIBackgroundModes, "location");
    plist.NSSupportsLiveActivities = true;
    // Only local updates (≈1 Hz, throttled in JS); no push-token budget needed.
    plist.NSSupportsLiveActivitiesFrequentUpdates = false;
    plist.NSLocationAlwaysAndWhenInUseUsageDescription ??=
      "Track your workout route while the screen is off.";
    plist.NSLocationWhenInUseUsageDescription ??=
      "Show your position during a workout.";
    plist.NSMotionUsageDescription ??=
      "Count steps and detect when you stop moving.";
    // Read by WorkoutShared.appGroup in Swift — same key in the widget's plist.
    plist.WorkoutAppGroup = appGroup;
    return config;
  });
}

function withWorkoutEntitlements(config, { appGroup }) {
  return withEntitlementsPlist(config, (config) => {
    const ent = config.modResults;
    ent["com.apple.security.application-groups"] = addUnique(
      ent["com.apple.security.application-groups"],
      appGroup,
    );
    ent["com.apple.developer.healthkit"] = true;
    ent["com.apple.developer.healthkit.access"] ??= [];
    return config;
  });
}

function widgetBundleId(config) {
  const bundleId = config.ios && config.ios.bundleIdentifier;
  if (!bundleId)
    throw new Error(
      "[withWorkoutCapabilities] ios.bundleIdentifier is required.",
    );
  return `${bundleId}.${TARGET_NAME}`;
}

function withWidgetSources(config, { appGroup }) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        TARGET_NAME,
      );
      fs.mkdirSync(targetDir, { recursive: true });

      for (const file of SWIFT_SOURCES) {
        const from =
          file === "WorkoutAttributes.swift"
            ? SHARED_ATTRIBUTES
            : path.join(WIDGET_SOURCE_DIR, file);
        fs.copyFileSync(from, path.join(targetDir, file));
      }

      const infoPlist = fs
        .readFileSync(path.join(WIDGET_SOURCE_DIR, "Info.plist"), "utf8")
        .replace("__APP_GROUP__", appGroup);
      fs.writeFileSync(path.join(targetDir, "Info.plist"), infoPlist);

      fs.writeFileSync(
        path.join(targetDir, ENTITLEMENTS_FILE),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>${appGroup}</string>
	</array>
</dict>
</plist>
`,
      );
      return config;
    },
  ]);
}

function mainDevelopmentTeam(project) {
  const configs = project.pbxXCBuildConfigurationSection();
  for (const key of Object.keys(configs)) {
    const bs = configs[key] && configs[key].buildSettings;
    if (
      bs &&
      bs.DEVELOPMENT_TEAM &&
      !String(bs.PRODUCT_NAME || "").includes(TARGET_NAME)
    ) {
      return String(bs.DEVELOPMENT_TEAM).replace(/"/g, "");
    }
  }
  return null;
}

function withWidgetTarget(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    if (project.pbxTargetByName(TARGET_NAME)) return config;

    const bundleId = widgetBundleId(config);
    const files = [...SWIFT_SOURCES, "Info.plist", ENTITLEMENTS_FILE];

    // Group shown in Xcode's navigator, attached to the project's root group.
    const group = project.addPbxGroup(files, TARGET_NAME, TARGET_NAME);
    const rootGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(group.uuid, rootGroupKey);

    // The `xcode` package assumes these sections exist; a single-target
    // project generated by prebuild doesn't have them yet.
    const objects = project.hash.project.objects;
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};

    // app_extension also adds an embed (Copy Files → PlugIns) phase to the app
    // target and a target dependency, so the .appex ships inside the .app.
    const target = project.addTarget(
      TARGET_NAME,
      "app_extension",
      TARGET_NAME,
      bundleId,
    );
    project.addBuildPhase(
      SWIFT_SOURCES,
      "PBXSourcesBuildPhase",
      "Sources",
      target.uuid,
    );
    project.addBuildPhase(
      [],
      "PBXResourcesBuildPhase",
      "Resources",
      target.uuid,
    );
    project.addBuildPhase(
      [],
      "PBXFrameworksBuildPhase",
      "Frameworks",
      target.uuid,
    );

    const team = mainDevelopmentTeam(project);
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const bs = configurations[key] && configurations[key].buildSettings;
      if (!bs || bs.PRODUCT_NAME !== `"${TARGET_NAME}"`) continue;
      Object.assign(bs, {
        APPLICATION_EXTENSION_API_ONLY: "YES",
        CLANG_ENABLE_MODULES: "YES",
        CODE_SIGN_ENTITLEMENTS: `"${TARGET_NAME}/${ENTITLEMENTS_FILE}"`,
        CODE_SIGN_STYLE: "Automatic",
        CURRENT_PROJECT_VERSION: `"${(config.ios && config.ios.buildNumber) || "1"}"`,
        GENERATE_INFOPLIST_FILE: "NO",
        INFOPLIST_FILE: `"${TARGET_NAME}/Info.plist"`,
        IPHONEOS_DEPLOYMENT_TARGET: WIDGET_DEPLOYMENT_TARGET,
        LD_RUNPATH_SEARCH_PATHS: `"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"`,
        MARKETING_VERSION: `"${config.version || "1.0.0"}"`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}"`,
        SDKROOT: "iphoneos",
        SKIP_INSTALL: "YES",
        SWIFT_EMIT_LOC_STRINGS: "YES",
        SWIFT_VERSION: "5.0",
        TARGETED_DEVICE_FAMILY: `"1,2"`,
      });
      if (team) bs.DEVELOPMENT_TEAM = team;
    }
    if (team) {
      project.addTargetAttribute(
        "DevelopmentTeam",
        team,
        project.pbxTargetByName(TARGET_NAME),
      );
    }
    return config;
  });
}

/** Tells EAS Build to provision a profile for the extension's bundle id too. */
function withEasAppExtension(config, { appGroup }) {
  const bundleIdentifier = widgetBundleId(config);
  config.extra = config.extra || {};
  const eas = (config.extra.eas = config.extra.eas || {});
  const build = (eas.build = eas.build || {});
  const experimental = (build.experimental = build.experimental || {});
  const ios = (experimental.ios = experimental.ios || {});
  const extensions = (ios.appExtensions = ios.appExtensions || []);
  if (!extensions.some((e) => e.targetName === TARGET_NAME)) {
    extensions.push({
      targetName: TARGET_NAME,
      bundleIdentifier,
      entitlements: { "com.apple.security.application-groups": [appGroup] },
    });
  }
  return config;
}

/* -------------------------------------------------------------- Android */

function withWorkoutManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    AndroidConfig.Permissions.ensurePermissions(manifest, ANDROID_PERMISSIONS);

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app.receiver = app.receiver || [];
    if (!app.receiver.some((r) => r.$["android:name"] === WIDGET_RECEIVER)) {
      app.receiver.push({
        $: { "android:name": WIDGET_RECEIVER, "android:exported": "false" },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              // Resource lives in modules/live-activity/android/src/main/res and
              // is merged into the app by the Android resource merger.
              "android:resource": "@xml/workout_widget_info",
            },
          },
        ],
      });
    }
    return config;
  });
}

/* ------------------------------------------------------------- compose */

function withWorkoutCapabilities(config, props) {
  const appGroup = assertAppGroup(props);
  config = withWorkoutInfoPlist(config, { appGroup });
  config = withWorkoutEntitlements(config, { appGroup });
  config = withWidgetSources(config, { appGroup });
  config = withWidgetTarget(config);
  config = withEasAppExtension(config, { appGroup });
  config = withWorkoutManifest(config);
  return config;
}

module.exports = createRunOncePlugin(
  withWorkoutCapabilities,
  "withWorkoutCapabilities",
  "1.0.0",
);
// The unwrapped plugin, so tests can apply it twice and exercise each mod's
// own idempotency (the run-once wrapper would skip the second call).
module.exports.withWorkoutCapabilitiesUnwrapped = withWorkoutCapabilities;
module.exports.TARGET_NAME = TARGET_NAME;
module.exports.ANDROID_PERMISSIONS = ANDROID_PERMISSIONS;

/**
 * Adopt the UIScene life cycle on iOS.
 *
 * iOS 27 asserts at launch (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`,
 * EXC_BREAKPOINT) unless the app declares a scene manifest. Expo ships
 * `ExpoAppSceneDelegate` for this, but the SDK 57 prebuild template still
 * generates the window-based AppDelegate, so:
 *
 *   withInfoPlist   declare UIApplicationSceneManifest → EXExpoAppSceneDelegate
 *   withAppDelegate conform to ExpoReactNativeFactoryProvider and stop creating
 *                   the window there; the scene delegate creates it and starts RN
 *
 * Idempotent: running prebuild twice without --clean leaves the output unchanged.
 * Delete this plugin once the Expo template adopts scenes itself.
 */
const {
  createRunOncePlugin,
  withAppDelegate,
  withInfoPlist,
} = require("expo/config-plugins");

const SCENE_DELEGATE_CLASS = "EXExpoAppSceneDelegate";
const PROVIDER_PROTOCOL = "ExpoReactNativeFactoryProvider";

const WINDOW_BLOCK =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("withSceneLifecycle only supports a Swift AppDelegate.");
    }
    let src = cfg.modResults.contents;

    if (!src.includes(PROVIDER_PROTOCOL)) {
      src = src.replace(
        "class AppDelegate: ExpoAppDelegate {",
        `class AppDelegate: ExpoAppDelegate, ${PROVIDER_PROTOCOL} {`,
      );
      if (!src.includes(PROVIDER_PROTOCOL)) {
        throw new Error(
          "withSceneLifecycle: AppDelegate class declaration not found.",
        );
      }
    }

    // ExpoAppSceneDelegate creates the window from the UIWindowScene and starts RN into it.
    src = src.replace(WINDOW_BLOCK, "");
    if (src.includes("window = UIWindow(")) {
      throw new Error(
        "withSceneLifecycle: AppDelegate window block not recognised.",
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

const withSceneLifecycle = (config) =>
  withSceneAppDelegate(withSceneManifest(config));

module.exports = createRunOncePlugin(
  withSceneLifecycle,
  "with-scene-lifecycle",
  "1.0.0",
);

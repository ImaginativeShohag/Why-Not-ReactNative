import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic config (Project 03 · M1). APP_VARIANT is set per EAS build profile in
 * eas.json, so dev / preview / production install side-by-side on one device,
 * each pointing at its own API. Secrets never live here — only public values
 * that vary per environment, read at runtime via expo-constants `extra`.
 */
type Variant = "development" | "preview" | "production";

const VARIANT = (process.env.APP_VARIANT ?? "development") as Variant;

const BASE_ID = "org.imaginativeworld.whynotreactnative";
const EAS_PROJECT_ID = "14c49066-d1a8-4fd8-a15b-4d290153a787";
const APP_GROUP = `group.${BASE_ID}`;

// iOS has one usage string per permission for the whole app, and the first
// plugin that sets it wins. Several projects ask for the camera and photos, so
// the wording must cover all of them, and every plugin gets the same text.
const CAMERA_PERMISSION =
  "Take photos and videos for your journal and Camera & Social.";
const PHOTOS_PERMISSION =
  "Choose photos to attach to journal entries or to edit and share.";
const LINK_DOMAIN = process.env.LINK_DOMAIN ?? "whynotreactnative.example.com";

const VARIANTS: Record<
  Variant,
  { idSuffix: string; name: string; storeApiUrl: string }
> = {
  development: {
    idSuffix: ".dev",
    name: "WNRN (Dev)",
    storeApiUrl: process.env.STORE_API_URL ?? "https://fakestoreapi.com",
  },
  preview: {
    idSuffix: ".preview",
    name: "WNRN (Beta)",
    storeApiUrl: process.env.STORE_API_URL ?? "https://fakestoreapi.com",
  },
  production: {
    idSuffix: "",
    name: "Why-Not-ReactNative",
    storeApiUrl: process.env.STORE_API_URL ?? "https://fakestoreapi.com",
  },
};

const variant = VARIANTS[VARIANT];
const bundleId = `${BASE_ID}${variant.idSuffix}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  slug: "Why-Not-ReactNative",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/images/icon.png",
  scheme: "whynotreactnative",
  userInterfaceStyle: "automatic",
  runtimeVersion: { policy: "fingerprint" },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
  },
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    associatedDomains: [`applinks:${LINK_DOMAIN}`],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.security.application-groups": [APP_GROUP],
    },
    usesAppleSignIn: true,
    // Required-reason APIs the app itself touches (Expo modules ship their
    // own manifests). See docs/05-release.html for why each reason applies.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
          NSPrivacyAccessedAPITypeReasons: ["C617.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
          NSPrivacyAccessedAPITypeReasons: ["E174.1"],
        },
        {
          NSPrivacyAccessedAPIType:
            "NSPrivacyAccessedAPICategorySystemBootTime",
          NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: bundleId,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: LINK_DOMAIN, pathPrefix: "/p/" },
          { scheme: "https", host: LINK_DOMAIN, pathPrefix: "/order/" },
          { scheme: "https", host: LINK_DOMAIN, pathPrefix: "/post/" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./src/assets/images/favicon.png",
  },
  plugins: [
    // iOS 27 crashes at launch without the UIScene life cycle. Listed first so
    // its AppDelegate mod runs last, after every other plugin's edits.
    "./plugins/withSceneLifecycle",
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./src/assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    "expo-web-browser",
    "expo-font",
    "expo-image",
    "expo-status-bar",
    "expo-sqlite",
    "expo-secure-store",
    "expo-localization",
    "expo-sharing",
    "expo-background-task",
    ["expo-build-properties", { android: { minSdkVersion: 26 } }],
    "expo-apple-authentication",
    ["expo-notifications", { color: "#4f46e5", defaultChannel: "default" }],
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Unlock your journal and store session with Face ID.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: PHOTOS_PERMISSION,
        cameraPermission: CAMERA_PERMISSION,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: CAMERA_PERMISSION,
        microphonePermission: "Record sound with your videos.",
        recordAudioAndroid: true,
        barcodeScannerEnabled: true,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: PHOTOS_PERMISSION,
        savePhotosPermission: "Save your edited photos to the gallery.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-video",
      { supportsBackgroundPlayback: false, supportsPictureInPicture: true },
    ],
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: true,
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Track your workout route while the screen is off.",
        locationWhenInUsePermission: "Show your position during a workout.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-sensors",
      { motionPermission: "Count steps and detect when you stop moving." },
    ],
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY },
    ],
    [
      "@stripe/stripe-react-native",
      { merchantIdentifier: `merchant.${BASE_ID}`, enableGooglePay: true },
    ],
    // Listed BEFORE expo-share-intent on purpose: mods of later plugins run
    // first, so this one runs after it and dedupes the shared App Group array.
    ["./plugins/withWorkoutCapabilities", { appGroup: APP_GROUP }],
    [
      "expo-share-intent",
      {
        iosAppGroupIdentifier: APP_GROUP,
        iosActivationRules: {
          NSExtensionActivationSupportsImageWithMaxCount: 5,
          NSExtensionActivationSupportsMovieWithMaxCount: 1,
        },
        androidIntentFilters: ["image/*", "video/*"],
        disableExperimental: true,
      },
    ],
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription:
          "Read heart rate to chart it alongside your workouts.",
        NSHealthUpdateUsageDescription:
          "Save your workouts and routes to Apple Health.",
        background: false,
      },
    ],
    "react-native-health-connect",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: { projectId: EAS_PROJECT_ID },
    variant: VARIANT,
    storeApiUrl: variant.storeApiUrl,
    podcastIndexUrl: "https://itunes.apple.com",
    linkDomain: LINK_DOMAIN,
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_KEY ?? "",
    // Empty = local dev server (localhost / 10.0.2.2, resolved in env.ts).
    journalSyncUrl: process.env.JOURNAL_SYNC_URL ?? "",
  },
  owner: "imaginativeshohag",
});

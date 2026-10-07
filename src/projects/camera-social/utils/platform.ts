import { Platform } from "react-native";

/**
 * Native zoom transitions (expo-router `Link.AppleZoom`) need iOS 18+. Every
 * other platform/version gets a transparent modal + cross-fade instead, with
 * our own drag-to-dismiss.
 */
export const supportsZoomTransition =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 18;

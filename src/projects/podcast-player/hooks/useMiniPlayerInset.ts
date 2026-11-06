import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MINI_PLAYER_CONTENT_INSET } from "@/src/projects/podcast-player/constants/layout";

/**
 * Bottom padding for a scroll view on a stack screen (no tab bar). The host
 * docks the mini-player above the bottom safe area, and edge-to-edge Android
 * lets the scroll view run under the navigation bar, so that inset has to be
 * added here. iOS already adds it through `contentInsetAdjustmentBehavior`.
 */
export function useMiniPlayerInset() {
  const { bottom } = useSafeAreaInsets();
  return MINI_PLAYER_CONTENT_INSET + (Platform.OS === "android" ? bottom : 0);
}

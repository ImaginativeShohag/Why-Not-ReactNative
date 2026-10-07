import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Typed access to `expo.extra` from app.config.ts. Every project reads its
 * environment-specific values through here rather than hardcoding URLs.
 */
export type AppVariant = "development" | "preview" | "production";

type Extra = {
  variant: AppVariant;
  storeApiUrl: string;
  podcastIndexUrl: string;
  linkDomain: string;
  stripePublishableKey: string;
  journalSyncUrl: string;
  eas: { projectId: string };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

/**
 * A dev server on the host machine is `localhost` to the iOS simulator but
 * `10.0.2.2` to the Android emulator — so the fallback is decided at runtime.
 */
const LOCAL_DEV_SERVER =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export const env = {
  variant: extra.variant ?? "development",
  storeApiUrl: extra.storeApiUrl ?? "https://fakestoreapi.com",
  podcastIndexUrl: extra.podcastIndexUrl ?? "https://itunes.apple.com",
  linkDomain: extra.linkDomain ?? "whynotreactnative.example.com",
  stripePublishableKey: extra.stripePublishableKey ?? "",
  journalSyncUrl: extra.journalSyncUrl || LOCAL_DEV_SERVER,
  easProjectId: extra.eas?.projectId ?? "",
} as const;

/**
 * Store-only runtime configuration. Values that vary per environment and are
 * shared across projects (API URL, Stripe key, EAS project id) come from
 * `@/src/shared/constants/env`. The optional companion backend and OAuth
 * client ids below are `EXPO_PUBLIC_*` variables inlined at bundle time — they
 * are public identifiers, never secrets.
 *
 * Every feature that needs the companion backend degrades to a clearly
 * labelled local simulation when `backendUrl` is empty, so the whole flow is
 * exercisable against FakeStoreAPI alone.
 */
export const storeConfig = {
  /** Companion backend: refresh tokens, social exchange, orders, payments, push. */
  backendUrl: process.env.EXPO_PUBLIC_STORE_BACKEND_URL ?? "",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  /** The store's pricing currency. Display locale comes from the device. */
  currency: "USD",
  merchantCountryCode: "US",
  merchantDisplayName: "Store Overflow",
  merchantIdentifier: "merchant.org.imaginativeworld.whynotreactnative",
  urlScheme: "whynotreactnative",
} as const;

export const hasBackend = () => storeConfig.backendUrl.length > 0;

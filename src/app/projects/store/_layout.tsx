import { StripeProvider } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { type ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { SessionProvider } from "@/src/projects/store/auth/SessionProvider";
import type { SessionStatus } from "@/src/projects/store/auth/sessionContext";
import { useSession } from "@/src/projects/store/auth/useSession";
import LockView from "@/src/projects/store/components/ui/LockView";
import { storeConfig } from "@/src/projects/store/constants/config";
import {
  isProtectedStoreHref,
  storeHrefFromUrl,
} from "@/src/projects/store/navigation/linkRoutes";
import { setPendingIntent } from "@/src/projects/store/navigation/pendingIntent";
import { hydrateStoreState } from "@/src/projects/store/stores/hydration";
import { usePushLifecycle } from "@/src/projects/store/notifications/handlers";
import {
  startStorePersistence,
  stopStorePersistence,
} from "@/src/projects/store/query/storeQuery";
import { env } from "@/src/shared/constants/env";

const RESTORE_TIMEOUT_MS = 1500;
const handledUrls = new Set<string>();

export default function StoreLayout() {
  return (
    <SessionProvider>
      <PaymentsProvider>
        <StoreNavigator />
      </PaymentsProvider>
    </SessionProvider>
  );
}

function PaymentsProvider({ children }: { children: ReactElement }) {
  // Without a key the checkout offers the simulated processor instead; the
  // native SDK is never initialised with an empty key.
  if (!env.stripePublishableKey) return children;
  return (
    <StripeProvider
      publishableKey={env.stripePublishableKey}
      merchantIdentifier={storeConfig.merchantIdentifier}
      urlScheme={storeConfig.urlScheme}
    >
      {children}
    </StripeProvider>
  );
}

function StoreNavigator() {
  const session = useSession();
  const [cacheRestored, setCacheRestored] = useState(false);

  // Guard flicker fix: keep the native splash up until we know who the user
  // is. Layout effects commit before expo-router's own post-mount hide, so on
  // a cold start straight into the store (deep link / push) this wins; when
  // entering from the launcher the splash is long gone and this is a no-op.
  useLayoutEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setCacheRestored(true);
      }
    };
    // Last-known catalogue before first paint; never block boot on disk I/O.
    Promise.all([startStorePersistence(), hydrateStoreState()]).then(finish);
    const timer = setTimeout(finish, RESTORE_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      stopStorePersistence();
    };
  }, []);

  const ready = session.status !== "loading" && cacheRestored;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  useCaptureDeepLinkIntent(session.status);
  usePushLifecycle(session.status === "signedIn");

  const { locked, unlock } = session;
  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  if (!ready) return <View style={styles.boot} />;

  const signedIn = session.status === "signedIn";
  const canBrowse = signedIn || session.status === "guest";

  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Protected guard={!session.onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Declared before (auth): a guest can reach both, and the first
            available group is where /projects/store lands. */}
        <Stack.Protected guard={session.onboarded && canBrowse}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={session.onboarded && !signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {session.locked ? (
        <LockView onUnlock={unlock} onSignOut={() => session.signOut()} />
      ) : null}
    </View>
  );
}

/**
 * A deep link to a protected screen while signed out is bounced by the guard
 * to /sign-in — and the destination is lost. Capture it into the intent
 * buffer so the (app) layout can replay it right after sign-in.
 */
function useCaptureDeepLinkIntent(status: SessionStatus) {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url || status === "loading" || status === "signedIn") return;
    if (handledUrls.has(url)) return;
    handledUrls.add(url);
    const href = storeHrefFromUrl(url);
    if (href && isProtectedStoreHref(href)) setPendingIntent(href);
  }, [url, status]);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: { flex: 1, backgroundColor: "#fff" },
});

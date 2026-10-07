import {
  type Href,
  usePathname,
  useRootNavigationState,
  useRouter,
} from "expo-router";
import { useEffect } from "react";

import type { SessionStatus } from "../auth/sessionContext";
import { requiresAccount, STORE_PREFIX } from "./linkRoutes";
import { usePendingIntent } from "./pendingIntent";

/**
 * Replays the buffered intent once the session has resolved AND the (app)
 * navigator is mounted — the fix for the cold-start race. Mounted by the
 * (app) layout only, so by construction the guard has already let us in.
 */
export function useIntentReplay(status: SessionStatus) {
  const router = useRouter();
  const pathname = usePathname();
  const navigationKey = useRootNavigationState()?.key;
  const pending = usePendingIntent((s) => s.href);
  const setAppMounted = usePendingIntent((s) => s.setAppMounted);

  useEffect(() => {
    setAppMounted(true);
    return () => setAppMounted(false);
  }, [setAppMounted]);

  useEffect(() => {
    if (!pending || !navigationKey || status === "loading") return;
    const { consume, setPending } = usePendingIntent.getState();
    const href = consume();
    if (!href) return;

    if (status !== "signedIn" && requiresAccount(href)) {
      // A guest tapped something that needs an account: keep the intent and
      // send them to sign in; this effect runs again when status flips.
      setPending(href);
      router.push(`${STORE_PREFIX}/sign-in`);
      return;
    }

    const [path] = href.split("?");
    if (path === pathname) return; // The router already got there.

    // Let the guard-driven navigation (e.g. leaving /sign-in) settle first.
    // Not cancelled on cleanup: consuming the intent re-runs this effect.
    // The intent comes from a runtime URL (push, deep link), so typed routes
    // cannot check it; producers only park hrefs they built for the store.
    requestAnimationFrame(() => router.push(href as Href));
    // pathname is read, not reacted to: replay is driven by new intents and
    // session changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, navigationKey, status, router]);
}

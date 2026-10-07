import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

import { STORE_PREFIX } from "../navigation/linkRoutes";
import {
  setPendingIntent,
  usePendingIntent,
} from "../navigation/pendingIntent";
import { track } from "../utils/analytics";
import { registerForPushAsync } from "./registerForPush";
import {
  hrefFromNotification,
  parseNotificationData,
} from "./routeFromNotification";

let handlerInstalled = false;
let listenerStarted = false;
const handledResponses = new Set<string>();

/**
 * Foreground presentation. `setNotificationHandler` is process-global and the
 * last call wins: `startNotificationResponseListener()` runs from the root
 * layout, so this replaces the journal's module-scope handler for the whole
 * app. It is deliberately neutral: every notification (the journal's
 * reminders included) shows as a banner + list entry, and only store payloads
 * play a sound or set the badge — the same presentation the journal asks for.
 */
export function installNotificationHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isStore =
        parseNotificationData(notification.request.content.data) !== null;
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: isStore,
        // The server sets the badge number in the payload.
        shouldSetBadge: isStore,
      };
    },
  });
}

function handleResponse(response: Notifications.NotificationResponse) {
  const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  // Cold start can deliver the same response via the listener AND
  // getLastNotificationResponse — route it once.
  if (handledResponses.has(id)) return;

  const data = response.notification.request.content.data;
  const href = hrefFromNotification(data, response.actionIdentifier);
  if (!href) return; // Not a store notification.
  handledResponses.add(id);

  const parsed = parseNotificationData(data);
  track("notification_opened", {
    type: parsed?.type ?? "unknown",
    action: response.actionIdentifier,
  });
  Notifications.clearLastNotificationResponse();

  // Buffer, don't navigate: the session may still be loading and the
  // navigator may not be mounted. The (app) layout replays it when both are
  // ready. If the store isn't on screen at all (user is in the launcher or
  // another project), enter it — the routing queue holds this until the root
  // navigator is ready.
  setPendingIntent(href);
  if (!usePendingIntent.getState().appMounted) {
    router.navigate(STORE_PREFIX);
  }
}

/**
 * Starts the tap listener once, and checks for a cold-start response with the
 * synchronous `getLastNotificationResponse()` (SDK 53+; the async variant is
 * deprecated). Idempotent. Called from the root layout so a tap on a store
 * push on a cold start (or while the user is elsewhere) still lands in the
 * store; it never requests permission.
 */
export function startNotificationResponseListener() {
  if (listenerStarted) return;
  listenerStarted = true;
  installNotificationHandler();

  try {
    const last = Notifications.getLastNotificationResponse();
    if (last) handleResponse(last);
  } catch {
    // Native module unavailable (web / tests).
  }

  Notifications.addNotificationResponseReceivedListener(handleResponse);
}

/**
 * Session-scoped push lifecycle: re-registers the token on sign-in and on
 * rotation, and clears the badge whenever the store comes to the foreground.
 */
export function usePushLifecycle(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    registerForPushAsync();
    const tokenSub = Notifications.addPushTokenListener(() => {
      registerForPushAsync();
    });
    const clearBadge = () => {
      Notifications.setBadgeCountAsync(0).catch(() => {});
    };
    clearBadge();
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") clearBadge();
    });
    return () => {
      tokenSub.remove();
      appStateSub.remove();
    };
  }, [signedIn]);
}

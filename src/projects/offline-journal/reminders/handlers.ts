import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";

// Module scope, not inside a component: the handler has to exist before the
// first notification arrives, including one that arrives during startup.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const JOURNAL_PREFIX = "/projects/offline-journal/";

/** Only follow URLs that belong to this project — notification data is input. */
function journalUrl(notification: Notifications.Notification) {
  const url = notification.request.content.data?.url;
  return typeof url === "string" && url.startsWith(JOURNAL_PREFIX) ? url : null;
}

let routingStarted = false;
const handledResponses = new Set<string>();

function open(response: Notifications.NotificationResponse) {
  const url = journalUrl(response.notification);
  if (!url) return; // Not ours — the store routes its own pushes.
  const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  // Cold start can deliver the same tap via the listener AND the last response.
  if (handledResponses.has(id)) return;
  handledResponses.add(id);
  // Before the root navigator mounts this lands in expo-router's routing
  // queue and is replayed once it's ready.
  router.push(url as Href);
}

/**
 * Started from the ROOT layout, not the journal's. A reminder tapped while
 * the app is killed opens the launcher; the journal layout never mounts, so a
 * listener living there would miss the tap. Idempotent.
 */
export function startJournalNotificationRouting() {
  if (routingStarted) return;
  routingStarted = true;

  try {
    // Cold start: the tap that launched the app is already sitting here.
    // Clear it once handled, or every later launch re-opens compose.
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification && journalUrl(last.notification)) {
      Notifications.clearLastNotificationResponse();
      open(last);
    }
  } catch {
    // Native module unavailable (web / tests).
  }

  Notifications.addNotificationResponseReceivedListener(open);
}

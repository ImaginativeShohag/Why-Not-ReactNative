import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_CHANNEL = "journal-reminders";
const REMINDER_ID = "daily-journal-reminder";
const COMPOSE_URL = "/projects/offline-journal/entry/compose";

/** Android: the channel must exist BEFORE the permission prompt. */
export async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: "Daily reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type PermissionState = "granted" | "undetermined" | "blocked";

/** Lets a screen show its own rationale BEFORE the one-shot system prompt. */
export async function getPermissionState(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  return current.canAskAgain ? "undetermined" : "blocked";
}

export async function requestPermission() {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false; // send them to Settings instead
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/** Returns the scheduled id, or null when permission was refused. */
export async function scheduleDailyReminder(hour: number, minute: number) {
  if (!(await requestPermission())) return null;

  // A fixed identifier makes rescheduling idempotent: cancel, then schedule.
  await cancelDailyReminder();
  return Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "Today's entry",
      body: "Two lines is enough.",
      data: { url: COMPOSE_URL },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL,
    },
  });
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

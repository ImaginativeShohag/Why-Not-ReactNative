import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";

import { env } from "@/src/shared/constants/env";

import { registerPushToken, unregisterPushToken } from "../api/push.api";
import { track } from "../utils/analytics";
import { monitoring } from "../utils/monitoring";
import {
  NOTIFICATION_ACTIONS,
  ORDER_CATEGORY_ID,
} from "./routeFromNotification";

const TOKEN_KEY = "store.push.token";
const DEVICE_ID_KEY = "store.deviceId";

export const ORDER_CHANNEL_ID = "store-orders";
export const PROMO_CHANNEL_ID = "store-promotions";

export type PushPermission = "granted" | "denied" | "undetermined";

/**
 * Android 13+: the permission prompt only appears once a channel exists, and
 * channel importance is fixed at creation — so channels go FIRST.
 */
export async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
      name: "Order updates",
      description: "Shipping and delivery updates for your orders",
      importance: Notifications.AndroidImportance.HIGH,
    }),
    Notifications.setNotificationChannelAsync(PROMO_CHANNEL_ID, {
      name: "Offers",
      description: "Occasional promotions",
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
  ]);
}

/** Action buttons on order notifications: "Track" and "Reorder". */
export async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(ORDER_CATEGORY_ID, [
    {
      identifier: NOTIFICATION_ACTIONS.track,
      buttonTitle: "Track",
      options: { opensAppToForeground: true },
    },
    {
      identifier: NOTIFICATION_ACTIONS.reorder,
      buttonTitle: "Reorder",
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function getPushPermission(): Promise<PushPermission> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return "granted";
  if (
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return "granted";
  }
  return settings.canAskAgain ? "undetermined" : "denied";
}

/**
 * Asks the OS. Callers MUST show their own rationale first (why, what you'll
 * get) — iOS only ever shows the system prompt once.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  await ensureAndroidChannels();
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return result.granted
    ? "granted"
    : result.canAskAgain
      ? "undetermined"
      : "denied";
}

/**
 * Opt-in flow for order updates: our rationale first, then the one-shot
 * system prompt, then token registration if granted.
 */
export function askForOrderUpdates({
  title,
  message,
  confirmLabel,
  onResult,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onResult?: (result: PushPermission) => void;
}) {
  Alert.alert(title, message, [
    { text: "Not now", style: "cancel" },
    {
      text: confirmLabel,
      onPress: async () => {
        const result = await requestPushPermission();
        onResult?.(result);
        track("push_permission", { granted: result === "granted" });
        if (result === "granted") registerForPushAsync();
      },
    },
  ]);
}

async function deviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

/**
 * Gets the Expo push token and associates it with the signed-in user.
 * Only runs when permission is already granted — it never prompts. Called on
 * sign-in, after the user opts in, and on token rotation.
 */
export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulators can't receive remote push.
  if (!env.easProjectId) return null;
  try {
    await ensureAndroidChannels();
    await registerNotificationCategories();
    if ((await getPushPermission()) !== "granted") return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: env.easProjectId,
    });
    await registerPushToken(token, await deviceId());
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (error) {
    monitoring.captureException(error, { area: "push.register" });
    return null;
  }
}

/** Sign-out: detach this device from the user so their updates stop arriving. */
export async function unregisterForPushAsync() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) await unregisterPushToken(token);
  await AsyncStorage.removeItem(TOKEN_KEY);
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // ignore
  }
}

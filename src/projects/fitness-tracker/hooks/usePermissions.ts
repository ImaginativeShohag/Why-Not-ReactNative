import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

export type PermissionKey =
  "foreground" | "background" | "motion" | "notifications";
export type PermissionStatus =
  "granted" | "denied" | "undetermined" | "blocked";

export type PermissionState = Record<PermissionKey, PermissionStatus>;

const toStatus = (r: {
  granted: boolean;
  canAskAgain?: boolean;
  status: string;
}): PermissionStatus =>
  r.granted
    ? "granted"
    : r.status === "undetermined"
      ? "undetermined"
      : r.canAskAgain === false
        ? "blocked"
        : "denied";

async function readAll(): Promise<PermissionState> {
  const [fg, bg, motion, notif] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync().catch(() => ({
      granted: false,
      status: "undetermined",
      canAskAgain: true,
    })),
    Pedometer.getPermissionsAsync().catch(() => ({
      granted: false,
      status: "undetermined",
      canAskAgain: true,
    })),
    Notifications.getPermissionsAsync(),
  ]);
  return {
    foreground: toStatus(fg),
    background: toStatus(bg),
    motion: toStatus(motion),
    notifications: toStatus(notif),
  };
}

/**
 * The order is load-bearing: background location can only be requested after
 * foreground is granted — on Android asking first means the prompt never
 * appears, and on Android 11+ it's a separate trip to Settings anyway.
 */
export const PERMISSION_ORDER: PermissionKey[] = [
  "foreground",
  "background",
  "motion",
  "notifications",
];

function openSettings() {
  Linking.openSettings();
}

/** OEM battery killers (Xiaomi, Samsung…) stop the FGS after ~20 min unless exempted. */
function openBatterySettings() {
  if (Platform.OS !== "android") return;
  Linking.sendIntent(
    "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
  ).catch(() => Linking.openSettings());
}

export function usePermissions() {
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(() => {
    readAll()
      .then(setState)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // Returning from the Settings app is the common path for "blocked".
    const sub = AppState.addEventListener(
      "change",
      (s) => s === "active" && refresh(),
    );
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(
    async (key: PermissionKey) => {
      if (key === "foreground")
        await Location.requestForegroundPermissionsAsync();
      if (key === "background") {
        const fg = await Location.getForegroundPermissionsAsync();
        if (fg.granted) await Location.requestBackgroundPermissionsAsync();
      }
      if (key === "motion") await Pedometer.requestPermissionsAsync();
      if (key === "notifications")
        await Notifications.requestPermissionsAsync();
      refresh();
    },
    [refresh],
  );

  return { state, request, refresh, openSettings, openBatterySettings };
}

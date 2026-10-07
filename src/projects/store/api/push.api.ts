import { Platform } from "react-native";

import { hasBackend } from "../constants/config";
import { backendApi } from "./client";

/**
 * Associates an Expo push token with the signed-in user on the backend.
 * Re-sent on every sign-in and whenever the token changes; deleted on sign-out
 * so the previous user's order updates never reach the next user's device.
 */
export async function registerPushToken(token: string, deviceId: string) {
  if (!hasBackend()) {
    if (__DEV__) console.log("[push] (no backend) would register", token);
    return;
  }
  await backendApi.post("/push/tokens", {
    token,
    deviceId,
    platform: Platform.OS,
  });
}

export async function unregisterPushToken(token: string) {
  if (!hasBackend()) return;
  try {
    await backendApi.delete(`/push/tokens/${encodeURIComponent(token)}`);
  } catch {
    // Best effort on sign-out.
  }
}

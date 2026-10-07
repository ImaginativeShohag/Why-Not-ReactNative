import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * EAS Update UX for this project: the "prompt to restart" strategy.
 *
 *  - Default expo-updates behaviour already downloads on launch and applies on
 *    the NEXT launch (silent). We additionally check when the app returns to
 *    the foreground, fetch in the background, and surface a small
 *    "Update ready · Restart" banner so user-visible fixes land sooner.
 *  - Force-apply (reloadAsync immediately) is deliberately not used here.
 *
 * Updates are disabled in dev (Metro serves the JS) — every call is guarded.
 */

const MIN_CHECK_INTERVAL_MS = 10 * 60 * 1000;
let lastCheckAt = 0;

export function updatesAvailable(): boolean {
  return Updates.isEnabled && !__DEV__;
}

async function checkAndFetch(): Promise<void> {
  if (!updatesAvailable()) return;
  if (Date.now() - lastCheckAt < MIN_CHECK_INTERVAL_MS) return;
  lastCheckAt = Date.now();
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // Offline or server error: the next foreground will try again.
  }
}

export type UpdateBannerState = {
  visible: boolean;
  isDownloading: boolean;
  restart: () => void;
  dismiss: () => void;
};

/** Drives <UpdateBanner>. Owned by a screen; the banner itself is dumb. */
export function useUpdateBanner(): UpdateBannerState {
  const { isUpdatePending, isDownloading } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void checkAndFetch();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void checkAndFetch();
    });
    return () => sub.remove();
  }, []);

  const restart = useCallback(() => {
    void Updates.reloadAsync().catch(() => {});
  }, []);
  const dismiss = useCallback(() => setDismissed(true), []);

  return {
    visible: isUpdatePending && !dismissed,
    isDownloading,
    restart,
    dismiss,
  };
}

export type UpdatesInfo = {
  enabled: boolean;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  createdAt: Date | null;
};

export function getUpdatesInfo(): UpdatesInfo {
  return {
    enabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt,
  };
}

/**
 * "Channel surfing" (dev/preview builds only): overrides the
 * expo-channel-name request header so this build fetches another channel's
 * updates. Only updates with this build's runtime version arrive; the
 * fingerprint hashes the whole app config, which differs per APP_VARIANT, so in
 * practice that means updates published for the same variant. The override
 * persists on the device until cleared.
 * Pass null to return to the channel baked into the build.
 */
export async function switchChannel(channel: string | null): Promise<void> {
  if (!Updates.isEnabled)
    throw new Error("expo-updates is disabled in this build");
  Updates.setUpdateRequestHeadersOverride(
    channel ? { "expo-channel-name": channel } : null,
  );
  const result = await Updates.checkForUpdateAsync();
  if (result.isAvailable) await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}

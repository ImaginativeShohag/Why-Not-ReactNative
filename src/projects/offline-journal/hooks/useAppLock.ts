import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";

import { useLockStore } from "../stores/lockStore";
import { useSettingsHydrated, useSettingsStore } from "../stores/settingsStore";

/** Can this device authenticate at all? No enrolled biometrics and no passcode = no. */
export async function canAuthenticate() {
  const [hardware, enrolled, level] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  return (
    (hardware && enrolled) || level !== LocalAuthentication.SecurityLevel.NONE
  );
}

/**
 * True while the system auth sheet is up. On iOS that sheet makes the app
 * "inactive"; the lock must not read it as the user leaving, or an "Instant"
 * lock re-locks on return and prompts again, in a loop.
 */
let authenticating = false;

export async function promptAuthentication(message: string) {
  authenticating = true;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel",
    });
    return result.success;
  } finally {
    authenticating = false;
  }
}

export function useAppLock() {
  const hydrated = useSettingsHydrated();
  const locked = useLockStore((state) => state.locked);
  const obscured = useLockStore((state) => state.obscured);
  const lock = useLockStore((state) => state.lock);
  const unlock = useLockStore((state) => state.unlock);
  const setObscured = useLockStore((state) => state.setObscured);
  const enabled = useSettingsStore((state) => state.biometricLock);
  const graceMs = useSettingsStore((state) => state.lockAfterMs);

  useEffect(() => {
    if (!enabled) return;

    let leftAt: number | null = null;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setObscured(false);
        if (leftAt !== null && Date.now() - leftAt >= graceMs) lock();
        leftAt = null;
      } else {
        if (authenticating) return; // our own Face ID sheet, not a departure
        // "inactive" fires for the app switcher too — that is the moment the
        // OS takes the snapshot, so cover NOW, whatever the grace period says.
        setObscured(true);
        // Only actually leaving starts the grace clock. "inactive" is also a
        // Control Center pull or a system sheet over the app.
        if (state === "background") leftAt ??= Date.now();
      }
    });

    return () => subscription.remove();
  }, [enabled, graceMs, lock, setObscured]);

  const authenticate = useCallback(async () => {
    // Before hydration we don't know whether the lock is on. Doing nothing is
    // the safe answer; the gate re-prompts when this callback's identity
    // changes after hydration.
    if (!hydrated) return false;
    if (!enabled) {
      unlock();
      return true;
    }
    if (!(await canAuthenticate())) {
      unlock(); // nothing enrolled: never brick the user out of their data
      return true;
    }
    const success = await promptAuthentication("Unlock your journal");
    if (success) unlock();
    return success;
  }, [enabled, hydrated, unlock]);

  return {
    // Until settings load, cover the content: we can't yet rule the lock out.
    locked: !hydrated || (enabled && locked),
    obscured: enabled && obscured,
    authenticate,
    lockNow: lock,
  };
}

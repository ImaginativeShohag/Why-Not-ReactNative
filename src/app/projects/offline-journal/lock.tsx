import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { LockScreenView } from "@/src/projects/offline-journal/components/LockScreenView";
import { useAppLock } from "@/src/projects/offline-journal/hooks/useAppLock";

/**
 * "Lock now" destination (Settings pushes it; a deep link can too). Arriving
 * locks the journal — LockGate then covers everything and prompts — and once
 * the lock is lifted this screen gets out of the way.
 */
export default function LockScreen() {
  const { locked, authenticate, lockNow } = useAppLock();
  const sawLock = useRef(false);

  useEffect(() => {
    lockNow();
  }, [lockNow]);

  useEffect(() => {
    if (locked) sawLock.current = true;
    else if (sawLock.current && router.canGoBack()) router.back();
  }, [locked]);

  return (
    <LockScreenView
      onUnlock={() =>
        void authenticate().then((ok) => {
          if (ok && router.canGoBack()) router.back();
        })
      }
    />
  );
}

import { addNetworkStateListener, useNetworkState } from "expo-network";
import type { SQLiteDatabase } from "expo-sqlite";
import { useEffect } from "react";
import { AppState } from "react-native";

import { getMeta, outboxStats } from "../db/queries/outbox";
import { useSettingsStore } from "../stores/settingsStore";
import { useSyncStore } from "../stores/syncStore";
import { kick, LAST_ERROR_KEY, LAST_SYNCED_KEY } from "../sync/syncEngine";
import { registerSyncTask, unregisterSyncTask } from "../sync/task";
import { useLiveQuery } from "./useLiveQuery";

const TABLES = ["outbox", "sync_meta"] as const;
const ZERO = { pending: 0, dead: 0, lastSyncedAt: null, lastError: null };

type Durable = {
  pending: number;
  dead: number;
  lastSyncedAt: number | null;
  lastError: string | null;
};

// Read straight from the outbox table, so the number on screen can never lie.
async function selectStatus(db: SQLiteDatabase): Promise<Durable> {
  const [stats, syncedAt, lastError] = await Promise.all([
    outboxStats(db),
    getMeta(db, LAST_SYNCED_KEY),
    getMeta(db, LAST_ERROR_KEY),
  ]);
  return {
    ...stats,
    lastSyncedAt: syncedAt ? Number(syncedAt) : null,
    lastError,
  };
}

/** Status for display: Settings row and the timeline's subtle pending banner. */
export function useSyncStatus() {
  const { data } = useLiveQuery<Durable>(TABLES, selectStatus, ZERO);
  const { isInternetReachable, isConnected } = useNetworkState();
  const phase = useSyncStore((state) => state.phase);
  const last = useSyncStore((state) => state.last);
  const enabled = useSettingsStore((state) => state.sync.enabled);

  return {
    ...data,
    phase,
    last,
    enabled,
    // `undefined` = not known yet; only an explicit false means offline.
    online: isInternetReachable !== false && isConnected !== false,
    syncNow: kick,
  };
}

/**
 * The automatic triggers. Mounted ONCE, in the project layout — putting these
 * in every screen that shows status would multiply the listeners.
 */
export function useSyncTriggers() {
  const enabled = useSettingsStore((state) => state.sync.enabled);

  useEffect(() => {
    if (!enabled) {
      void unregisterSyncTask();
      return;
    }

    // Trigger 0: entering the journal / turning sync on.
    void kick();
    // Trigger 4: the periodic background task (a hint, not a schedule).
    void registerSyncTask();

    // Trigger 1: coming back to the foreground.
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void kick();
    });

    // Trigger 2: the network coming back. Edge-triggered: only on the
    // transition to reachable, not on every state event.
    let reachable: boolean | undefined;
    const network = addNetworkStateListener((state) => {
      const now = state.isInternetReachable ?? state.isConnected;
      if (now && reachable === false) void kick();
      reachable = now;
    });

    return () => {
      appState.remove();
      network.remove();
    };
  }, [enabled]);
}

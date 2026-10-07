import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { useSyncExternalStore } from "react";

import { queryClient } from "@/src/shared/providers/QueryProvider";

import { ApiError } from "../api/errors";
import { isSensitiveKey, isStoreKey, queryKeys } from "../utils/queryKeys";

const DAY = 24 * 60 * 60 * 1000;

let persistence: { restored: Promise<void>; unsubscribe: () => void } | null =
  null;

/**
 * Store-scoped defaults on the shared client. `setQueryDefaults` matches by
 * key prefix, so these apply to ["store", ...] only and never change another
 * project's behaviour. gcTime must be >= the persister's maxAge or queries are
 * garbage-collected (and so dropped from disk) before they can be restored.
 */
function applyStoreDefaults() {
  queryClient.setQueryDefaults(queryKeys.all, {
    staleTime: 60 * 1000,
    gcTime: DAY,
    retry: (failureCount, error) =>
      failureCount < 2 && (!(error instanceof ApiError) || error.isTransient),
  });
}

/**
 * Persists the store's slice of the shared cache to AsyncStorage so a cold
 * start (even in airplane mode) renders last-known data immediately.
 * Only successful ["store", ...] queries are written, and never PII
 * (["store","user",...]). Returns the restore promise; idempotent while
 * running. Pair with `stopStorePersistence()` on unmount.
 */
export function startStorePersistence(): Promise<void> {
  if (persistence) return persistence.restored;
  applyStoreDefaults();

  const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "store.query-cache",
    throttleTime: 1000,
  });

  const [unsubscribe, restored] = persistQueryClient({
    queryClient,
    persister,
    maxAge: DAY,
    // Bump when a cached shape changes so old blobs are discarded, not misread.
    buster: "store-v1",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        isStoreKey(query.queryKey) &&
        !isSensitiveKey(query.queryKey) &&
        query.state.status === "success",
      shouldDehydrateMutation: () => false,
    },
  });

  persistence = { restored: restored.catch(() => undefined), unsubscribe };
  return persistence.restored;
}

/**
 * The cache is shared app-wide: while subscribed, every query event in any
 * project re-dehydrates and writes the store blob. Stop listening once the
 * store is left; the next `startStorePersistence()` restores and resubscribes.
 */
export function stopStorePersistence() {
  persistence?.unsubscribe();
  persistence = null;
}

/**
 * Sign-out: drop every store query (orders, wishlist, profile) from memory;
 * the persister's next write then contains no user data. Catalogue data is
 * user-independent and kept so the sign-in screen's next session is instant.
 */
export function clearUserScopedCache() {
  queryClient.removeQueries({ queryKey: queryKeys.orders.all });
  queryClient.removeQueries({ queryKey: queryKeys.wishlist.all });
  queryClient.removeQueries({ queryKey: queryKeys.user.all });
}

export function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}

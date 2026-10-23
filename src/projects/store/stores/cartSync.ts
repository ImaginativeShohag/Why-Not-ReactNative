import { queryClient } from "@/src/shared/providers/QueryProvider";

import { fetchServerCart, updateServerCart } from "../api/cart.api";
import { productsQuery } from "../hooks/useProduct";
import { monitoring } from "../utils/monitoring";
import { toServerLines } from "./cartMath";
import { useCartStore } from "./cartStore";

const PUSH_DEBOUNCE_MS = 1500;

/** The signed-in user's server cart id, learned at sign-in or on first push. */
let serverCart: { userId: number; cartId: number | null } | null = null;
let stopSync: (() => void) | null = null;

/**
 * Sign-in reconciliation: local (possibly guest) cart + server cart → merged
 * cart (rule documented on `mergeCarts`), then pushed back to the server.
 * Server lines only carry ids, so products are resolved from the cached
 * catalogue — one request, not one per line.
 *
 * Best effort: a failure leaves the local cart untouched.
 */
export async function reconcileCartOnSignIn(userId: number) {
  try {
    await useCartStore.persist.rehydrate();
    const [server, products] = await Promise.all([
      fetchServerCart(userId),
      queryClient.ensureQueryData(productsQuery),
    ]);
    serverCart = { userId, cartId: server.cartId };
    const byId = new Map(products.map((p) => [p.id, p]));
    const merged = useCartStore
      .getState()
      .mergeWithServer(server.lines, (id) => byId.get(id));
    await updateServerCart(userId, server.cartId, toServerLines(merged));
  } catch (error) {
    monitoring.captureException(error, { area: "cart.reconcile" });
  }
}

async function pushCart(userId: number) {
  try {
    if (serverCart?.userId !== userId) {
      const { cartId } = await fetchServerCart(userId);
      serverCart = { userId, cartId };
    }
    await updateServerCart(
      userId,
      serverCart.cartId,
      toServerLines(useCartStore.getState().items),
    );
  } catch (error) {
    monitoring.captureException(error, { area: "cart.push" });
  }
}

/**
 * While signed in, pushes the bag to the server shortly after every change
 * (a purchase removing lines included). Without this the server keeps the
 * sign-in snapshot and the next merge brings bought or removed items back.
 * Returns the stop function.
 */
export function startCartAutoSync(userId: number) {
  stopCartAutoSync();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = useCartStore.subscribe((state, previous) => {
    if (state.items === previous.items) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      pushCart(userId);
    }, PUSH_DEBOUNCE_MS);
  });
  const stop = () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
    if (stopSync === stop) stopSync = null;
  };
  stopSync = stop;
  return stop;
}

/** Sign-out: stop pushing (a pending push is dropped) and forget the cart id. */
export function stopCartAutoSync() {
  stopSync?.();
  serverCart = null;
}

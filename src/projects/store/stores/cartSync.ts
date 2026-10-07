import { queryClient } from "@/src/shared/providers/QueryProvider";

import { fetchServerCart, updateServerCart } from "../api/cart.api";
import { productsQuery } from "../hooks/useProduct";
import { monitoring } from "../utils/monitoring";
import { toServerLines } from "./cartMath";
import { useCartStore } from "./cartStore";

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
    const byId = new Map(products.map((p) => [p.id, p]));
    const merged = useCartStore
      .getState()
      .mergeWithServer(server.lines, (id) => byId.get(id));
    await updateServerCart(userId, server.cartId, toServerLines(merged));
  } catch (error) {
    monitoring.captureException(error, { area: "cart.reconcile" });
  }
}

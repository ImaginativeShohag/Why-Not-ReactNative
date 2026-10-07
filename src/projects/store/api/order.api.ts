import { hasBackend } from "../constants/config";
import type { Order, PlaceOrderInput } from "../models/Order";
import type { Product } from "../models/Product";
import { toCents } from "../utils/money";
import { fetchCartHistory } from "./cart.api";
import { backendApi } from "./client";
import { mockServer } from "./mockServer";

/**
 * Places an order. The idempotency key is generated once per checkout and
 * persisted with it, so a double-tap, an automatic retry, or a relaunch after
 * a network drop all resolve to the SAME server order.
 */
export async function placeOrder(
  input: PlaceOrderInput,
  idempotencyKey: string,
): Promise<Order> {
  if (hasBackend()) {
    const { data } = await backendApi.post<Order>("/orders", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return data;
  }
  return mockServer.placeOrder(input, idempotencyKey);
}

export async function fetchOrder(id: string): Promise<Order> {
  if (hasBackend()) {
    const { data } = await backendApi.get<Order>(`/orders/${id}`);
    return data;
  }
  if (id.startsWith("legacy-")) {
    throw new Error("Legacy orders are resolved from the list cache.");
  }
  return mockServer.getOrder(id);
}

/**
 * Order history. Without a backend this is the on-device orders plus
 * FakeStoreAPI's cart history mapped into legacy orders.
 *
 * N+1 note: FakeStoreAPI carts carry only product ids, so enriching them
 * needs product data. Instead of one request per line (what the old
 * `useOrders` did) the caller passes a resolver backed by the cached product
 * list — one request total. A real API would return enriched lines.
 */
export async function fetchOrders(
  userId: number,
  resolveProduct: (id: number) => Product | undefined,
): Promise<Order[]> {
  if (hasBackend()) {
    const { data } = await backendApi.get<Order[]>("/orders", {
      params: { userId },
    });
    return data;
  }

  const [local, history] = await Promise.all([
    mockServer.listOrders(userId),
    fetchCartHistory(userId).catch(() => []),
  ]);

  const legacy: Order[] = history.map((cart) => {
    const lines = cart.products.flatMap((line) => {
      const product = resolveProduct(line.productId);
      if (!product) return [];
      return [
        {
          productId: product.id,
          title: product.title,
          image: product.image,
          unitPriceCents: toCents(product.price),
          quantity: line.quantity,
        },
      ];
    });
    const subtotalCents = lines.reduce(
      (sum, l) => sum + l.unitPriceCents * l.quantity,
      0,
    );
    return {
      id: `legacy-${cart.id}`,
      userId: cart.userId,
      createdAt: cart.date,
      status: "delivered",
      lines,
      currency: "USD",
      totals: {
        subtotalCents,
        discountCents: 0,
        shippingCents: 0,
        taxCents: 0,
        totalCents: subtotalCents,
      },
      legacy: true,
    };
  });

  return [...local, ...legacy].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

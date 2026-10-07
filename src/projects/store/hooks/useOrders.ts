import {
  type QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { fetchOrder, fetchOrders } from "../api/order.api";
import type { Order, OrderStatusFilter } from "../models/Order";
import { queryKeys } from "../utils/queryKeys";
import { productsQuery } from "./useProduct";

const ACTIVE = new Set<Order["status"]>([
  "pending_payment",
  "paid",
  "packed",
  "shipped",
]);

export const filterOrders = (orders: Order[], filter: OrderStatusFilter) =>
  filter === "all"
    ? orders
    : orders.filter((o) =>
        filter === "active" ? ACTIVE.has(o.status) : !ACTIVE.has(o.status),
      );

const ordersQuery = (queryClient: QueryClient, userId: number | undefined) =>
  queryOptions({
    queryKey: queryKeys.orders.list(userId ?? 0),
    queryFn: async () => {
      // One catalogue request replaces the old per-line N+1 enrichment.
      const products = await queryClient.ensureQueryData(productsQuery);
      const byId = new Map(products.map((p) => [p.id, p]));
      return fetchOrders(userId ?? 0, (id) => byId.get(id));
    },
  });

export function useOrders(userId: number | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    ...ordersQuery(queryClient, userId),
    enabled: userId !== undefined,
  });
}

/**
 * Order detail — the push/deep-link target. Polls while the order is still
 * moving so the status timeline is live; the server is the source of truth.
 */
export function useOrder(id: string, userId: number | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    enabled: id.length > 0,
    queryFn: async () => {
      if (id.startsWith("legacy-")) {
        const list = await queryClient.ensureQueryData(
          ordersQuery(queryClient, userId),
        );
        const found = list?.find((o) => o.id === id);
        if (!found) throw new Error("Order not found.");
        return found;
      }
      return fetchOrder(id);
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE.has(status) ? 30 * 1000 : false;
    },
  });
}

import { STORE_PREFIX } from "../navigation/linkRoutes";

/**
 * Push payload contract (what the backend sends in `data`):
 *
 *   { project: "store", type: "order",   orderId: "10482" }
 *   { project: "store", type: "product", productId: 42 }
 *   { project: "store", type: "promo" }
 *
 * `project` is mandatory: other projects in this app (the journal) post
 * local notifications too, and the store must not route those.
 */
export const ORDER_CATEGORY_ID = "store_order_update";

export const NOTIFICATION_ACTIONS = {
  track: "store_track",
  reorder: "store_reorder",
} as const;

// Mirrors `Notifications.DEFAULT_ACTION_IDENTIFIER` (a plain tap), kept as a
// literal so this module stays pure and unit-testable without the native module.
export const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

export type StoreNotificationData =
  | { type: "order"; orderId: string }
  | { type: "product"; productId: number }
  | { type: "promo" };

export function parseNotificationData(
  data: unknown,
): StoreNotificationData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.project !== "store") return null;

  if (d.type === "order") {
    const orderId =
      typeof d.orderId === "string" || typeof d.orderId === "number"
        ? String(d.orderId)
        : null;
    return orderId && /^[A-Za-z0-9-]+$/.test(orderId)
      ? { type: "order", orderId }
      : null;
  }
  if (d.type === "product") {
    const productId = Number(d.productId);
    return Number.isInteger(productId) && productId > 0
      ? { type: "product", productId }
      : null;
  }
  if (d.type === "promo") return { type: "promo" };
  return null;
}

/**
 * Notification (+ which action button was pressed) → store href. Never
 * trust a raw path from the payload: routes are built here from typed,
 * validated ids, so a malicious push can't navigate anywhere arbitrary.
 */
export function hrefFromNotification(
  data: unknown,
  actionIdentifier: string = DEFAULT_ACTION,
): string | null {
  const parsed = parseNotificationData(data);
  if (!parsed) return null;

  switch (parsed.type) {
    case "order":
      if (actionIdentifier === NOTIFICATION_ACTIONS.reorder) {
        return `${STORE_PREFIX}/order/${parsed.orderId}?reorder=1`;
      }
      return `${STORE_PREFIX}/order/${parsed.orderId}`;
    case "product":
      return `${STORE_PREFIX}/product/${parsed.productId}`;
    case "promo":
      return STORE_PREFIX;
  }
}

import type { Address } from "./Address";

/**
 * Server-owned order lifecycle. The client never advances this itself — it
 * reads it back (on relaunch, on push, on focus). That is what makes "app
 * killed after charge" recoverable.
 */
export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "paid"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderLine {
  productId: number;
  title: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface Order {
  id: string;
  userId: number;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  totals: OrderTotals;
  currency: string;
  shippingOptionId?: string;
  address?: Address;
  promoCode?: string;
  /** True for orders imported from FakeStoreAPI cart history. */
  legacy?: boolean;
}

export interface PlaceOrderInput {
  userId: number;
  lines: OrderLine[];
  totals: OrderTotals;
  currency: string;
  shippingOptionId: string;
  address: Address;
  promoCode?: string;
}

export type OrderStatusFilter = "all" | "active" | "completed";

export const ORDER_TIMELINE: OrderStatus[] = [
  "paid",
  "packed",
  "shipped",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  paid: "Placed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

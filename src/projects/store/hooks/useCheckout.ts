import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import type { Href } from "expo-router";
import { useEffect } from "react";

import { fetchOrder, placeOrder } from "../api/order.api";
import { useSession } from "../auth/useSession";
import {
  canEnter,
  type CheckoutStep,
  resumeStep,
} from "../checkout/checkoutMachine";
import { useCheckoutStore } from "../checkout/checkoutStore";
import { computeTotals } from "../checkout/pricing";
import { storeConfig } from "../constants/config";
import type { Order, OrderLine } from "../models/Order";
import { subtotalCents } from "../stores/cartMath";
import { useCartStore } from "../stores/cartStore";
import { track } from "../utils/analytics";
import { toCents } from "../utils/money";
import { monitoring } from "../utils/monitoring";
import { queryKeys } from "../utils/queryKeys";

const PAID_STATES = new Set<Order["status"]>([
  "paid",
  "packed",
  "shipped",
  "delivered",
]);

export const isPaid = (order: Order) => PAID_STATES.has(order.status);

/** Everything the checkout screens need, derived from cart + machine. */
export function useCheckout() {
  const items = useCartStore((s) => s.items);
  const checkout = useCheckoutStore();
  const subtotal = subtotalCents(items);
  const totals = computeTotals(subtotal, {
    shippingOptionId: checkout.shippingOptionId,
    promoCode: checkout.promoCode,
    country: checkout.address?.country,
  });
  return { items, checkout, send: checkout.send, subtotal, totals };
}

/** Enters checkout: resumes an in-progress attempt or starts one with a fresh key. */
export function useStartCheckout() {
  const send = useCheckoutStore((s) => s.send);
  return () => {
    send({ type: "START", idempotencyKey: Crypto.randomUUID() });
  };
}

/**
 * Places (or re-fetches) the server order for this checkout attempt. The
 * persisted idempotency key means a double-tap, a retry, or a relaunch mid
 * request all resolve to the same order.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { items, checkout, send, totals } = useCheckout();

  return useMutation({
    mutationKey: ["store", "placeOrder"],
    mutationFn: async (): Promise<Order> => {
      if (!user) throw new Error("Sign in to place an order.");
      if (
        !checkout.idempotencyKey ||
        !checkout.address ||
        !checkout.shippingOptionId
      ) {
        throw new Error("Checkout is incomplete.");
      }
      if (checkout.orderId) return fetchOrder(checkout.orderId);
      const lines: OrderLine[] = items.map((i) => ({
        productId: i.id,
        title: i.title,
        image: i.image,
        unitPriceCents: toCents(i.price),
        quantity: i.quantity,
      }));
      return monitoring.trace("placeOrder", "checkout", () =>
        placeOrder(
          {
            userId: user.id,
            lines,
            totals,
            currency: storeConfig.currency,
            shippingOptionId: checkout.shippingOptionId ?? "standard",
            address: checkout.address!,
            promoCode: checkout.promoCode ?? undefined,
          },
          checkout.idempotencyKey!,
        ),
      );
    },
    onSuccess: (order) => {
      // Review renders a locked checkout from this, not from the live bag.
      queryClient.setQueryData(queryKeys.orders.detail(order.id), order);
      if (!checkout.orderId) send({ type: "ORDER_PLACED", orderId: order.id });
    },
  });
}

/**
 * Finalises a paid order locally: removes what it bought from the bag (not
 * the whole bag: items added while it awaited payment stay), closes the
 * machine.
 */
export function useCompleteCheckout() {
  const queryClient = useQueryClient();
  const removePurchased = useCartStore((s) => s.removePurchased);
  const send = useCheckoutStore((s) => s.send);
  return (order: Order, paymentMethod: string) => {
    queryClient.setQueryData(queryKeys.orders.detail(order.id), order);
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    removePurchased(order.lines);
    send({ type: "COMPLETED" });
    track("purchase", {
      order_id: order.id,
      value_cents: order.totals.totalCents,
      currency: order.currency,
      payment_method: paymentMethod,
    });
  };
}

/**
 * Relaunch reconciliation (M6 checkpoint): if the app died after the order
 * was placed — possibly after the card was charged — ask the SERVER what
 * happened instead of trusting whatever the client last believed.
 */
export function useReconcilePendingCheckout(enabled: boolean) {
  const orderId = useCheckoutStore((s) => s.orderId);
  const phase = useCheckoutStore((s) => s.phase);
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const send = useCheckoutStore((s) => s.send);
  const complete = useCompleteCheckout();

  useEffect(() => {
    if (!enabled || !orderId || phase !== "awaiting_payment") return;
    let cancelled = false;
    fetchOrder(orderId)
      .then((order) => {
        if (cancelled) return;
        if (isPaid(order)) complete(order, paymentMethod ?? "unknown");
        else if (order.status === "payment_failed") {
          send({
            type: "PAYMENT_FAILED",
            message: "Your last payment didn't go through.",
          });
        }
      })
      .catch((error) =>
        monitoring.captureException(error, { area: "checkout.reconcile" }),
      );
    return () => {
      cancelled = true;
    };
  }, [enabled, orderId, phase, paymentMethod, send, complete]);
}

export const CHECKOUT_STEP_LABELS = [
  "Address",
  "Shipping",
  "Payment",
  "Review",
];

/**
 * Per-screen guard: a checkout step can be opened by a deep link, a
 * replayed intent, or state restored after a force-quit. It redirects to the
 * furthest valid step instead of rendering a step whose prerequisites are
 * missing. Returns the href to redirect to, or null to render.
 */
export function useCheckoutGuard(step: CheckoutStep): Href | null {
  const state = useCheckoutStore();
  const itemCount = useCartStore((s) => s.items.length);
  const start = useStartCheckout();

  useEffect(() => {
    if (!state.idempotencyKey) start();
  }, [state.idempotencyKey, start]);

  useEffect(() => {
    track("checkout_step", { step });
  }, [step]);

  // Just completed: the screen is being dismissed to the order — don't fight it.
  if (state.phase === "completed") return null;
  if (itemCount === 0 && state.phase === "editing")
    return "/projects/store/bag";
  if (!state.idempotencyKey) return null; // START is about to run.
  if (!canEnter(state, step))
    return `/projects/store/checkout/${resumeStep(state)}`;
  return null;
}

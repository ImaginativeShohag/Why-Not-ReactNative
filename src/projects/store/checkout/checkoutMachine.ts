import type { Address } from "../models/Address";
import type { PaymentMethodKind } from "../models/Payment";
import { SHIPPING_OPTIONS } from "./pricing";
import { isValidAddress } from "./validation";

/**
 * Explicit, persisted checkout state. Each screen renders from this and sends
 * events; nothing about "where am I in checkout" lives in navigation state or
 * component state. That is what makes the flow interruption-safe: background
 * or force-quit at any step and the same state is rehydrated on relaunch.
 *
 *   address ──► shipping ──► payment ──► review ──(place)──► awaiting_payment ──► completed
 *
 * Once an order is placed the earlier steps are locked: the server order was
 * priced from them. Changing anything means `RESET` and a new idempotency key.
 */
export const CHECKOUT_STEPS = [
  "address",
  "shipping",
  "payment",
  "review",
] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export type CheckoutPhase = "editing" | "awaiting_payment" | "completed";

export type CheckoutState = {
  step: CheckoutStep;
  phase: CheckoutPhase;
  address: Address | null;
  saveAddress: boolean;
  shippingOptionId: string | null;
  promoCode: string | null;
  paymentMethod: PaymentMethodKind | null;
  /** One key per checkout attempt; reused for every place-order retry. */
  idempotencyKey: string | null;
  orderId: string | null;
  lastError: string | null;
};

export type CheckoutEvent =
  | { type: "START"; idempotencyKey: string }
  | { type: "SUBMIT_ADDRESS"; address: Address; saveAddress?: boolean }
  | { type: "SELECT_SHIPPING"; optionId: string }
  | { type: "CONFIRM_SHIPPING" }
  | { type: "APPLY_PROMO"; code: string | null }
  | { type: "SELECT_PAYMENT"; method: PaymentMethodKind }
  | { type: "GO_TO"; step: CheckoutStep }
  | { type: "ORDER_PLACED"; orderId: string }
  | { type: "PAYMENT_FAILED"; message: string }
  | { type: "COMPLETED" }
  | { type: "RESET" };

export const initialCheckoutState: CheckoutState = {
  step: "address",
  phase: "editing",
  address: null,
  saveAddress: true,
  shippingOptionId: null,
  promoCode: null,
  paymentMethod: null,
  idempotencyKey: null,
  orderId: null,
  lastError: null,
};

export const isLocked = (state: CheckoutState) =>
  state.orderId !== null && state.phase !== "completed";

const hasShipping = (state: CheckoutState) =>
  SHIPPING_OPTIONS.some((o) => o.id === state.shippingOptionId);

/** Whether a step's prerequisites are satisfied. */
export function canEnter(state: CheckoutState, step: CheckoutStep): boolean {
  if (state.phase === "completed") return false;
  const target = CHECKOUT_STEPS.indexOf(step);
  if (isLocked(state)) return step === "review";
  if (target >= 1 && !isValidAddress(state.address)) return false;
  if (target >= 2 && !hasShipping(state)) return false;
  if (target >= 3 && !state.paymentMethod) return false;
  return true;
}

/** The furthest step the user can resume at. */
export function resumeStep(state: CheckoutState): CheckoutStep {
  for (let i = CHECKOUT_STEPS.length - 1; i >= 0; i--) {
    if (canEnter(state, CHECKOUT_STEPS[i])) return CHECKOUT_STEPS[i];
  }
  return "address";
}

export function transition(
  state: CheckoutState,
  event: CheckoutEvent,
): CheckoutState {
  switch (event.type) {
    case "START":
      // Resume an in-progress checkout; only a finished one starts fresh.
      if (state.idempotencyKey && state.phase !== "completed") return state;
      return {
        ...initialCheckoutState,
        // Keep a saved address for next time.
        address: state.saveAddress ? state.address : null,
        saveAddress: state.saveAddress,
        // A code applied in the bag before checkout started carries over.
        // COMPLETED already cleared the last order's code, so any code here
        // was applied after it and belongs to this attempt.
        promoCode: state.promoCode,
        idempotencyKey: event.idempotencyKey,
      };

    case "SUBMIT_ADDRESS":
      if (isLocked(state) || !isValidAddress(event.address)) return state;
      return {
        ...state,
        address: event.address,
        saveAddress: event.saveAddress ?? state.saveAddress,
        step: "shipping",
        lastError: null,
      };

    case "SELECT_SHIPPING":
      if (isLocked(state)) return state;
      if (!SHIPPING_OPTIONS.some((o) => o.id === event.optionId)) return state;
      return { ...state, shippingOptionId: event.optionId };

    case "CONFIRM_SHIPPING":
      if (!canEnter(state, "payment")) return state;
      return { ...state, step: "payment" };

    case "APPLY_PROMO":
      if (isLocked(state)) return state;
      return {
        ...state,
        promoCode: event.code ? event.code.trim().toUpperCase() : null,
      };

    case "SELECT_PAYMENT":
      if (isLocked(state) || !canEnter(state, "payment")) return state;
      return { ...state, paymentMethod: event.method, step: "review" };

    case "GO_TO":
      if (!canEnter(state, event.step)) return state;
      return { ...state, step: event.step };

    case "ORDER_PLACED":
      // Gate on Review's prerequisites, not on `step`: the screen can be
      // reached by resuming from the bag while `step` still says where the
      // user last edited. Dropping this event would keep the old idempotency
      // key alive, and the next checkout would replay this order.
      if (state.orderId || state.phase !== "editing") return state;
      if (!canEnter(state, "review")) return state;
      return {
        ...state,
        step: "review",
        orderId: event.orderId,
        phase: "awaiting_payment",
        lastError: null,
      };

    case "PAYMENT_FAILED":
      return { ...state, lastError: event.message };

    case "COMPLETED":
      if (!state.orderId) return state;
      return { ...state, phase: "completed", promoCode: null, lastError: null };

    case "RESET":
      return {
        ...initialCheckoutState,
        address: state.saveAddress ? state.address : null,
        saveAddress: state.saveAddress,
      };
  }
}

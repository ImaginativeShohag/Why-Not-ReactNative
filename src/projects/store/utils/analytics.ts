/**
 * Typed analytics facade. Screens call `track("add_to_cart", {...})`; the
 * catalogue below is the contract, so a misspelt event or a missing property
 * is a compile error rather than a silently broken dashboard. Swapping
 * vendors (PostHog, Amplitude, Firebase) is a one-file change: implement
 * `AnalyticsSink` and call `setAnalyticsSink` at startup.
 *
 * Rule: no PII in event properties — ids and amounts, never names/emails.
 */
export type AnalyticsEvents = {
  view_product: { product_id: number; price_cents: number; category: string };
  add_to_cart: { product_id: number; price_cents: number; quantity: number };
  remove_from_cart: { product_id: number };
  view_cart: { item_count: number; value_cents: number };
  begin_checkout: { item_count: number; value_cents: number };
  checkout_step: { step: "address" | "shipping" | "payment" | "review" };
  apply_promo: { code: string; valid: boolean };
  purchase: {
    order_id: string;
    value_cents: number;
    currency: string;
    payment_method: string;
  };
  payment_failed: { order_id: string; reason: string };
  search: { term_length: number; result_count: number };
  wishlist_toggle: { product_id: number; added: boolean };
  sign_in: { method: "password" | "apple" | "google" };
  sign_up: { method: "password" };
  sign_out: Record<string, never>;
  push_permission: { granted: boolean };
  notification_opened: { type: string; action: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export interface AnalyticsSink {
  track: (name: string, properties: Record<string, unknown>) => void;
  identify: (userId: string | null) => void;
  screen?: (name: string) => void;
}

const consoleSink: AnalyticsSink = {
  track: (name, properties) => {
    if (__DEV__) console.log(`[analytics] ${name}`, properties);
  },
  identify: (userId) => {
    if (__DEV__) console.log("[analytics] identify", userId);
  },
  screen: (name) => {
    if (__DEV__) console.log("[analytics] screen", name);
  },
};

let sink: AnalyticsSink = consoleSink;

export const setAnalyticsSink = (next: AnalyticsSink) => {
  sink = next;
};

export function track<E extends AnalyticsEventName>(
  name: E,
  properties: AnalyticsEvents[E],
) {
  try {
    sink.track(name, properties);
  } catch {
    // Analytics must never break a user flow.
  }
}

export const identify = (userId: number | null) => {
  try {
    sink.identify(userId === null ? null : String(userId));
  } catch {
    // ignore
  }
};

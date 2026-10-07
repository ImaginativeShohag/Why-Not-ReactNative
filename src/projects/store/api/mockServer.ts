import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import type { Order, OrderStatus, PlaceOrderInput } from "../models/Order";
import type { SimulatedOutcome } from "../models/Payment";
import { ApiError } from "./errors";

/**
 * A tiny on-device stand-in for the companion backend, used ONLY when
 * `EXPO_PUBLIC_STORE_BACKEND_URL` is empty. It is deliberately shaped like a
 * server — idempotency keys, server-owned order status, a webhook-style
 * payment confirmation — so the client code paths are the production ones.
 *
 * It is persisted, so "kill the app after paying, relaunch" behaves the way
 * a real server would: the order state survives the client.
 */
type ServerState = {
  orders: Order[];
  /** idempotency key → order id */
  idempotency: Record<string, string>;
  /** payment intent id → order id */
  intents: Record<string, string>;
  wishlist: Record<string, number[]>;
  /** status transition timestamps for the fake fulfilment pipeline */
  paidAt: Record<string, number>;
};

const STORAGE_KEY = "store.mock-server.v1";
const LATENCY_MS = 450;

const EMPTY: ServerState = {
  orders: [],
  idempotency: {},
  intents: {},
  wishlist: {},
  paidAt: {},
};

let cache: ServerState | null = null;

export const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function load(): Promise<ServerState> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  cache = raw
    ? { ...EMPTY, ...(JSON.parse(raw) as ServerState) }
    : { ...EMPTY };
  return cache;
}

async function save(state: ServerState) {
  cache = state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Fake fulfilment pipeline: a paid order advances every ~2 minutes, so the
// order-detail screen has a "live" status to poll.
const FULFILMENT: OrderStatus[] = ["paid", "packed", "shipped", "delivered"];
const STEP_MS = 2 * 60 * 1000;

const withLiveStatus = (state: ServerState, order: Order): Order => {
  const paidAt = state.paidAt[order.id];
  if (!paidAt || !FULFILMENT.includes(order.status)) return order;
  const steps = Math.floor((Date.now() - paidAt) / STEP_MS);
  const status = FULFILMENT[Math.min(FULFILMENT.length - 1, steps)];
  return { ...order, status };
};

export const mockServer = {
  async placeOrder(input: PlaceOrderInput, idempotencyKey: string) {
    await delay();
    const state = await load();
    // Same key → same order. A double-tap or a retry after a network drop
    // can never create a second order.
    const existingId = state.idempotency[idempotencyKey];
    if (existingId) {
      const existing = state.orders.find((o) => o.id === existingId);
      if (existing) return withLiveStatus(state, existing);
    }
    const order: Order = {
      ...input,
      id: String(10000 + state.orders.length + Math.floor(Math.random() * 90)),
      createdAt: new Date().toISOString(),
      status: "pending_payment",
    };
    await save({
      ...state,
      orders: [order, ...state.orders],
      idempotency: { ...state.idempotency, [idempotencyKey]: order.id },
    });
    return order;
  },

  async listOrders(userId: number) {
    await delay(250);
    const state = await load();
    return state.orders
      .filter((o) => o.userId === userId)
      .map((o) => withLiveStatus(state, o));
  },

  async getOrder(id: string) {
    await delay(250);
    const state = await load();
    const order = state.orders.find((o) => o.id === id);
    if (!order) {
      throw new ApiError({
        kind: "notFound",
        status: 404,
        message: "Order not found.",
      });
    }
    return withLiveStatus(state, order);
  },

  async createPaymentIntent(orderId: string) {
    await delay();
    const state = await load();
    const paymentIntentId = `pi_sim_${Crypto.randomUUID().slice(0, 12)}`;
    await save({
      ...state,
      intents: { ...state.intents, [paymentIntentId]: orderId },
    });
    return { paymentIntentId, clientSecret: `${paymentIntentId}_secret_sim` };
  },

  /**
   * Stands in for "processor charges the card, then calls our webhook". The
   * network_drop outcome charges successfully but fails the response — the
   * exact case where only server reconciliation tells the truth.
   */
  async confirmSimulatedPayment(
    paymentIntentId: string,
    outcome: SimulatedOutcome,
  ) {
    await delay(900);
    const state = await load();
    const orderId = state.intents[paymentIntentId];
    if (!orderId) {
      throw new ApiError({
        kind: "notFound",
        status: 404,
        message: "Unknown payment.",
      });
    }
    const status: OrderStatus =
      outcome === "decline" ? "payment_failed" : "paid";
    await save({
      ...state,
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o,
      ),
      paidAt:
        status === "paid"
          ? { ...state.paidAt, [orderId]: Date.now() }
          : state.paidAt,
    });
    if (outcome === "decline") {
      throw new ApiError({
        kind: "validation",
        status: 402,
        code: "card_declined",
        message: "Your card was declined. Try another payment method.",
      });
    }
    if (outcome === "network_drop") {
      throw new ApiError({
        kind: "network",
        message: "Connection lost while confirming payment.",
      });
    }
  },

  async getWishlist(owner: string) {
    await delay(200);
    const state = await load();
    return state.wishlist[owner] ?? [];
  },

  async setWishlisted(
    owner: string,
    productId: number,
    wishlisted: boolean,
    fail: boolean,
  ) {
    await delay();
    if (fail) {
      throw new ApiError({
        kind: "server",
        status: 500,
        message: "Couldn't update your wishlist (dev menu).",
      });
    }
    const state = await load();
    const current = new Set(state.wishlist[owner] ?? []);
    if (wishlisted) current.add(productId);
    else current.delete(productId);
    await save({
      ...state,
      wishlist: { ...state.wishlist, [owner]: [...current] },
    });
    return [...current];
  },
};

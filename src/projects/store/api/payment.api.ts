import { env } from "@/src/shared/constants/env";

import { hasBackend } from "../constants/config";
import type { PaymentIntent, SimulatedOutcome } from "../models/Payment";
import { backendApi } from "./client";
import { mockServer } from "./mockServer";

/**
 * Real card payments need BOTH a publishable key (client) and a backend that
 * creates PaymentIntents with the secret key (server). Missing either → the
 * checkout offers the clearly-labelled simulated processor instead.
 */
export const isStripeConfigured = () =>
  env.stripePublishableKey.length > 0 && hasBackend();

/**
 * Server-created PaymentIntent for an existing order. The amount is computed
 * server-side from the order — the client never tells the server what to charge.
 */
export async function createPaymentIntent(
  orderId: string,
): Promise<PaymentIntent> {
  if (hasBackend()) {
    const { data } = await backendApi.post<PaymentIntent>("/payments/intents", {
      orderId,
    });
    return data;
  }
  return mockServer.createPaymentIntent(orderId);
}

export async function confirmSimulatedPayment(
  paymentIntentId: string,
  outcome: SimulatedOutcome,
): Promise<void> {
  return mockServer.confirmSimulatedPayment(paymentIntentId, outcome);
}

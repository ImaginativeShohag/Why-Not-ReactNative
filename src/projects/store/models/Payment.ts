export type PaymentMethodKind = "stripe" | "simulated";

/** Server-created intent. The client secret is single-use and never persisted. */
export interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  customerId?: string;
  ephemeralKey?: string;
}

/** Dev-only outcomes for the simulated processor. */
export type SimulatedOutcome = "succeed" | "decline" | "network_drop";

export type PaymentResult =
  | { status: "succeeded" }
  | { status: "cancelled" }
  | { status: "failed"; message: string };

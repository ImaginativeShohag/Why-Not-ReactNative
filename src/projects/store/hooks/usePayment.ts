import { PaymentSheetError, useStripe } from "@stripe/stripe-react-native";

import { useCallback } from "react";

import { env } from "@/src/shared/constants/env";

import { getErrorMessage } from "../api/errors";
import {
  confirmSimulatedPayment,
  createPaymentIntent,
} from "../api/payment.api";
import { storeConfig } from "../constants/config";
import type { Order } from "../models/Order";
import type { PaymentMethodKind, PaymentResult } from "../models/Payment";
import { getDevFlags } from "../utils/devFlags";
import { monitoring } from "../utils/monitoring";

/**
 * One `pay(order)` for both processors. The result only says what the
 * CLIENT saw; the caller always re-reads the order from the server before
 * declaring success or failure (a charge can succeed while the response is
 * lost). Physical goods → external payment is allowed by both stores; digital
 * content would require in-app purchase instead.
 */
export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const pay = useCallback(
    async (order: Order, method: PaymentMethodKind): Promise<PaymentResult> => {
      try {
        const intent = await createPaymentIntent(order.id);

        if (method === "simulated") {
          await confirmSimulatedPayment(
            intent.paymentIntentId,
            getDevFlags().simulatedPaymentOutcome,
          );
          return { status: "succeeded" };
        }

        const customer =
          intent.customerId && intent.ephemeralKey
            ? {
                customerId: intent.customerId,
                customerEphemeralKeySecret: intent.ephemeralKey,
              }
            : {};

        const init = await initPaymentSheet({
          merchantDisplayName: storeConfig.merchantDisplayName,
          paymentIntentClientSecret: intent.clientSecret,
          ...customer,
          applePay: { merchantCountryCode: storeConfig.merchantCountryCode },
          googlePay: {
            merchantCountryCode: storeConfig.merchantCountryCode,
            currencyCode: storeConfig.currency,
            testEnv: env.variant !== "production",
          },
          // 3DS / bank redirects return here. Stripe consumes this URL itself.
          returnURL: `${storeConfig.urlScheme}://stripe-redirect`,
          allowsDelayedPaymentMethods: false,
          defaultBillingDetails: order.address
            ? {
                name: order.address.fullName,
                email: order.address.email || undefined,
                address: {
                  line1: order.address.line1,
                  line2: order.address.line2 || undefined,
                  city: order.address.city,
                  postalCode: order.address.postalCode,
                  country: order.address.country,
                  state: order.address.region || undefined,
                },
              }
            : undefined,
        });
        if (init.error) {
          return { status: "failed", message: init.error.message };
        }

        // The sheet runs the SCA/3DS challenge itself when the bank asks.
        const { error } = await presentPaymentSheet();
        if (error) {
          if (error.code === PaymentSheetError.Canceled)
            return { status: "cancelled" };
          return { status: "failed", message: error.message };
        }
        return { status: "succeeded" };
      } catch (error) {
        monitoring.captureException(error, {
          area: "payment",
          orderId: order.id,
        });
        return {
          status: "failed",
          message: getErrorMessage(error) ?? "Payment failed.",
        };
      }
    },
    [initPaymentSheet, presentPaymentSheet],
  );

  return { pay };
}

import { Redirect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { isStripeConfigured } from "@/src/projects/store/api/payment.api";
import CheckoutScaffold from "@/src/projects/store/components/checkout/CheckoutScaffold";
import OptionRow from "@/src/projects/store/components/checkout/OptionRow";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import {
  CHECKOUT_STEP_LABELS,
  useCheckout,
  useCheckoutGuard,
} from "@/src/projects/store/hooks/useCheckout";
import type { PaymentMethodKind } from "@/src/projects/store/models/Payment";
import { useDevFlags } from "@/src/projects/store/utils/devFlags";
import { env } from "@/src/shared/constants/env";
import { storeColors } from "@/src/projects/store/constants/theme";

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const redirect = useCheckoutGuard("payment");
  const { checkout, send } = useCheckout();
  const outcome = useDevFlags((s) => s.simulatedPaymentOutcome);
  const stripeReady = isStripeConfigured();
  // The simulated processor exists so the flow is exercisable without keys;
  // it is never offered in a production build that has Stripe configured.
  const simulatedAllowed = !stripeReady || env.variant !== "production";

  const [method, setMethod] = useState<PaymentMethodKind | null>(
    checkout.paymentMethod ?? (stripeReady ? "stripe" : "simulated"),
  );

  if (redirect) return <Redirect href={redirect} />;

  const handleContinue = () => {
    if (!method) return;
    send({ type: "SELECT_PAYMENT", method });
    router.push("/projects/store/checkout/review");
  };

  return (
    <CheckoutScaffold
      stepLabels={CHECKOUT_STEP_LABELS}
      currentIndex={2}
      keyboardOffset={headerHeight}
      footer={
        <PrimaryButton
          title="Review order"
          onPress={handleContinue}
          disabled={!method}
          testID="checkout-payment-continue"
        />
      }
    >
      <SectionHeader title="Pay with" />
      <OptionRow
        title="Card, Apple Pay or Google Pay"
        subtitle={
          stripeReady
            ? "Secure checkout by Stripe. You'll confirm on the next step."
            : "Unavailable: needs EXPO_PUBLIC_STRIPE_KEY and a payments backend"
        }
        selected={method === "stripe"}
        disabled={!stripeReady}
        onPress={() => setMethod("stripe")}
        testID="payment-stripe"
      />
      {simulatedAllowed ? (
        <OptionRow
          title="Simulated payment (test only)"
          subtitle={`No money moves. Outcome: ${outcome} — change it in Account › Developer.`}
          selected={method === "simulated"}
          onPress={() => setMethod("simulated")}
          testID="payment-simulated"
        />
      ) : null}
      <Text style={styles.note}>
        Physical goods can use external payments on both stores; digital content
        would require in-app purchase instead.
      </Text>
    </CheckoutScaffold>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: storeColors.muted, marginTop: 8 },
});

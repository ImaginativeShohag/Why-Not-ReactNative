import { Redirect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { StyleSheet, Text } from "react-native";

import {
  SHIPPING_OPTIONS,
  computeTotals,
  totalsRows,
} from "@/src/projects/store/checkout/pricing";
import CheckoutScaffold from "@/src/projects/store/components/checkout/CheckoutScaffold";
import OptionRow from "@/src/projects/store/components/checkout/OptionRow";
import TotalsView from "@/src/projects/store/components/checkout/TotalsView";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import {
  CHECKOUT_STEP_LABELS,
  useCheckout,
  useCheckoutGuard,
} from "@/src/projects/store/hooks/useCheckout";
import { formatMoney } from "@/src/projects/store/utils/money";
import { storeColors } from "@/src/projects/store/constants/theme";

export default function CheckoutShippingScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const redirect = useCheckoutGuard("shipping");
  const { checkout, send, subtotal, totals } = useCheckout();

  if (redirect) return <Redirect href={redirect} />;

  const handleContinue = () => {
    send({ type: "CONFIRM_SHIPPING" });
    router.push("/projects/store/checkout/payment");
  };

  return (
    <CheckoutScaffold
      stepLabels={CHECKOUT_STEP_LABELS}
      currentIndex={1}
      keyboardOffset={headerHeight}
      footer={
        <PrimaryButton
          title="Continue to payment"
          onPress={handleContinue}
          disabled={!checkout.shippingOptionId}
          testID="checkout-shipping-continue"
        />
      }
    >
      <SectionHeader title="Delivery speed" />
      {SHIPPING_OPTIONS.map((option) => {
        // Preview what this option would cost *for this basket* (free-over rule).
        const preview = computeTotals(subtotal, {
          shippingOptionId: option.id,
          promoCode: checkout.promoCode,
          country: checkout.address?.country,
        });
        return (
          <OptionRow
            key={option.id}
            title={option.label}
            subtitle={option.eta}
            trailing={
              preview.shippingCents === 0
                ? "Free"
                : formatMoney(preview.shippingCents)
            }
            selected={checkout.shippingOptionId === option.id}
            onPress={() =>
              send({ type: "SELECT_SHIPPING", optionId: option.id })
            }
            testID={`shipping-${option.id}`}
          />
        );
      })}
      <Text style={styles.note}>
        Standard shipping is free on orders over {formatMoney(10000)}.
      </Text>

      <SectionHeader title="Summary" />
      <TotalsView rows={totalsRows(totals, { taxLabel: "Estimated tax" })} />
    </CheckoutScaffold>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: storeColors.muted },
});

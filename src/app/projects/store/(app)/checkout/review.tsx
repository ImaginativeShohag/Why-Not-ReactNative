import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { fetchOrder } from "@/src/projects/store/api/order.api";
import { isLocked } from "@/src/projects/store/checkout/checkoutMachine";
import {
  formatAddressLines,
  SHIPPING_OPTIONS,
  totalsRows,
} from "@/src/projects/store/checkout/pricing";
import CheckoutScaffold from "@/src/projects/store/components/checkout/CheckoutScaffold";
import TotalsView from "@/src/projects/store/components/checkout/TotalsView";
import OrderLineRow from "@/src/projects/store/components/order/OrderLineRow";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import {
  CHECKOUT_STEP_LABELS,
  isPaid,
  useCheckout,
  useCheckoutGuard,
  useCompleteCheckout,
  usePlaceOrder,
  useStartCheckout,
} from "@/src/projects/store/hooks/useCheckout";
import { usePayment } from "@/src/projects/store/hooks/usePayment";
import {
  askForOrderUpdates,
  getPushPermission,
} from "@/src/projects/store/notifications/registerForPush";
import { lineTotalCents } from "@/src/projects/store/stores/cartMath";
import { track } from "@/src/projects/store/utils/analytics";
import { formatMoney } from "@/src/projects/store/utils/money";
import { queryKeys } from "@/src/projects/store/utils/queryKeys";
import { storeColors } from "@/src/projects/store/constants/theme";

/** The only place an order is placed. */
export default function CheckoutReviewScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const redirect = useCheckoutGuard("review");
  const { items, checkout, send, totals } = useCheckout();
  const placeOrder = usePlaceOrder();
  const complete = useCompleteCheckout();
  const startCheckout = useStartCheckout();
  const { pay } = usePayment();
  const [paying, setPaying] = useState(false);

  if (redirect) return <Redirect href={redirect} />;

  const locked = isLocked(checkout);
  const shipping = SHIPPING_OPTIONS.find(
    (o) => o.id === checkout.shippingOptionId,
  );
  const busy = placeOrder.isPending || paying;

  const offerPushAfterPurchase = async () => {
    // The moment the user most wants updates is right after buying: ask then,
    // with a rationale, instead of on first launch.
    if ((await getPushPermission()) !== "undetermined") return;
    askForOrderUpdates({
      title: "Track this order?",
      message: "Get a notification when it ships and when it arrives.",
      confirmLabel: "Notify me",
    });
  };

  const handlePlaceOrder = async () => {
    // Belt and braces with the idempotency key: ignore re-entrant taps.
    if (busy || !checkout.paymentMethod) return;
    try {
      const order = await placeOrder.mutateAsync();
      if (isPaid(order)) {
        finish(order);
        return;
      }
      setPaying(true);
      const result = await pay(order, checkout.paymentMethod);

      // Whatever the client saw, the server decides. A "failed" confirm can be
      // a lost response after a successful charge (network drop).
      const truth = await fetchOrder(order.id).catch(() => order);
      queryClient.setQueryData(queryKeys.orders.detail(truth.id), truth);
      if (isPaid(truth)) {
        finish(truth);
        return;
      }
      if (result.status === "cancelled") {
        send({
          type: "PAYMENT_FAILED",
          message:
            "Payment cancelled. Your order is saved — pay whenever you're ready.",
        });
      } else {
        const message =
          result.status === "failed"
            ? result.message
            : "We couldn't confirm your payment yet.";
        track("payment_failed", { order_id: order.id, reason: message });
        send({ type: "PAYMENT_FAILED", message });
      }
    } catch (error) {
      send({
        type: "PAYMENT_FAILED",
        message: getErrorMessage(error) ?? "Couldn't place your order.",
      });
    } finally {
      setPaying(false);
    }
  };

  const finish = (order: Parameters<typeof complete>[0]) => {
    complete(order, checkout.paymentMethod ?? "unknown");
    router.dismissAll();
    router.push({
      pathname: "/projects/store/order/[id]",
      params: { id: order.id },
    });
    offerPushAfterPurchase();
  };

  const editStep = (step: "address" | "shipping" | "payment") => {
    send({ type: "GO_TO", step });
    router.dismissTo(`/projects/store/checkout/${step}`);
  };

  const startOver = () => {
    Alert.alert(
      "Start over?",
      "Your unpaid order will be abandoned and you can change your details.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start over",
          style: "destructive",
          onPress: () => {
            send({ type: "RESET" });
            startCheckout();
            router.dismissTo("/projects/store/checkout/address");
          },
        },
      ],
    );
  };

  if (checkout.phase === "completed" && checkout.orderId) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneTitle}>Order complete</Text>
        <PrimaryButton
          title="View order"
          onPress={() =>
            router.replace({
              pathname: "/projects/store/order/[id]",
              params: { id: checkout.orderId! },
            })
          }
        />
      </View>
    );
  }

  return (
    <CheckoutScaffold
      stepLabels={CHECKOUT_STEP_LABELS}
      currentIndex={3}
      keyboardOffset={headerHeight}
      error={checkout.lastError}
      footer={
        <>
          <PrimaryButton
            title={
              paying
                ? "Authorizing payment…"
                : locked
                  ? `Pay ${formatMoney(totals.totalCents)}`
                  : `Place order · ${formatMoney(totals.totalCents)}`
            }
            onPress={handlePlaceOrder}
            loading={busy}
            accessibilityHint="Places the order and opens payment"
            testID="checkout-place-order"
          />
          {locked ? (
            <Pressable
              onPress={startOver}
              accessibilityRole="button"
              style={styles.startOver}
            >
              <Text style={styles.link}>Start over</Text>
            </Pressable>
          ) : null}
        </>
      }
    >
      <SummaryBlock
        title="Ship to"
        lines={checkout.address ? formatAddressLines(checkout.address) : []}
        onEdit={locked ? undefined : () => editStep("address")}
      />
      <SummaryBlock
        title="Delivery"
        lines={shipping ? [`${shipping.label} · ${shipping.eta}`] : []}
        onEdit={locked ? undefined : () => editStep("shipping")}
      />
      <SummaryBlock
        title="Payment"
        lines={[
          checkout.paymentMethod === "stripe"
            ? "Card, Apple Pay or Google Pay"
            : "Simulated payment (test only)",
        ]}
        onEdit={locked ? undefined : () => editStep("payment")}
      />

      <SectionHeader
        title={`${items.length} ${items.length === 1 ? "item" : "items"}`}
      />
      {items.map((item) => (
        <OrderLineRow
          key={item.id}
          title={item.title}
          image={item.image}
          quantity={item.quantity}
          lineTotal={formatMoney(lineTotalCents(item))}
        />
      ))}

      <SectionHeader title="Total" />
      <TotalsView
        rows={totalsRows(totals, {
          discountLabel: `Discount (${checkout.promoCode})`,
        })}
      />
    </CheckoutScaffold>
  );
}

function SummaryBlock({
  title,
  lines,
  onEdit,
}: {
  title: string;
  lines: string[];
  onEdit?: () => void;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitle}>{title}</Text>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title}`}
          >
            <Text style={styles.link}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
      {lines.map((line) => (
        <Text key={line} style={styles.blockLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: "#fff", borderRadius: 12, padding: 12, gap: 2 },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  blockTitle: { fontSize: 13, color: storeColors.muted, fontWeight: "600" },
  blockLine: { fontSize: 15 },
  link: { color: storeColors.accent, fontSize: 15, fontWeight: "600" },
  startOver: { alignSelf: "center", padding: 6 },
  done: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  doneTitle: { fontSize: 22, fontWeight: "700" },
});

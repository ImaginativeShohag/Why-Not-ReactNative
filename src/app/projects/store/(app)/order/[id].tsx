import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { fetchProductDetails } from "@/src/projects/store/api/product.api";
import { useSession } from "@/src/projects/store/auth/useSession";
import {
  formatAddressLines,
  totalsRows,
} from "@/src/projects/store/checkout/pricing";
import TotalsView from "@/src/projects/store/components/checkout/TotalsView";
import OrderLineRow from "@/src/projects/store/components/order/OrderLineRow";
import OrderStatusTimeline from "@/src/projects/store/components/order/OrderStatusTimeline";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import { ListSkeleton } from "@/src/projects/store/components/ui/Skeleton";
import { useOrder } from "@/src/projects/store/hooks/useOrders";
import {
  ORDER_STATUS_LABEL,
  ORDER_TIMELINE,
  type Order,
} from "@/src/projects/store/models/Order";
import { useCartStore } from "@/src/projects/store/stores/cartStore";
import { formatMoney } from "@/src/projects/store/utils/money";
import { queryKeys } from "@/src/projects/store/utils/queryKeys";
import { storeColors } from "@/src/projects/store/constants/theme";

const HEADLINE: Record<Order["status"], string> = {
  pending_payment: "Waiting for payment",
  payment_failed: "Payment didn't go through",
  paid: "Order placed",
  packed: "Packed and ready to ship",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderDetailScreen() {
  const { id, reorder } = useLocalSearchParams<{
    id: string;
    reorder?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const {
    data: order,
    isPending,
    error,
    refetch,
  } = useOrder(id ?? "", user?.id);
  const addToCart = useCartStore((s) => s.addToCart);
  const [reordering, setReordering] = useState(false);
  const autoReorderDone = useRef(false);

  const reorderItems = async (target: Order) => {
    setReordering(true);
    try {
      for (const line of target.lines) {
        const product = await queryClient.ensureQueryData({
          queryKey: queryKeys.products.detail(line.productId),
          queryFn: () => fetchProductDetails(line.productId),
        });
        for (let i = 0; i < line.quantity; i++) addToCart(product);
      }
      router.navigate("/projects/store/bag");
    } catch (e) {
      Alert.alert("Reorder", getErrorMessage(e) ?? "Couldn't add these items.");
    } finally {
      setReordering(false);
    }
  };

  // "Reorder" action button on a push notification lands here with ?reorder=1.
  useEffect(() => {
    if (reorder === "1" && order && !autoReorderDone.current) {
      autoReorderDone.current = true;
      reorderItems(order);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reorder, order]);

  if (isPending) return <ListSkeleton rows={4} />;
  if (error && !order) {
    return (
      <ErrorStateView
        message={getErrorMessage(error) ?? "Couldn't load this order."}
        onRetry={() => refetch()}
      />
    );
  }
  if (!order) return null;

  const timelineIndex = ORDER_TIMELINE.indexOf(order.status);
  const money = (cents: number) =>
    formatMoney(cents, { currency: order.currency });
  const number = order.id.replace("legacy-", "");

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Order #${number}` }} />

      <View style={styles.card}>
        {timelineIndex >= 0 ? (
          <OrderStatusTimeline
            labels={ORDER_TIMELINE.map((s) => ORDER_STATUS_LABEL[s])}
            currentIndex={timelineIndex}
          />
        ) : null}
        <Text
          style={styles.headline}
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {HEADLINE[order.status]}
        </Text>
        <Text style={styles.meta}>
          Placed {new Date(order.createdAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.card}>
        <SectionHeader
          title={`${order.lines.length} ${order.lines.length === 1 ? "item" : "items"}`}
          style={styles.section}
        />
        {order.lines.map((line) => (
          <OrderLineRow
            key={line.productId}
            title={line.title}
            image={line.image}
            quantity={line.quantity}
            lineTotal={money(line.unitPriceCents * line.quantity)}
          />
        ))}
        <View style={{ height: 8 }} />
        <TotalsView rows={totalsRows(order.totals, { format: money })} />
      </View>

      {order.address ? (
        <View style={styles.card}>
          <SectionHeader title="Shipping to" style={styles.section} />
          {formatAddressLines(order.address).map((line) => (
            <Text key={line} style={styles.body}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Action
          label="Track"
          onPress={() =>
            Alert.alert(
              "Tracking",
              "A real integration would open the carrier's tracking page here.",
            )
          }
        />
        <Action
          label={reordering ? "Adding…" : "Reorder"}
          onPress={() => reorderItems(order)}
        />
        <Action
          label="Help"
          onPress={() => Linking.openURL("mailto:support@example.com")}
        />
      </View>
    </ScrollView>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={styles.action}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 8 },
  headline: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  meta: { fontSize: 13, color: storeColors.muted },
  section: { marginTop: 0, marginBottom: 0 },
  body: { fontSize: 15 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  action: { paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { color: storeColors.accent, fontSize: 16, fontWeight: "600" },
});

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { useSession } from "@/src/projects/store/auth/useSession";
import OrderCard from "@/src/projects/store/components/order/OrderCard";
import ErrorStateView from "@/src/projects/store/components/ui/ErrorStateView";
import OfflineBanner from "@/src/projects/store/components/ui/OfflineBanner";
import SegmentedControl from "@/src/projects/store/components/ui/SegmentedControl";
import { ListSkeleton } from "@/src/projects/store/components/ui/Skeleton";
import { filterOrders, useOrders } from "@/src/projects/store/hooks/useOrders";
import {
  ORDER_STATUS_LABEL,
  type OrderStatusFilter,
} from "@/src/projects/store/models/Order";
import { useIsOnline } from "@/src/projects/store/query/storeQuery";
import { formatMoney } from "@/src/projects/store/utils/money";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

const PAGE = 10;
const FILTERS: { value: OrderStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

const relativeTime = (ms: number) => {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useSession();
  const isOnline = useIsOnline();
  const [filter, setFilter] = useState<OrderStatusFilter>("all");
  const [visible, setVisible] = useState(PAGE);
  const { data, isPending, error, refetch, isRefetching, dataUpdatedAt } =
    useOrders(user?.id);

  // Offline or failed refetch with cached data: show the data and say it's stale.
  if (isPending) return <ListSkeleton rows={5} />;
  if (error && !data) {
    return (
      <ErrorStateView
        message={getErrorMessage(error) ?? "Couldn't load your orders."}
        onRetry={() => refetch()}
      />
    );
  }

  const orders = filterOrders(data ?? [], filter);
  const stale = !isOnline || !!error;

  return (
    <View style={styles.flex}>
      <OfflineBanner
        visible={stale}
        message={`Showing saved orders · updated ${relativeTime(dataUpdatedAt)}`}
      />
      <SegmentedControl
        options={FILTERS}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setVisible(PAGE);
        }}
        style={styles.segment}
      />
      <FlatList
        data={orders.slice(0, visible)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
        // Client-side paging over the fetched history; swap for a cursor
        // (useInfiniteQuery) once a real backend returns pages.
        onEndReached={() =>
          setVisible((v) => (v < orders.length ? v + PAGE : v))
        }
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <ContentUnavailableView
            iconComponent={Ionicons}
            iconName="receipt-outline"
            title="No orders here yet"
          />
        }
        renderItem={({ item }) => {
          const count = item.lines.reduce((sum, l) => sum + l.quantity, 0);
          return (
            <OrderCard
              orderNumber={item.id.replace("legacy-", "")}
              dateLabel={new Date(item.createdAt).toLocaleDateString()}
              statusLabel={ORDER_STATUS_LABEL[item.status]}
              itemCountLabel={`${count} ${count === 1 ? "item" : "items"}`}
              total={formatMoney(item.totals.totalCents, {
                currency: item.currency,
              })}
              onPress={() =>
                router.push({
                  pathname: "/projects/store/order/[id]",
                  params: { id: item.id },
                })
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, gap: 12 },
  segment: { paddingHorizontal: 16, paddingTop: 12 },
});

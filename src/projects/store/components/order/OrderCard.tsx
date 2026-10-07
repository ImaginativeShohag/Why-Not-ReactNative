import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { storeColors } from "../../constants/theme";

type OrderCardProps = {
  orderNumber: string;
  dateLabel: string;
  statusLabel: string;
  itemCountLabel: string;
  total: string;
  onPress: () => void;
};

export default function OrderCard({
  orderNumber,
  dateLabel,
  statusLabel,
  itemCountLabel,
  total,
  onPress,
}: OrderCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${orderNumber}, ${statusLabel}, ${itemCountLabel}, ${total}, ${dateLabel}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.number}>#{orderNumber}</Text>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.meta}>
          {dateLabel} · {itemCountLabel}
        </Text>
        <View style={styles.totalRow}>
          <Text style={styles.total}>{total}</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={storeColors.tertiary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 6 },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  number: { fontSize: 16, fontWeight: "700" },
  status: { fontSize: 13, fontWeight: "600", color: storeColors.accent },
  meta: { fontSize: 13, color: storeColors.muted },
  totalRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  total: { fontSize: 15, fontWeight: "600" },
});

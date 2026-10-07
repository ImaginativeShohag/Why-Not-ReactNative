import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "./PrimaryButton";

type CartFooterProps = {
  /** Pre-formatted subtotal. */
  total: string;
  ctaLabel: string;
  onCheckout: () => void;
};

export default function CartFooter({
  total,
  ctaLabel,
  onCheckout,
}: CartFooterProps) {
  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <View
          style={styles.row}
          accessible
          accessibilityLabel={`Subtotal ${total}`}
        >
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.total}>{total}</Text>
        </View>
        <PrimaryButton
          title={ctaLabel}
          onPress={onCheckout}
          testID="bag-checkout"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ccc",
    marginBottom: 8,
  },
  content: { paddingHorizontal: 16, gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 18, fontWeight: "600" },
  total: { fontSize: 18, fontWeight: "bold" },
});

import { StyleSheet, View } from "react-native";

import PrimaryButton from "./PrimaryButton";
import Text from "./StoreText";
import { type StoreColors, useStoreStyles } from "../../constants/theme";

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
  const styles = useStoreStyles(createStyles);
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

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    container: { paddingBottom: 16 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginBottom: 8,
    },
    content: { paddingHorizontal: 16, gap: 12 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    label: { fontSize: 18, fontWeight: "600" },
    total: { fontSize: 18, fontWeight: "bold" },
  });

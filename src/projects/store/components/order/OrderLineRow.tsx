import { StyleSheet, Text, View } from "react-native";

import ProductImage from "../ui/product-image";
import { storeColors } from "../../constants/theme";

type OrderLineRowProps = {
  title: string;
  image: string;
  quantity: number;
  lineTotal: string;
};

export default function OrderLineRow({
  title,
  image,
  quantity,
  lineTotal,
}: OrderLineRowProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${title}, quantity ${quantity}, ${lineTotal}`}
    >
      <ProductImage image={image} style={styles.image} />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.qty}>×{quantity}</Text>
      <Text style={styles.total}>{lineTotal}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  image: { width: 44, height: 44, borderRadius: 8 },
  title: { flex: 1, fontSize: 14 },
  qty: { fontSize: 14, color: storeColors.muted },
  total: { fontSize: 14, fontWeight: "600", minWidth: 70, textAlign: "right" },
});

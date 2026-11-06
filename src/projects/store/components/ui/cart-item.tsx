import { StyleSheet, View } from "react-native";

import ProductImage from "@/src/projects/store/components/ui/product-image";

import QuantityStepper from "./QuantityStepper";
import Text from "./StoreText";
import { type StoreColors, useStoreStyles } from "../../constants/theme";

type CartItemProps = {
  title: string;
  /** Pre-formatted unit price. */
  price: string;
  /** Pre-formatted line total. */
  lineTotal: string;
  image: string;
  quantity: number;
  onPlusClick: () => void;
  onMinusClick: () => void;
  plusDisabled?: boolean;
};

export default function CartItemView({
  title,
  price,
  lineTotal,
  image,
  quantity,
  onPlusClick,
  onMinusClick,
  plusDisabled,
}: CartItemProps) {
  const styles = useStoreStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ProductImage image={image} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <QuantityStepper
          quantity={quantity}
          onIncrease={onPlusClick}
          onDecrease={onMinusClick}
          increaseDisabled={plusDisabled}
          increaseLabel={`Increase ${title} quantity`}
          decreaseLabel={
            quantity === 1 ? `Remove ${title}` : `Decrease ${title} quantity`
          }
          style={styles.quantityBox}
        />

        <Text style={styles.total}>{lineTotal}</Text>
      </View>
    </View>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, padding: 8 },
    row: { flexDirection: "row", alignItems: "center" },
    image: {
      width: 60,
      height: 60,
      borderRadius: 16,
      // Product photos come on white, so the well stays white in both modes.
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: c.separator,
    },
    info: { flex: 1, marginLeft: 12, gap: 2 },
    title: { fontWeight: "600", fontSize: 14 },
    price: { fontWeight: "700", fontSize: 13 },
    divider: {
      height: 1,
      backgroundColor: c.separator,
      marginVertical: 6,
    },
    quantityBox: { width: 130, justifyContent: "space-between" },
    total: { flex: 1, textAlign: "right", fontSize: 16, fontWeight: "700" },
  });

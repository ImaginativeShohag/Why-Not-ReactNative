import { AntDesign, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import ProductImage from "@/src/projects/store/components/ui/product-image";

import WishlistButton from "./WishlistButton";
import { storeColors } from "../../constants/theme";

type ProductViewProps = {
  title: string;
  /** Pre-formatted through `formatPrice` — components never format money. */
  price: string;
  image: string;
  rating: number;
  ratingCount: number;
  quantity: number | undefined;
  onPlusClick: () => void;
  onMinusClick: () => void;
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
};

export default function ProductView({
  title,
  price,
  image,
  rating,
  ratingCount,
  quantity,
  onPlusClick,
  onMinusClick,
  wishlisted,
  onToggleWishlist,
}: ProductViewProps) {
  const qty = quantity ?? 0;
  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        <ProductImage image={image} />
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "transparent"]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.gradient}
        />
        {onToggleWishlist ? (
          <View style={styles.wishlist}>
            <WishlistButton
              active={!!wishlisted}
              onPress={onToggleWishlist}
              size={20}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.price}>{price}</Text>
        <View
          style={styles.ratingRow}
          accessible
          accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5 from ${ratingCount} reviews`}
        >
          <AntDesign name="star" size={12} color="gold" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({ratingCount})</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.2 : 1.0 }]}
          onPress={onPlusClick}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Add one ${title} to bag`}
        >
          <Ionicons name="add-circle" size={24} color="black" />
        </Pressable>

        <Text style={styles.quantity} accessibilityLabel={`${qty} in bag`}>
          {qty}
        </Text>

        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.2 : 1.0 }]}
          onPress={onMinusClick}
          disabled={qty === 0}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove one ${title} from bag`}
          accessibilityState={{ disabled: qty === 0 }}
        >
          <Ionicons
            name="remove-circle"
            size={24}
            color={qty === 0 ? storeColors.tertiary : "black"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    margin: 8,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 32 },
  wishlist: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
  },
  info: { padding: 8 },
  title: { fontSize: 14, fontWeight: "600" },
  price: { fontSize: 16, fontWeight: "bold", color: storeColors.label },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, color: "gray", marginLeft: 4 },
  ratingCount: { fontSize: 12, color: "gray", marginLeft: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#C6C6C8" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    justifyContent: "space-between",
  },
  quantity: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "500" },
});

import { AntDesign, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";

import ProductImage from "@/src/projects/store/components/ui/product-image";

import WishlistButton from "./WishlistButton";
import Text from "./StoreText";
import {
  type StoreColors,
  useStoreColors,
  useStoreStyles,
} from "../../constants/theme";

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
  /** Opens the product. Only the image + info area is the link. */
  onPress?: () => void;
  onPressIn?: () => void;
  testID?: string;
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
  onPress,
  onPressIn,
  testID,
}: ProductViewProps) {
  const colors = useStoreColors();
  const styles = useStoreStyles(createStyles);
  const qty = quantity ?? 0;
  const ratingLabel = `Rated ${rating.toFixed(1)} out of 5 from ${ratingCount} reviews`;
  return (
    <View style={styles.card}>
      {/*
       * The link, the heart and the stepper are siblings, not nested: an
       * accessible parent hides its children from VoiceOver, so a card-wide
       * link would make the buttons unreachable.
       */}
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        disabled={!onPress}
        accessibilityRole="link"
        accessibilityLabel={`${title}, ${price}, ${ratingLabel}`}
        testID={testID}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1.0 }]}
      >
        <View style={styles.imageWrapper}>
          <ProductImage image={image} />
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "transparent"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.gradient}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.price}>{price}</Text>
          <View style={styles.ratingRow}>
            <AntDesign name="star" size={12} color="gold" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({ratingCount})</Text>
          </View>
        </View>
      </Pressable>

      {onToggleWishlist ? (
        <View style={styles.wishlist}>
          <WishlistButton
            active={!!wishlisted}
            onPress={onToggleWishlist}
            size={20}
          />
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.2 : 1.0 }]}
          onPress={onPlusClick}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Add one ${title} to bag`}
        >
          <Ionicons name="add-circle" size={24} color={colors.label} />
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
            color={qty === 0 ? colors.tertiary : colors.label}
          />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      overflow: "hidden",
      margin: 8,
    },
    imageWrapper: {
      width: "100%",
      aspectRatio: 1,
      // Product photos come on white, so the well stays white in both modes.
      backgroundColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      borderRadius: 16,
      overflow: "hidden",
    },
    gradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 32,
    },
    wishlist: {
      position: "absolute",
      top: 6,
      right: 6,
      // Sits on the white product photo, so it stays white in both modes.
      backgroundColor: "rgba(255,255,255,0.9)",
      borderRadius: 16,
    },
    info: { padding: 8 },
    title: { fontSize: 14, fontWeight: "600" },
    price: { fontSize: 16, fontWeight: "bold", color: c.label },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    ratingText: { fontSize: 12, color: c.muted, marginLeft: 4 },
    ratingCount: { fontSize: 12, color: c.muted, marginLeft: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.separator },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      justifyContent: "space-between",
    },
    quantity: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "500" },
  });

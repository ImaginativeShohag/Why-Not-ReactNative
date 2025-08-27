import { View, Text, StyleSheet, Pressable } from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import ProductImage from "@/src/components/ui/product-image";
import { LinearGradient } from "expo-linear-gradient";

type ProductViewProps = {
  title: string;
  price: number;
  image: string;
  rating: number;
  ratingCount: number;
  quantity: number | undefined;
  onPlusClick: () => void;
  onMinusClick: () => void;
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
}: ProductViewProps) {
  return (
    <View style={styles.card}>
      {/* Image Section */}
      <View style={styles.imageWrapper}>
        <ProductImage image={image} />
        {/*<View style={styles.gradientOverlay} />*/}
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "transparent"]} // gray → transparent
          start={{ x: 0.5, y: 1 }} // bottom center
          end={{ x: 0.5, y: 0 }} // top center
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 32,
          }}
        />
      </View>

      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.price}>${price.toFixed(2)}</Text>
        <View style={styles.ratingRow}>
          <AntDesign name="star" size={12} color="gold" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({ratingCount})</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quantity Section */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.2 : 1.0,
            },
          ]}
          onPress={onPlusClick}
        >
          <Ionicons name="add-circle" size={24} color="black" />
        </Pressable>

        <Text style={styles.quantity}>{quantity ?? 0}</Text>

        <Pressable
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.2 : 1.0,
            },
          ]}
          onPress={onMinusClick}
        >
          <Ionicons name="remove-circle" size={24} color="black" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF", // like .tertiarySystemBackground
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
  image: {
    width: "90%",
    height: "90%",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  info: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "red",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: "gray",
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: "gray",
    marginLeft: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#C6C6C8",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    justifyContent: "space-between",
  },
  quantity: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
});

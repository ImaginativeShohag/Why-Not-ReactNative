import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import ProductImage from "@/src/components/ui/product-image";

type CartItemProps = {
  title: string;
  price: number;
  image: string;
  rating: number;
  ratingCount: number;
  quantity: number;
  onPlusClick: () => void;
  onMinusClick: () => void;
};

export default function CartItemView({
  title,
  price,
  image,
  rating,
  ratingCount,
  quantity,
  onPlusClick,
  onMinusClick,
}: CartItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ProductImage image={image} style={styles.image} />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.price}>${price.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.quantityBox}>
          <Pressable onPress={onPlusClick} style={styles.button}>
            <Text style={styles.buttonText}>＋</Text>
          </Pressable>

          <Text style={styles.quantity}>{quantity}</Text>

          <Pressable onPress={onMinusClick} style={styles.button}>
            <Text style={styles.buttonText}>－</Text>
          </Pressable>
        </View>

        <Text style={styles.total}>${(price * quantity).toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
  },
  price: {
    fontWeight: "700",
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: "#C7C7CC",
    marginVertical: 6,
  },
  quantityBox: {
    flexDirection: "row",
    alignItems: "center",
    width: 150,
    justifyContent: "space-between",
  },
  button: {
    padding: 6,
    backgroundColor: "#007AFF",
    borderRadius: 6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  quantity: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 8,
  },
  total: {
    flex: 1,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "700",
    color: "red",
  },
});

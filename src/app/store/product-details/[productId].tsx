import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Button,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useProductDetails } from "@/src/hooks/useProduct";
import { useCartStore } from "@/src/stores/cartStore";

type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string;
  ratingRate: number;
  ratingCount: number;
  quantity: number;
};

export default function ProductDetailsScreen() {
  const { productId } = useLocalSearchParams();
  const { items, addToCart, updateQuantity } = useCartStore();

  const {
    data: product,
    isLoading: productIsLoading,
    error: productLoadingError,
  } = useProductDetails(Number(productId) ?? 0);

  if (productIsLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  if (productLoadingError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{productLoadingError.message}</Text>
      </View>
    );
  }

  if (!product) return null;

  const cartItem = items.find((i) => i.id === product.id);

  const increaseQuantity = () => {
    if (!product) return;
    if (!cartItem) {
      addToCart(product);
    } else {
      updateQuantity(product.id, 1);
    }
  };

  const decreaseQuantity = () => {
    if (!cartItem) return;
    if (cartItem.quantity > 1) {
      updateQuantity(product.id, -1);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.image} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.15)"]}
            style={styles.gradient}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{product.title}</Text>

          <View style={styles.ratingRow}>
            <Text>
              ⭐ {product.rating.rate} ({product.rating.count})
            </Text>
          </View>

          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>

        <View style={styles.spacer} />

        <View style={styles.quantityRow}>
          <Pressable onPress={increaseQuantity}>
            <Text style={styles.quantityButton}>＋</Text>
          </Pressable>

          <Text style={styles.quantityText}>{cartItem?.quantity ?? 0}</Text>

          <Pressable onPress={decreaseQuantity}>
            <Text style={styles.quantityButton}>－</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 300, resizeMode: "contain" },
  gradient: { position: "absolute", bottom: 0, height: 32, width: "100%" },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: "600" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  description: { fontSize: 14 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  price: { fontWeight: "bold", fontSize: 16, color: "red" },
  spacer: { flex: 1 },
  quantityRow: { flexDirection: "row", alignItems: "center" },
  quantityButton: { fontSize: 22, marginHorizontal: 8 },
  quantityText: { fontSize: 16 },
});

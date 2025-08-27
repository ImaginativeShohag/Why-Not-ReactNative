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

  const {
    data: product,
    isLoading: productIsLoading,
    error: productLoadingError,
  } = useProductDetails(Number(productId) ?? 0);

  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   loadProduct();
  // }, []);
  //
  // const loadProduct = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     // Mock fetch
  //     const data: Product = {
  //       id: productId,
  //       title: "Sample Product",
  //       description: "This is a sample product description.",
  //       price: 19.99,
  //       image: "https://via.placeholder.com/300",
  //       ratingRate: 4.5,
  //       ratingCount: 120,
  //       quantity: 1,
  //     };
  //     setProduct(data);
  //   } catch (e) {
  //     setError("Failed to load product");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const increaseQuantity = () => {
    if (!product) return;
    // setProduct({ ...product, quantity: product.quantity + 1 });
  };

  const decreaseQuantity = () => {
    if (!product) return;
    if (product.quantity > 1) {
      // setProduct({ ...product, quantity: product.quantity - 1 });
    }
  };

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

          <Text style={styles.quantityText}>{product.quantity}</Text>

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

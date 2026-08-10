import { useProductDetails } from "@/src/hooks/useProduct";
import { useCartStore } from "@/src/stores/cartStore";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProductDetailsScreen() {
  const navigation = useNavigation();
  const { productId } = useLocalSearchParams();
  const { items, addToCart, updateQuantity } = useCartStore();

  const {
    data: product,
    isLoading: productIsLoading,
    error: productLoadingError,
  } = useProductDetails(Number(productId) ?? 0);

  useEffect(() => {
    navigation.setOptions({
      title: product?.title,
    });
  });

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
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
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
            <Pressable
              onPress={increaseQuantity}
              style={({ pressed }) => [
                styles.button,
                {
                  opacity: pressed ? 0.2 : 1.0,
                },
              ]}
            >
              <Text style={styles.buttonText}>＋</Text>
            </Pressable>

            <Text style={styles.quantityText}>{cartItem?.quantity ?? 0}</Text>

            <Pressable
              onPress={decreaseQuantity}
              style={({ pressed }) => [
                styles.button,
                {
                  opacity: pressed ? 0.2 : 1.0,
                },
              ]}
            >
              <Text style={styles.buttonText}>－</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: {
    position: "relative",
    borderRadius: 32,
    overflow: "hidden",
  },
  image: { flex: 1, height: 300, resizeMode: "contain", margin: 16 },
  gradient: { position: "absolute", bottom: 0, height: 32, width: "100%" },
  content: { padding: 16, gap: 8 },
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
  quantityText: { fontSize: 16, marginHorizontal: 16 },
  button: {
    padding: 6,
    backgroundColor: "#007AFF",
    borderRadius: 6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 22,
  },
});

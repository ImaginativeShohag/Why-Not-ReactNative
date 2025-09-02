import { Pressable, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { useProductsByCategory } from "@/src/hooks/useProduct";
import { useCartStore } from "@/src/stores/cartStore";
import { useEffect } from "react";
import { Link, useLocalSearchParams, useNavigation } from "expo-router";
import { Category } from "@/src/models/Product";
import ProductView from "@/src/components/ui/product-item";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ProductsScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: Category }>();
  const navigation = useNavigation();
  const { items, addToCart, updateQuantity } = useCartStore();
  const insets = useSafeAreaInsets();

  const {
    data: products,
    isLoading: productsIsLoading,
    error: productsLoadingError,
  } = useProductsByCategory(categoryId);

  useEffect(() => {
    navigation.setOptions({
      title: "Products",
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <FlashList
        data={products}
        keyExtractor={(item) => String(item.id)}
        masonry={true}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingBottom: insets.bottom,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        renderItem={({ item: product }) => {
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
            <Link
              href={{
                pathname: "/store/product-details/[productId]",
                params: { productId: product.id },
              }}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.2 : 1.0,
                  },
                ]}
              >
                <ProductView
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  rating={product.rating.rate}
                  ratingCount={product.rating.count}
                  quantity={cartItem?.quantity ?? 0}
                  onPlusClick={() => {
                    increaseQuantity();
                  }}
                  onMinusClick={() => {
                    decreaseQuantity();
                  }}
                />
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  itemContainer: {
    flex: 1, // Allows items to take equal width within their column
    margin: 5,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 50, // Example minimum height for items
  },
  itemText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  categoryItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  categoryItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

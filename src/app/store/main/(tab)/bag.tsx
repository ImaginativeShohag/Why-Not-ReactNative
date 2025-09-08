import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { useCartStore } from "@/src/stores/cartStore";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import CartItemView from "@/src/components/ui/cart-item";
import ContentUnavailableView from "@/src/components/ui/content-unavailable-view";
import { Ionicons } from "@expo/vector-icons";
import CartFooter from "@/src/components/ui/cart-footer";
import { useTotalPrice } from "@/src/stores/cartSelectors";
import { useComponentHeight } from "@/src/hooks/useComponentHeight";

export default function BagScreen() {
  const navigation = useNavigation();
  const footer = useComponentHeight();

  useEffect(() => {
    navigation.setOptions({
      title: "Bag",
    });
  }, [navigation]);

  const { items: products, updateQuantity } = useCartStore();
  const total = useTotalPrice();

  if (products.length === 0) {
    return (
      <ContentUnavailableView
        iconComponent={Ionicons}
        iconName={"cart-outline"}
        title="Your Cart is Empty"
        description="Add some products to continue."
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: footer.height }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item: cartItem }) => {
          const increaseQuantity = () => {
            updateQuantity(cartItem.id, 1);
          };

          const decreaseQuantity = () => {
            updateQuantity(cartItem.id, -1);
          };

          return (
            <CartItemView
              title={cartItem.title}
              price={cartItem.price}
              image={cartItem.image}
              rating={cartItem.rating.rate}
              ratingCount={cartItem.rating.count}
              quantity={cartItem?.quantity ?? 0}
              onPlusClick={() => {
                increaseQuantity();
              }}
              onMinusClick={() => {
                decreaseQuantity();
              }}
            />
          );
        }}
      />

      <View style={styles.footerContainer} onLayout={footer.onLayout}>
        <BlurView>
          <CartFooter total={total} isEmpty={products.length === 0} />
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7", // iOS systemGroupedBackground equivalent
  },
  error: {
    fontSize: 16,
    color: "red",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
  },
  list: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    flex: 1,
    justifyContent: "center",
    aspectRatio: 1,
  },
  imageStyle: {
    borderRadius: 16,
  },
  overlay: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    margin: 12,
    overflow: "hidden",
    textAlign: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Collapsible from "react-native-collapsible";
import { useOrders } from "@/src/hooks/useProduct";
import { DetailedCartItem } from "@/src/models/CartItem";
import { useNavigation } from "expo-router";

export default function OrdersScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: "Orders",
    });
  }, [navigation]);

  const {
    data: orders,
    isLoading: ordersIsLoading,
    error: ordersLoadingError,
    refetch,
  } = useOrders(1);

  if (ordersIsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (ordersLoadingError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{ordersLoadingError.message}</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={orders?.reverse() ?? []}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={ordersIsLoading} onRefresh={refetch} />
      }
      contentContainerStyle={{ padding: 16, gap: 16 }}
      renderItem={({ item }) => <OrderItem order={item} />}
    />
  );
}

function OrderItem({ order }: { order: DetailedCartItem }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  const toggleExpanded = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);

    // Animate the chevron rotation
    Animated.timing(rotateAnim, {
      toValue: willExpand ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.orderCard]}>
      <View style={styles.row}>
        <Text style={styles.orderId}>#{order.id}</Text>
        <Text>{new Date(order.date).toDateString()}</Text>
      </View>

      <Pressable
        style={styles.expandButton}
        onPress={() => {
          setExpanded(!expanded);
          toggleExpanded();
        }}
      >
        <Text style={styles.expandText}>
          Total {order.products.length}{" "}
          {order.products.length === 1 ? "product" : "products"}
        </Text>

        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialIcons name="expand-more" size={24} color="black" />
        </Animated.View>
      </Pressable>

      <Collapsible collapsed={!expanded}>
        <View style={{ height: 8 }} />
        <View style={[styles.productsContainer]}>
          {order.products.map((product) => (
            <View key={product.id} style={[styles.productRow]}>
              <Image
                source={{ uri: product.image }}
                style={styles.productImage}
                resizeMode="contain"
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <View style={styles.row}>
                  <Text style={styles.price}>
                    ${product.price.toFixed(2)} × {product.quantity}
                  </Text>
                  <Text style={styles.price}>
                    ${(product.price * product.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Collapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "red", fontSize: 16, marginBottom: 12 },
  retryButton: {
    backgroundColor: "#007aff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "bold" },
  orderCard: {
    backgroundColor: "#f2f2f7",
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    overflow: "hidden", // Ensures smooth animations
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  orderId: { fontWeight: "bold" },
  expandButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    backgroundColor: "#ddd",
    borderRadius: 8,
  },
  expandText: { fontWeight: "500" },
  productsContainer: {
    gap: 8,
    marginTop: 0,
    overflow: "hidden",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 0,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  productTitle: { fontWeight: "600", fontSize: 14 },
  price: { fontWeight: "bold", fontSize: 13 },
});

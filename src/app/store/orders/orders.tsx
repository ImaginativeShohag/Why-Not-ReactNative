import React, { useState, useEffect, useCallback } from "react";
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
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type Product = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
};

type Order = {
  id: string;
  orderedAt: string;
  products: Product[];
};

export default function OrdersScreen() {
  const [state, setState] = useState<"loading" | "error" | "data">("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async (forced = false) => {
    try {
      setState("loading");
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setOrders([
        {
          id: "101",
          orderedAt: "2025-09-01",
          products: [
            {
              id: "p1",
              title: "Book One",
              price: 12.5,
              quantity: 2,
              image: "https://picsum.photos/seed/book1/100/100",
            },
            {
              id: "p2",
              title: "Book Two",
              price: 9.99,
              quantity: 1,
              image: "https://picsum.photos/seed/book2/100/100",
            },
            {
              id: "p3",
              title: "Book Two",
              price: 9.99,
              quantity: 1,
              image: "https://picsum.photos/seed/book2/100/100",
            },
            {
              id: "p4",
              title: "Book Two",
              price: 9.99,
              quantity: 1,
              image: "https://picsum.photos/seed/book2/100/100",
            },
          ],
        },
      ]);
      setState("data");
    } catch (e) {
      setErrorMessage("Failed to load orders.");
      setState("error");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(true);
    setRefreshing(false);
  }, []);

  if (state === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadOrders(true)}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ padding: 16, gap: 16 }}
      renderItem={({ item }) => <OrderItem order={item} />}
    />
  );
}

function OrderItem({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];
  const heightAnim = useState(new Animated.Value(0))[0];

  const toggleExpanded = () => {
    // Configure layout animation for smooth height changes
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    const willExpand = !expanded;
    setExpanded(willExpand);

    // Animate the chevron rotation
    Animated.timing(rotateAnim, {
      toValue: willExpand ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate the content fade in/out
    Animated.timing(fadeAnim, {
      toValue: willExpand ? 1 : 0,
      duration: willExpand ? 400 : 200,
      delay: willExpand ? 100 : 0,
      useNativeDriver: true,
    }).start();

    // Animate height for smoother expansion
    Animated.timing(heightAnim, {
      toValue: willExpand ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const [contentHeight, setContentHeight] = useState(10);
  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, order.products.length * (contentHeight + 8) - 8], // Approximate height per product
  });

  return (
    <Animated.View style={[styles.orderCard, { backgroundColor: "red" }]}>
      <View style={styles.row}>
        <Text style={styles.orderId}>#{order.id}</Text>
        <Text>{new Date(order.orderedAt).toDateString()}</Text>
      </View>

      <Pressable style={styles.expandButton} onPress={toggleExpanded}>
        <Text style={styles.expandText}>
          Total {order.products.length}{" "}
          {order.products.length === 1 ? "product" : "products"}
        </Text>

        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialIcons name="expand-more" size={24} color="black" />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.productsContainer,
          {
            height: animatedHeight,
            opacity: expanded ? 1 : 0,
            backgroundColor: "green",
          },
        ]}
      >
        {order.products.map((product) => (
          <Animated.View
            key={product.id}
            style={[
              styles.productRow,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
                backgroundColor: "yellow",
              },
            ]}
            onLayout={({ nativeEvent }) => {
              if (expanded) {
                setContentHeight(nativeEvent.layout.height);
              }
            }}
          >
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
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
          </Animated.View>
        ))}
      </Animated.View>
    </Animated.View>
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
    marginTop: 12,
    paddingVertical: 8,
  },
  expandText: { fontWeight: "500" },
  productsContainer: {
    gap: 8,
    marginTop: 8,
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

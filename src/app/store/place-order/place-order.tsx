import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CartItem, useCartStore } from "@/src/stores/cartStore";
import { useTotalPrice } from "@/src/stores/cartSelectors";
import ProductImage from "@/src/components/ui/product-image";
import { SafeAreaView } from "react-native-safe-area-context";

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  ratingRate: number;
  ratingCount: number;
  quantity: number;
};

export default function PlaceOrderScreen() {
  const { items: cartItems, clearCart } = useCartStore();
  const totalPrice = useTotalPrice();
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  //const [cartItems, setCartItems] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitOrder = async () => {
    setIsSubmitting(true);
    // Fake delay
    await new Promise((res) => setTimeout(res, 1000));
    setIsSubmitting(false);
    Alert.alert("Order placed successfully!", "", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  if (cartItems.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="cube-outline" size={48} color="gray" />
        <Text style={{ fontSize: 18, marginTop: 8 }}>
          Checkout is completed.
        </Text>
        <Text style={{ color: "gray", marginTop: 4 }}>
          Add some products to continue again.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#f2f2f7" }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Shipping Info */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="map-outline" size={20} />
            <Text style={{ marginLeft: 6, fontWeight: "600" }}>
              Shipping Address
            </Text>
          </View>

          <TextInput
            placeholder="Your name..."
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Phone number..."
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <TextInput
            placeholder="Enter your address here..."
            value={address}
            onChangeText={setAddress}
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            multiline
          />

          {/* Cart items */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginVertical: 8,
            }}
          >
            <Ionicons name="cube" size={20} />
            <Text style={{ marginLeft: 6 }}>
              {cartItems.length}{" "}
              {cartItems.length === 1 ? "Product" : "Products"}
            </Text>
          </View>

          {cartItems.map((product) => (
            <CartItemView key={product.id} product={product} />
          ))}
        </ScrollView>

        {/* Bottom Bar */}
        <View
          style={{
            padding: 16,
            backgroundColor: "white",
            borderTopWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 18 }}>Total</Text>
            <Text style={{ fontWeight: "bold", fontSize: 18 }}>
              ${totalPrice.toFixed(2)}
            </Text>
          </View>

          <Pressable
            style={[
              styles.button,
              (cartItems.length === 0 || !address || isSubmitting) && {
                opacity: 0.5,
              },
            ]}
            disabled={cartItems.length === 0 || !address || isSubmitting}
            onPress={submitOrder}
          >
            {isSubmitting ? (
              <Text style={{ color: "white", fontSize: 16 }}>
                Placing Order...
              </Text>
            ) : (
              <Text style={{ color: "white", fontSize: 16 }}>Place Order</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CartItemView({ product }: { product: CartItem }) {
  return (
    <View style={styles.cartItem}>
      <ProductImage image={product.image} style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: "600" }}>
          {product.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, flexDirection: "row" }}>
            <Text style={{ fontWeight: "bold" }}>
              ${product.price.toFixed(2)}
            </Text>
            <Text style={{ fontWeight: "bold" }}> × </Text>
            <Text style={{ color: "red", fontWeight: "bold" }}>
              ${product.quantity}
            </Text>
          </View>

          <Text style={{ color: "red", fontWeight: "bold" }}>
            ${(product.price * product.quantity).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginEnd: 8,
  },
});

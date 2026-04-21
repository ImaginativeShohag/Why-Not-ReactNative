import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function CartFooter({
  total,
  isEmpty,
}: {
  total: number;
  isEmpty: boolean;
}) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.divider} />

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.total}>${total.toFixed(2)}</Text>
        </View>

        <Pressable
          style={[styles.button, isEmpty && styles.disabled]}
          disabled={isEmpty}
          onPress={() => router.push("/store/place-order/place-order")}
        >
          <Text style={styles.buttonText}>Check Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    paddingHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
  },
  total: {
    fontSize: 18,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#007AFF", // iOS primary blue
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  disabled: {
    backgroundColor: "#aaa",
  },
});

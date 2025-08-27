import React, { useState } from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProductImage({ image }: { image: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={styles.imageWrapper}>
      {error ? (
        <Ionicons name="image-outline" size={48} color="gray" />
      ) : (
        <>
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => {
              setLoading(false);
              console.log("Image loading finished 1");
            }}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
          />
          {loading && (
            <ActivityIndicator
              style={StyleSheet.absoluteFill}
              size="small"
              color="gray"
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "90%",
    height: "90%",
  },
});

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

export default function ProductImage({
  image,
  style,
  accessibilityLabel,
}: {
  image: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View
      style={[styles.imageWrapper, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {error ? (
        <Ionicons name="image-outline" size={32} color="gray" />
      ) : (
        <>
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
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
  image: { width: "90%", height: "90%" },
});

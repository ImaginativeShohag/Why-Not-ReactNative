import { Image } from "expo-image";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { accentFromSeed } from "@/src/projects/podcast-player/utils/color";

type Props = {
  uri: string | null | undefined;
  size: number;
  /** Used for the placeholder colour + initial when there is no artwork. */
  title?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Artwork({ uri, size, title, radius = 8, style }: Props) {
  const box = { width: size, height: size, borderRadius: radius };
  if (!uri) {
    return (
      <View
        style={[
          box,
          styles.placeholder,
          { backgroundColor: accentFromSeed(title) },
          style,
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
          {(title ?? "?").trim().charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[box, styles.image, style as object]}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: "center", justifyContent: "center" },
  initial: { color: "#fff", fontWeight: "700" },
  image: { backgroundColor: "#222" },
});

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { storeColors } from "../../constants/theme";

type OfflineBannerProps = {
  visible: boolean;
  message?: string;
};

export default function OfflineBanner({
  visible,
  message = "You're offline — showing saved data",
}: OfflineBannerProps) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Ionicons
          name="cloud-offline-outline"
          size={16}
          color={storeColors.label}
        />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFD60A",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: storeColors.label,
    flexShrink: 1,
  },
});

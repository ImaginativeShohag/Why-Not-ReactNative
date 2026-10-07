import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CONTROL_SIZE } from "@/src/projects/podcast-player/constants/layout";

type Props = {
  direction: "back" | "forward";
  seconds: number;
  color: string;
  onPress: () => void;
};

/** Skip control that shows the configured interval inside the icon. */
export function SkipButton({ direction, seconds, color, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={
        direction === "back"
          ? `Back ${seconds} seconds`
          : `Forward ${seconds} seconds`
      }
    >
      <View style={styles.icon}>
        <Ionicons
          name="refresh"
          size={40}
          color={color}
          style={direction === "back" ? styles.flip : undefined}
        />
        <Text style={[styles.label, { color }]}>{seconds}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { alignItems: "center", justifyContent: "center" },
  flip: { transform: [{ scaleX: -1 }] },
  label: { position: "absolute", fontSize: 11, fontWeight: "800" },
});

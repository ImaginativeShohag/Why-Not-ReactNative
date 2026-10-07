import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";

type Props = { onManage: () => void };

/**
 * iOS limited-access mode: the app only sees photos the user picked. Say so,
 * and offer the system picker to change the selection.
 */
export function LimitedAccessBanner({ onManage }: Props) {
  return (
    <Pressable
      onPress={onManage}
      accessibilityRole="button"
      accessibilityHint="Choose which photos this app can see"
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.8 }]}
    >
      <Ionicons
        name="information-circle-outline"
        size={18}
        color={Palette.text}
      />
      <Text style={styles.text}>
        Limited access · <Text style={styles.link}>Manage</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Palette.surfaceRaised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  text: { color: Palette.textMuted, fontSize: 14 },
  link: { color: Palette.accent, fontWeight: "700" },
});

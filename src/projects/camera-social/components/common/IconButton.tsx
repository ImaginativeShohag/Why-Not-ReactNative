import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon: IconName;
  onPress?: () => void;
  label?: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  /** Rotate just the glyph — used to keep icons upright in landscape. */
  iconRotation?: number;
};

export function IconButton({
  icon,
  onPress,
  label,
  size = 24,
  color = Palette.text,
  disabled,
  accessibilityLabel,
  style,
  iconRotation = 0,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={size}
        color={color}
        style={
          iconRotation
            ? { transform: [{ rotate: `${iconRotation}deg` }] }
            : undefined
        }
      />
      {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", padding: 6 },
  label: { fontSize: 11, marginTop: 2, fontWeight: "600" },
});

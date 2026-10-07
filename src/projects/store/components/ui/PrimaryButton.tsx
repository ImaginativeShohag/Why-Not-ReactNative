import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";

import { storeColors } from "../../constants/theme";

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "destructive";
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
};

/** The screen's one saturated element. Dumb: title + callback. */
export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  accessibilityHint,
  testID,
  style,
}: PrimaryButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? storeColors.accent : "#fff"}
        />
      ) : (
        <Text
          style={[styles.text, variant === "secondary" && styles.secondaryText]}
          maxFontSizeMultiplier={1.6}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: storeColors.accent },
  secondary: { backgroundColor: "rgba(0,122,255,0.12)" },
  destructive: { backgroundColor: storeColors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  text: { color: "#fff", fontSize: 17, fontWeight: "600" },
  secondaryText: { color: storeColors.accent },
});

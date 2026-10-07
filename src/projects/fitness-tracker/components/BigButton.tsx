import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  color: string;
  textColor?: string;
  disabled?: boolean;
};

/** ≥64pt tall: sweaty hands, out of breath. */
export function BigButton({
  label,
  onPress,
  color,
  textColor = "#fff",
  disabled,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    flex: 1,
  },
  label: { fontSize: 20, fontWeight: "800", letterSpacing: 1 },
});

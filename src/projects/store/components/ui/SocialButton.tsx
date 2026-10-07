import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type SocialButtonProps = {
  provider: "apple" | "google";
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const LABEL = {
  apple: "Continue with Apple",
  google: "Continue with Google",
} as const;
const ICON = { apple: "logo-apple", google: "logo-google" } as const;

export default function SocialButton({
  provider,
  onPress,
  disabled,
  loading,
}: SocialButtonProps) {
  const dark = provider === "apple";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={LABEL[provider]}
      accessibilityState={{
        disabled: !!(disabled || loading),
        busy: !!loading,
      }}
      style={({ pressed }) => [
        styles.button,
        dark ? styles.dark : styles.light,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={dark ? "#fff" : "#000"} />
      ) : (
        <>
          <Ionicons
            name={ICON[provider]}
            size={20}
            color={dark ? "#fff" : "#000"}
          />
          <Text style={[styles.text, { color: dark ? "#fff" : "#000" }]}>
            {LABEL[provider]}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dark: { backgroundColor: "#000" },
  light: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D1D6" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  text: { fontSize: 17, fontWeight: "600" },
});

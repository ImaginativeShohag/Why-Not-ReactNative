import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import Text from "./StoreText";
import {
  type StoreColors,
  useStoreColors,
  useStoreStyles,
} from "../../constants/theme";

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
  const colors = useStoreColors();
  const styles = useStoreStyles(createStyles);
  const dark = provider === "apple";
  // Apple inverts with the scheme (black in light, white in dark); Google sits
  // on the card surface.
  const ink = dark ? colors.card : colors.label;
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
        <ActivityIndicator color={ink} />
      ) : (
        <>
          <Ionicons name={ICON[provider]} size={20} color={ink} />
          <Text style={[styles.text, { color: ink }]}>{LABEL[provider]}</Text>
        </>
      )}
    </Pressable>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    button: {
      minHeight: 50,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    dark: { backgroundColor: c.label },
    light: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
    },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
    text: { fontSize: 17, fontWeight: "600" },
  });

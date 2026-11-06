import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { useStoreColors } from "../../constants/theme";

type WishlistButtonProps = {
  active: boolean;
  onPress: () => void;
  size?: number;
};

export default function WishlistButton({
  active,
  onPress,
  size = 24,
}: WishlistButtonProps) {
  const colors = useStoreColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={active ? "Remove from wishlist" : "Add to wishlist"}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons
        name={active ? "heart" : "heart-outline"}
        size={size}
        color={active ? "#FF2D55" : colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 4 },
  pressed: { opacity: 0.5 },
});

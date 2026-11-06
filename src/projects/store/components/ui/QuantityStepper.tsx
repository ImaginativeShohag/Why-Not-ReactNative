import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import Text from "./StoreText";
import { type StoreColors, useStoreStyles } from "../../constants/theme";

type QuantityStepperProps = {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  /** Disables "+" (e.g. at the per-item maximum). */
  increaseDisabled?: boolean;
  increaseLabel: string;
  decreaseLabel: string;
  size?: "regular" | "large";
  style?: StyleProp<ViewStyle>;
};

export default function QuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  increaseDisabled = false,
  increaseLabel,
  decreaseLabel,
  size = "regular",
  style,
}: QuantityStepperProps) {
  const styles = useStoreStyles(createStyles);
  const large = size === "large";
  const buttonStyle = [styles.button, large && styles.buttonLarge];
  const textStyle = [styles.buttonText, large && styles.buttonTextLarge];

  return (
    <View style={[styles.row, style]}>
      <Pressable
        onPress={onDecrease}
        style={buttonStyle}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
      >
        <Text style={textStyle}>－</Text>
      </Pressable>

      <Text
        style={[styles.value, large && styles.valueLarge]}
        accessibilityLabel={`Quantity ${quantity}`}
      >
        {quantity}
      </Text>

      <Pressable
        onPress={onIncrease}
        disabled={increaseDisabled}
        style={[buttonStyle, increaseDisabled && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        accessibilityState={{ disabled: increaseDisabled }}
      >
        <Text style={textStyle}>＋</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center" },
    button: {
      padding: 6,
      backgroundColor: c.accent,
      borderRadius: 6,
      minWidth: 32,
      alignItems: "center",
    },
    buttonLarge: {
      padding: 0,
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
    },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: c.onAccent, fontWeight: "bold", fontSize: 18 },
    buttonTextLarge: { fontSize: 20, fontWeight: "700" },
    value: { fontSize: 16, fontWeight: "600", marginHorizontal: 8 },
    valueLarge: {
      fontSize: 18,
      marginHorizontal: 0,
      minWidth: 24,
      textAlign: "center",
    },
  });

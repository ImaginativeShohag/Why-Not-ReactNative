import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { storeColors } from "../../constants/theme";

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * "tab" (default) for view filters; "radio" when the control picks a
   * setting value rather than switching what's shown.
   */
  role?: "tab" | "radio";
  style?: StyleProp<ViewStyle>;
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  role = "tab",
  style,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole={role === "tab" ? "tablist" : "radiogroup"}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole={role}
            accessibilityState={
              role === "tab" ? { selected } : { checked: selected }
            }
            style={[styles.item, selected && styles.itemActive]}
          >
            <Text style={selected ? styles.textActive : styles.text}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 6 },
  item: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(120,120,128,0.12)",
  },
  itemActive: { backgroundColor: storeColors.accent },
  text: { fontWeight: "500" },
  textActive: { color: "#fff", fontWeight: "600" },
});

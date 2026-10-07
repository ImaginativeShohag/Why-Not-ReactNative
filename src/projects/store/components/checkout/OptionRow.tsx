import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { storeColors } from "../../constants/theme";

type OptionRowProps = {
  title: string;
  subtitle?: string;
  trailing?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

/** Radio-style choice row (shipping options, payment methods). */
export default function OptionRow({
  title,
  subtitle,
  trailing,
  selected,
  onPress,
  disabled,
  testID,
}: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={[title, subtitle, trailing]
        .filter(Boolean)
        .join(", ")}
      style={({ pressed }) => [
        styles.row,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={selected ? storeColors.accent : storeColors.tertiary}
      />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: storeColors.separator,
    backgroundColor: "#fff",
  },
  selected: {
    borderColor: storeColors.accent,
    backgroundColor: "rgba(0,122,255,0.06)",
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 13, color: storeColors.muted },
  trailing: { fontSize: 16, fontWeight: "600" },
});

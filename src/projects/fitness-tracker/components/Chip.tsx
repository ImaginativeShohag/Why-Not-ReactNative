import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  color: string;
  textColor: string;
  borderColor: string;
};

export function Chip({
  label,
  selected,
  onPress,
  color,
  textColor,
  borderColor,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? color : borderColor,
          backgroundColor: selected ? color : "transparent",
        },
      ]}
    >
      <Text style={[styles.text, { color: selected ? "#fff" : textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    minHeight: 36,
  },
  text: { fontSize: 14, fontWeight: "700" },
});

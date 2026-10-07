import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type OptionPickerProps<T extends string | number> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Small segmented control. Generic over the value type; knows nothing else. */
export function OptionPicker<T extends string | number>({
  options,
  value,
  onChange,
}: OptionPickerProps<T>) {
  const palette = usePalette();
  return (
    <View
      style={[styles.row, { backgroundColor: palette.chip }]}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.option,
              selected && { backgroundColor: palette.accent },
            ]}
          >
            <ThemedText
              style={[
                styles.text,
                { color: selected ? palette.accentText : palette.text },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderRadius: 8, padding: 2 },
  option: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  text: { fontSize: 13, lineHeight: 18 },
});

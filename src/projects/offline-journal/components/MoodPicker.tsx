import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import type { Mood } from "@/src/projects/offline-journal/models/Entry";
import {
  MOOD_FACES,
  MOODS,
} from "@/src/projects/offline-journal/utils/exportFormat";
import { ThemedText } from "@/src/shared/components/themed-text";

export type MoodPickerProps = {
  value: Mood | null;
  /** Tapping the selected mood again clears it (null). */
  onChange: (mood: Mood | null) => void;
  size?: number;
};

export function MoodPicker({ value, onChange, size = 26 }: MoodPickerProps) {
  const palette = usePalette();

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {MOODS.map((mood) => {
        const selected = value === mood;
        return (
          <Pressable
            key={mood}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Mood ${mood} of 5`}
            hitSlop={4}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(selected ? null : mood);
            }}
            style={[
              styles.option,
              selected && {
                backgroundColor: palette.chip,
                borderColor: palette.accent,
              },
            ]}
          >
            <ThemedText
              style={{
                fontSize: size,
                lineHeight: size + 6,
                opacity: value && !selected ? 0.45 : 1,
              }}
            >
              {MOOD_FACES[mood]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
  option: {
    borderRadius: 20,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
});

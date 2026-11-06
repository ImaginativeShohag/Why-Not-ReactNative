import { Pressable, ScrollView, StyleSheet } from "react-native";

import {
  type PodcastColors,
  usePodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";

type Props<T> = {
  options: readonly T[];
  value: T;
  format: (option: T) => string;
  onChange: (option: T) => void;
  accent?: string;
};

/** Horizontal single-select chips (speed, sleep timer, skip intervals…). */
export function OptionChips<T>({
  options,
  value,
  format,
  onChange,
  accent,
}: Props<T>) {
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
  const chipAccent = accent ?? colors.accent;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A horizontal ScrollView inside a flex column grows to fill it
      // (flexGrow: 1), stretching the chips into tall pills.
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {options.map((o) => {
        const selected = format(o) === format(value);
        return (
          <Pressable
            key={format(o)}
            onPress={() => onChange(o)}
            style={[
              styles.chip,
              selected && {
                backgroundColor: chipAccent,
                borderColor: chipAccent,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>
              {format(o)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 0 },
    row: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    text: { color: c.text, fontSize: 13 },
    selectedText: { color: c.onAccent, fontWeight: "700" },
  });

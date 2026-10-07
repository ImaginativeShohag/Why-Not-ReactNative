import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import type { Mood } from "@/src/projects/offline-journal/models/Entry";
import { MOOD_FACES } from "@/src/projects/offline-journal/utils/exportFormat";
import { ThemedText } from "@/src/shared/components/themed-text";

import { HighlightedText } from "./HighlightedText";

export type SearchHitRowProps = {
  title: string;
  excerpt: string;
  dateLabel: string;
  mood: Mood | null;
  onPress: () => void;
};

export function SearchHitRow({
  title,
  excerpt,
  dateLabel,
  mood,
  onPress,
}: SearchHitRowProps) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: palette.border },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={styles.header}>
        <ThemedText
          type="defaultSemiBold"
          numberOfLines={1}
          style={[styles.title, { color: palette.text }]}
        >
          {mood ? `${MOOD_FACES[mood]} ` : ""}
          {title || "Untitled"}
        </ThemedText>
        <ThemedText style={[styles.date, { color: palette.muted }]}>
          {dateLabel}
        </ThemedText>
      </View>
      <HighlightedText
        text={excerpt}
        numberOfLines={2}
        style={[styles.excerpt, { color: palette.muted }]}
        highlightStyle={{ color: palette.text, backgroundColor: palette.chip }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1 },
  date: { fontSize: 12 },
  excerpt: { fontSize: 14, lineHeight: 20 },
});

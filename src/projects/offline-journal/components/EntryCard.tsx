import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import type { Mood } from "@/src/projects/offline-journal/models/Entry";
import { formatTime } from "@/src/projects/offline-journal/utils/date";
import { MOOD_FACES } from "@/src/projects/offline-journal/utils/exportFormat";
import { ThemedText } from "@/src/shared/components/themed-text";

// Plain data and callbacks. No db handle, no store, no navigation object — this
// component has no idea it belongs to the journal, which is why it is testable.
export type EntryCardProps = {
  title: string;
  excerpt: string;
  mood: Mood | null;
  time: Date;
  tags: string[];
  attachmentCount: number;
  onPress: () => void;
};

// memo: FlashList re-renders visible rows on every data change; rows whose
// props did not change should not pay for it.
export const EntryCard = memo(function EntryCard({
  title,
  excerpt,
  mood,
  time,
  tags,
  attachmentCount,
  onPress,
}: EntryCardProps) {
  const palette = usePalette();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title || "Untitled"}, ${formatTime(time)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <ThemedText style={styles.mood}>
          {mood ? MOOD_FACES[mood] : "·"}
        </ThemedText>
        <ThemedText
          type="defaultSemiBold"
          numberOfLines={1}
          style={[styles.title, { color: palette.text }]}
        >
          {title || "Untitled"}
        </ThemedText>
        {attachmentCount > 0 ? (
          <ThemedText style={[styles.meta, { color: palette.muted }]}>
            📎{attachmentCount}
          </ThemedText>
        ) : null}
      </View>

      {excerpt ? (
        <ThemedText
          numberOfLines={2}
          style={[styles.excerpt, { color: palette.text }]}
        >
          {excerpt}
        </ThemedText>
      ) : null}

      <View style={styles.row}>
        <ThemedText
          numberOfLines={1}
          style={[styles.meta, styles.tags, { color: palette.accent }]}
        >
          {tags.map((tag) => `#${tag}`).join(" ")}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: palette.muted }]}>
          {formatTime(time)}
        </ThemedText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  mood: { fontSize: 18 },
  title: { flexShrink: 1, flexGrow: 1 },
  excerpt: { opacity: 0.8, fontSize: 15, lineHeight: 21 },
  tags: { flex: 1 },
  meta: { fontSize: 12, lineHeight: 16 },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Chapter } from "@/src/projects/podcast-player/models/Episode";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import { formatDuration } from "@/src/projects/podcast-player/utils/format";

type Props = {
  chapters: Chapter[];
  /** Index of the chapter containing the playhead, or -1. */
  activeIndex: number;
  accent: string;
  onSelect: (chapter: Chapter) => void;
};

export function ChapterList({
  chapters,
  activeIndex,
  accent,
  onSelect,
}: Props) {
  if (chapters.length === 0) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.heading}>CHAPTERS</Text>
      {chapters.map((c, i) => {
        const active = i === activeIndex;
        return (
          <Pressable
            key={`${c.start}-${i}`}
            onPress={() => onSelect(c)}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`Chapter ${c.title} at ${formatDuration(c.start)}`}
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={active ? "radio-button-on" : "play-outline"}
              size={14}
              color={active ? accent : PodcastTheme.textMuted}
            />
            <Text style={styles.time}>{formatDuration(c.start)}</Text>
            <Text
              style={[styles.title, active && { color: accent }]}
              numberOfLines={1}
            >
              {c.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function activeChapterIndex(
  chapters: Chapter[],
  position: number,
): number {
  let idx = -1;
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].start <= position) idx = i;
    else break;
  }
  return idx;
}

const styles = StyleSheet.create({
  box: { gap: 4 },
  heading: {
    color: PodcastTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  time: {
    color: PodcastTheme.textMuted,
    fontVariant: ["tabular-nums"],
    width: 64,
  },
  title: { color: PodcastTheme.text, flex: 1 },
});

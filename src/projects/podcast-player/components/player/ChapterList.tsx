import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import type { Chapter } from "@/src/projects/podcast-player/models/Episode";
import {
  type PodcastColors,
  usePodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";
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
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
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
              color={active ? accent : colors.textMuted}
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

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    box: { gap: 4 },
    heading: {
      color: c.textMuted,
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
      color: c.textMuted,
      fontVariant: ["tabular-nums"],
      width: 64,
    },
    title: { color: c.text, flex: 1 },
  });

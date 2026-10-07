import { Pressable, StyleSheet, Text, View } from "react-native";

import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = { title: string; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    color: PodcastTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  action: { color: PodcastTheme.accent, fontSize: 13, fontWeight: "600" },
});

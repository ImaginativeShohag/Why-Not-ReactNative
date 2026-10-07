import { Pressable, StyleSheet, Text, View } from "react-native";

import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = { visible: boolean; onRestart: () => void; onDismiss: () => void };

/** "Update ready · Restart" — the prompt-to-restart EAS Update strategy. */
export function UpdateBanner({ visible, onRestart, onDismiss }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.text}>Update ready</Text>
      <View style={styles.actions}>
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button">
          <Text style={styles.later}>Later</Text>
        </Pressable>
        <Pressable
          onPress={onRestart}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.restart}
        >
          <Text style={styles.restartText}>Restart</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: PodcastTheme.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PodcastTheme.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: { color: PodcastTheme.text, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  later: { color: PodcastTheme.textMuted },
  restart: {
    backgroundColor: PodcastTheme.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restartText: { color: "#fff", fontWeight: "700" },
});

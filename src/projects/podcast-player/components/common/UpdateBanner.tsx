import { Pressable, StyleSheet, View } from "react-native";

import {
  type PodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";

type Props = { visible: boolean; onRestart: () => void; onDismiss: () => void };

/** "Update ready · Restart" — the prompt-to-restart EAS Update strategy. */
export function UpdateBanner({ visible, onRestart, onDismiss }: Props) {
  const styles = usePodcastStyles(createStyles);
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

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    banner: {
      margin: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    text: { color: c.text, fontWeight: "600" },
    actions: { flexDirection: "row", alignItems: "center", gap: 16 },
    later: { color: c.textMuted },
    restart: {
      backgroundColor: c.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    restartText: { color: c.onAccent, fontWeight: "700" },
  });

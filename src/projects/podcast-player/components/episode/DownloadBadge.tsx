import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = {
  state: DownloadState;
  /** 0..1, used while downloading */
  progress: number;
  onPress?: () => void;
  size?: number;
};

const LABELS: Record<DownloadState, string> = {
  idle: "Download",
  queued: "Queued",
  downloading: "Downloading",
  paused: "Paused",
  done: "Downloaded",
  failed: "Download failed, retry",
};

/** Download state, visible wherever an episode appears. */
export function DownloadBadge({ state, progress, onPress, size = 22 }: Props) {
  const color =
    state === "done"
      ? PodcastTheme.success
      : state === "failed"
        ? PodcastTheme.danger
        : PodcastTheme.textMuted;
  let content;
  if (state === "downloading") {
    content = (
      <View
        style={[
          styles.ring,
          { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
        ]}
      >
        <Text style={styles.pct}>{Math.round(progress * 100)}</Text>
      </View>
    );
  } else {
    const icon: keyof typeof Ionicons.glyphMap =
      state === "done"
        ? "checkmark-circle"
        : state === "queued"
          ? "time-outline"
          : state === "paused"
            ? "pause-circle-outline"
            : state === "failed"
              ? "alert-circle-outline"
              : "arrow-down-circle-outline";
    content = <Ionicons name={icon} size={size} color={color} />;
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={
        state === "downloading"
          ? `Downloading ${Math.round(progress * 100)} percent`
          : LABELS[state]
      }
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: PodcastTheme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pct: { color: PodcastTheme.text, fontSize: 9, fontWeight: "700" },
});

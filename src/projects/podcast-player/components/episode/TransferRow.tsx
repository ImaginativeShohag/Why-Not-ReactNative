import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DownloadBadge } from "@/src/projects/podcast-player/components/episode/DownloadBadge";
import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import type { DownloadView } from "@/src/projects/podcast-player/utils/downloadView";
import { formatBytes } from "@/src/projects/podcast-player/utils/format";

type Props = {
  title: string;
  view: DownloadView;
  error: string | null;
  attempts: number;
  onCancel: () => void;
  onBadgePress: () => void;
};

/** One in-flight / queued / failed download on the Downloads tab. */
export function TransferRow({
  title,
  view,
  error,
  attempts,
  onCancel,
  onBadgePress,
}: Props) {
  return (
    <View style={styles.transfer}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={onCancel}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Cancel download"
        >
          <Ionicons name="close" size={20} color={PodcastTheme.textMuted} />
        </Pressable>
      </View>
      <ProgressBar progress={view.progress} height={4} />
      <View style={styles.row}>
        <Text style={styles.meta}>
          {view.state === "downloading"
            ? `${Math.round(view.progress * 100)}% · ${formatBytes(view.bytesWritten)}`
            : view.state === "failed"
              ? `Failed${error ? ` — ${error}` : ""}`
              : view.state === "paused"
                ? `Paused · ${formatBytes(view.bytesWritten)}`
                : attempts > 0
                  ? `Retrying (attempt ${attempts + 1})`
                  : "Queued"}
        </Text>
        <DownloadBadge
          state={view.state}
          progress={view.progress}
          onPress={onBadgePress}
          size={20}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  transfer: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: { color: PodcastTheme.text, fontWeight: "600", flexShrink: 1 },
  meta: { color: PodcastTheme.textMuted, fontSize: 12, flexShrink: 1 },
});

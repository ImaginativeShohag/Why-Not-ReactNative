import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DownloadBadge } from "@/src/projects/podcast-player/components/episode/DownloadBadge";
import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = {
  title: string;
  /** e.g. "2h ago · 51 min" */
  meta: string;
  artworkUrl: string | null;
  showTitle?: string;
  /** 0..1 listened; hidden when 0 */
  listened: number;
  played: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  downloadState: DownloadState;
  downloadProgress: number;
  onPress: () => void;
  onPlay: () => void;
  onDownload: () => void;
  onLongPress?: () => void;
};

export function EpisodeRow({
  title,
  meta,
  artworkUrl,
  showTitle,
  listened,
  played,
  isCurrent,
  isPlaying,
  downloadState,
  downloadProgress,
  onPress,
  onPlay,
  onDownload,
  onLongPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
    >
      <Artwork uri={artworkUrl} size={56} title={showTitle ?? title} />
      <View style={styles.body}>
        {showTitle ? (
          <Text style={styles.show} numberOfLines={1}>
            {showTitle}
          </Text>
        ) : null}
        <Text style={[styles.title, played && styles.played]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {played ? `Played · ${meta}` : meta}
        </Text>
        {listened > 0 && !played ? (
          <View style={styles.progress}>
            <ProgressBar progress={listened} />
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <DownloadBadge
          state={downloadState}
          progress={downloadProgress}
          onPress={onDownload}
        />
        <Pressable
          onPress={onPlay}
          hitSlop={10}
          style={styles.play}
          accessibilityRole="button"
          accessibilityLabel={isCurrent && isPlaying ? "Pause" : "Play"}
        >
          <Ionicons
            name={isCurrent && isPlaying ? "pause-circle" : "play-circle"}
            size={34}
            color={isCurrent ? PodcastTheme.accent : PodcastTheme.text}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  pressed: { backgroundColor: PodcastTheme.surface },
  body: { flex: 1, gap: 2 },
  show: { color: PodcastTheme.textMuted, fontSize: 12 },
  title: { color: PodcastTheme.text, fontSize: 15, fontWeight: "600" },
  played: { color: PodcastTheme.textMuted },
  meta: { color: PodcastTheme.textMuted, fontSize: 12 },
  progress: { marginTop: 4, width: "70%" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  play: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

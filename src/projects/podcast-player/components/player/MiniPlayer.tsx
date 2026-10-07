import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { MINI_PLAYER_HEIGHT } from "@/src/projects/podcast-player/constants/layout";
import { PodcastTheme, shade } from "@/src/projects/podcast-player/utils/color";

type Props = {
  title: string;
  subtitle: string;
  artworkUrl: string | null;
  accent: string;
  playing: boolean;
  buffering: boolean;
  /**
   * Rendered along the bottom edge. A slot rather than a number so the
   * position ticks re-render only the bar, not the whole mini player.
   */
  progressBar: ReactNode;
  hasNext: boolean;
  onPress: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
};

export function MiniPlayer({
  title,
  subtitle,
  artworkUrl,
  accent,
  playing,
  buffering,
  progressBar,
  hasNext,
  onPress,
  onTogglePlay,
  onNext,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { backgroundColor: shade(accent, 0.7) }]}
      accessibilityRole="button"
      accessibilityLabel={`Now playing ${title}. Open player`}
      accessibilityHint="Drag up to expand"
      testID="mini-player"
    >
      <View style={styles.row}>
        <Artwork uri={artworkUrl} size={44} title={subtitle} radius={6} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          onPress={onTogglePlay}
          hitSlop={10}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : "Play"}
          testID="mini-player-toggle"
        >
          {buffering && playing ? (
            <ActivityIndicator color={PodcastTheme.text} />
          ) : (
            <Ionicons
              name={playing ? "pause" : "play"}
              size={28}
              color={PodcastTheme.text}
            />
          )}
        </Pressable>
        <Pressable
          onPress={onNext}
          disabled={!hasNext}
          hitSlop={10}
          style={[styles.button, !hasNext && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Next in queue"
        >
          <Ionicons
            name="play-skip-forward"
            size={24}
            color={PodcastTheme.text}
          />
        </Pressable>
      </View>
      {progressBar}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MINI_PLAYER_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  text: { flex: 1 },
  title: { color: PodcastTheme.text, fontWeight: "600", fontSize: 14 },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.35 },
});

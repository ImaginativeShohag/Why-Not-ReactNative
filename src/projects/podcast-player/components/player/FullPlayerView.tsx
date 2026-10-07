import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  GestureDetector,
  type GestureType,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DownloadBadge } from "@/src/projects/podcast-player/components/episode/DownloadBadge";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { ArtworkGradient } from "@/src/projects/podcast-player/components/player/ArtworkGradient";
import {
  activeChapterIndex,
  ChapterList,
} from "@/src/projects/podcast-player/components/player/ChapterList";
import { Scrubber } from "@/src/projects/podcast-player/components/player/Scrubber";
import { SkipButton } from "@/src/projects/podcast-player/components/player/SkipButton";
import { CONTROL_SIZE } from "@/src/projects/podcast-player/constants/layout";
import type {
  Chapter,
  DownloadState,
} from "@/src/projects/podcast-player/models/Episode";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

export type FullPlayerViewProps = {
  title: string;
  podcastTitle: string;
  artworkUrl: string | null;
  accent: string;
  position: number;
  duration: number;
  playing: boolean;
  buffering: boolean;
  rate: number;
  skipBackSec: number;
  skipForwardSec: number;
  chapters: Chapter[];
  hasNext: boolean;
  /** e.g. "12:30" or "End of ep." when a sleep timer is running */
  sleepLabel: string | null;
  statusNote: string | null;
  downloadState: DownloadState;
  downloadProgress: number;
  /** Rendered under the actions row (speed/sleep option panels). */
  panel?: ReactNode;
  /** Optional drag-to-dismiss gesture attached to the header + artwork. */
  dismissGesture?: GestureType;
  onClose: () => void;
  onMore: () => void;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onSpeedPress: () => void;
  onSleepPress: () => void;
  onDownload: () => void;
  onShare: () => void;
  onQueue: () => void;
};

/** The full "Now playing" layout. Pure props in, callbacks out. */
export function FullPlayerView(p: FullPlayerViewProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const artSize = Math.min(width - 64, 340);

  const top = (
    <View>
      <View style={styles.header}>
        <Pressable
          onPress={p.onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Ionicons name="chevron-down" size={30} color={PodcastTheme.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {p.podcastTitle}
        </Text>
        <Pressable
          onPress={p.onMore}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="More"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={26}
            color={PodcastTheme.text}
          />
        </Pressable>
      </View>
      <View style={styles.artWrap}>
        <Artwork
          uri={p.artworkUrl}
          size={artSize}
          title={p.podcastTitle}
          radius={16}
          style={{ transform: [{ scale: p.playing ? 1 : 0.9 }] }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ArtworkGradient accent={p.accent} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {p.dismissGesture ? (
          <GestureDetector gesture={p.dismissGesture}>{top}</GestureDetector>
        ) : (
          top
        )}

        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={2}>
            {p.title}
          </Text>
          <Text style={styles.podcast} numberOfLines={1}>
            {p.podcastTitle}
          </Text>
          {p.statusNote ? (
            <Text style={styles.note}>{p.statusNote}</Text>
          ) : null}
        </View>

        <Scrubber
          position={p.position}
          duration={p.duration}
          chapters={p.chapters}
          accent={PodcastTheme.text}
          onSeek={p.onSeek}
        />

        <View style={styles.controls}>
          <SkipButton
            direction="back"
            seconds={p.skipBackSec}
            color={PodcastTheme.text}
            onPress={p.onSkipBack}
          />
          <Pressable
            onPress={p.onTogglePlay}
            style={styles.play}
            accessibilityRole="button"
            accessibilityLabel={p.playing ? "Pause" : "Play"}
            testID="player-toggle"
          >
            {p.buffering && p.playing ? (
              <ActivityIndicator color={PodcastTheme.background} />
            ) : (
              <Ionicons
                name={p.playing ? "pause" : "play"}
                size={38}
                color={PodcastTheme.background}
                style={p.playing ? undefined : { marginLeft: 4 }}
              />
            )}
          </Pressable>
          <SkipButton
            direction="forward"
            seconds={p.skipForwardSec}
            color={PodcastTheme.text}
            onPress={p.onSkipForward}
          />
        </View>

        <View style={styles.actions}>
          <ActionButton
            label={`${formatRate(p.rate)}×`}
            onPress={p.onSpeedPress}
            accessibilityLabel="Playback speed"
          />
          <ActionButton
            icon="moon"
            label={p.sleepLabel ?? undefined}
            active={!!p.sleepLabel}
            onPress={p.onSleepPress}
            accessibilityLabel="Sleep timer"
          />
          <View style={styles.action}>
            <DownloadBadge
              state={p.downloadState}
              progress={p.downloadProgress}
              onPress={p.onDownload}
              size={24}
            />
          </View>
          <ActionButton
            icon="share-outline"
            onPress={p.onShare}
            accessibilityLabel="Share"
          />
          <ActionButton
            icon="play-skip-forward"
            onPress={p.onNext}
            disabled={!p.hasNext}
            accessibilityLabel="Next in queue"
          />
          <ActionButton
            icon="list"
            onPress={p.onQueue}
            accessibilityLabel="Up next"
          />
        </View>

        {p.panel}

        <ChapterList
          chapters={p.chapters}
          activeIndex={activeChapterIndex(p.chapters, p.position)}
          accent={PodcastTheme.text}
          onSelect={(c) => p.onSeek(c.start)}
        />
      </ScrollView>
    </View>
  );
}

function formatRate(rate: number): string {
  return Number.isInteger(rate)
    ? rate.toFixed(1)
    : String(Math.round(rate * 100) / 100);
}

function ActionButton({
  icon,
  label,
  active,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.action, disabled && { opacity: 0.35 }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={22}
          color={active ? "#FACC15" : PodcastTheme.text}
        />
      ) : null}
      {label ? (
        <Text style={[styles.actionLabel, active && { color: "#FACC15" }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PodcastTheme.background },
  content: { paddingHorizontal: 24, gap: 18 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  headerTitle: {
    color: PodcastTheme.textMuted,
    fontSize: 13,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  artWrap: { alignItems: "center", paddingVertical: 16 },
  titles: { gap: 4 },
  title: { color: PodcastTheme.text, fontSize: 21, fontWeight: "700" },
  podcast: { color: "rgba(255,255,255,0.7)", fontSize: 15 },
  note: { color: "#FACC15", fontSize: 12, marginTop: 2 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  play: {
    width: CONTROL_SIZE + 16,
    height: CONTROL_SIZE + 16,
    borderRadius: (CONTROL_SIZE + 16) / 2,
    backgroundColor: PodcastTheme.text,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  actionLabel: { color: PodcastTheme.text, fontWeight: "700", fontSize: 14 },
});

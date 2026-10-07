import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { OptionChips } from "@/src/projects/podcast-player/components/common/OptionChips";
import { FullPlayerView } from "@/src/projects/podcast-player/components/player/FullPlayerView";
import { useEpisodeActions } from "@/src/projects/podcast-player/hooks/useEpisodeActions";
import { useEpisode } from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import type { SleepTimerOption } from "@/src/projects/podcast-player/models/Episode";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { useDownloadStore } from "@/src/projects/podcast-player/stores/downloadStore";
import { usePlayerStore } from "@/src/projects/podcast-player/stores/playerStore";
import {
  RATE_OPTIONS,
  useSettingsStore,
} from "@/src/projects/podcast-player/stores/settingsStore";
import {
  accentFromSeed,
  PodcastTheme,
} from "@/src/projects/podcast-player/utils/color";
import { mergeDownload } from "@/src/projects/podcast-player/utils/downloadView";
import { formatDuration } from "@/src/projects/podcast-player/utils/format";

const SLEEP_OPTIONS: SleepTimerOption[] = [
  { kind: "off" },
  { kind: "minutes", minutes: 5 },
  { kind: "minutes", minutes: 15 },
  { kind: "minutes", minutes: 30 },
  { kind: "minutes", minutes: 45 },
  { kind: "minutes", minutes: 60 },
  { kind: "endOfEpisode" },
];

const sleepName = (o: SleepTimerOption) =>
  o.kind === "off"
    ? "Off"
    : o.kind === "endOfEpisode"
      ? "End of episode"
      : `${o.minutes} min`;

export default function NowPlayingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const status = usePlayerStore((s) => s.status);
  const hasNext = usePlayerStore((s) => s.queue.length > 0);
  const sleepOption = usePlayerStore((s) => s.sleepOption);
  const sleepRemainingMs = usePlayerStore((s) => s.sleepRemainingMs);
  const pausedExternally = usePlayerStore((s) => s.pausedExternally);
  const skipBackSec = useSettingsStore((s) => s.skipBackSec);
  const skipForwardSec = useSettingsStore((s) => s.skipForwardSec);
  const actions = useEpisodeActions();
  const episode = useEpisode(nowPlaying?.episodeId ?? "");
  const live = useDownloadStore((s) =>
    nowPlaying ? s.live[nowPlaying.episodeId] : undefined,
  );
  const [panel, setPanel] = useState<"speed" | "sleep" | null>(null);

  const translateY = useSharedValue(0);

  useEffect(() => {
    // Player stopped while the modal is open (or deep-linked with nothing loaded).
    if (!nowPlaying && router.canGoBack()) router.back();
  }, [nowPlaying, router]);

  const close = () => router.back();

  const dismiss = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (translateY.value > 140 || e.velocityY > 900) {
        translateY.value = withTiming(height, { duration: 200 }, (done) => {
          if (done) scheduleOnRN(close);
        });
      } else {
        translateY.value = withSpring(0);
      }
    });
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!nowPlaying) return <View style={styles.root} />;

  const dl = mergeDownload(live, {
    state: episode.data?.downloadState ?? "idle",
    bytes: episode.data?.downloadedBytes ?? null,
  });
  const sleepLabel =
    sleepOption.kind === "off"
      ? null
      : sleepOption.kind === "endOfEpisode"
        ? "End"
        : sleepRemainingMs != null
          ? formatDuration(sleepRemainingMs / 1000)
          : null;

  const panelNode =
    panel === "speed" ? (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Playback speed</Text>
        <OptionChips
          options={RATE_OPTIONS}
          value={status.rate}
          format={(r) => `${r}×`}
          onChange={(r) => playbackService.setRate(r)}
        />
      </View>
    ) : panel === "sleep" ? (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          Sleep timer · fades out over the last 10 s
        </Text>
        <OptionChips
          options={SLEEP_OPTIONS}
          value={sleepOption}
          format={sleepName}
          onChange={(o) => playbackService.setSleepTimer(o)}
        />
      </View>
    ) : null;

  return (
    <Animated.View style={[styles.root, sheetStyle]}>
      <FullPlayerView
        title={nowPlaying.title}
        podcastTitle={nowPlaying.podcastTitle}
        artworkUrl={nowPlaying.artworkUrl}
        accent={accentFromSeed(nowPlaying.artworkUrl ?? nowPlaying.podcastId)}
        position={status.position}
        duration={status.duration}
        playing={status.playing}
        buffering={status.buffering}
        rate={status.rate}
        skipBackSec={skipBackSec}
        skipForwardSec={skipForwardSec}
        chapters={nowPlaying.chapters}
        hasNext={hasNext}
        sleepLabel={sleepLabel}
        statusNote={
          status.error
            ? `Playback error: ${status.error}`
            : pausedExternally
              ? "Paused by the system (call, headphones or lock screen)"
              : nowPlaying.isLocal
                ? "Playing from download"
                : null
        }
        downloadState={dl.state}
        downloadProgress={dl.progress}
        panel={panelNode}
        dismissGesture={dismiss}
        onClose={close}
        onMore={() =>
          actions.more(nowPlaying.episodeId, episode.data?.played ?? false)
        }
        onTogglePlay={() => playbackService.toggle()}
        onSkipBack={() => playbackService.skipBack()}
        onSkipForward={() => playbackService.skipForward()}
        onNext={() => void playbackService.next()}
        onSeek={(s) => void playbackService.seekTo(s)}
        onSpeedPress={() => setPanel((p) => (p === "speed" ? null : "speed"))}
        onSleepPress={() => setPanel((p) => (p === "sleep" ? null : "sleep"))}
        onDownload={() => actions.download(nowPlaying.episodeId, dl.state)}
        onShare={() =>
          void Share.share({
            message: `${nowPlaying.title} — ${nowPlaying.podcastTitle}${episode.data ? `\n${episode.data.audioUrl}` : ""}`,
          })
        }
        onQueue={() => {
          router.back();
          router.navigate("/projects/podcast-player/queue");
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PodcastTheme.background },
  panel: { gap: 8, marginHorizontal: -24 },
  panelTitle: {
    color: PodcastTheme.textMuted,
    fontSize: 12,
    paddingHorizontal: 24,
  },
});

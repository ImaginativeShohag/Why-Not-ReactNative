import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ShowNotes } from "@/src/projects/podcast-player/components/common/ShowNotes";
import { DownloadBadge } from "@/src/projects/podcast-player/components/episode/DownloadBadge";
import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import {
  activeChapterIndex,
  ChapterList,
} from "@/src/projects/podcast-player/components/player/ChapterList";
import { MINI_PLAYER_CONTENT_INSET } from "@/src/projects/podcast-player/constants/layout";
import { useEpisodeActions } from "@/src/projects/podcast-player/hooks/useEpisodeActions";
import { useEpisode } from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { useDownloadStore } from "@/src/projects/podcast-player/stores/downloadStore";
import { usePlayerStore } from "@/src/projects/podcast-player/stores/playerStore";
import {
  accentFromSeed,
  PodcastTheme,
} from "@/src/projects/podcast-player/utils/color";
import { mergeDownload } from "@/src/projects/podcast-player/utils/downloadView";
import {
  formatDurationShort,
  formatRelativeDate,
} from "@/src/projects/podcast-player/utils/format";
import { extractLinks } from "@/src/projects/podcast-player/utils/html";

export default function EpisodeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const episode = useEpisode(id);
  const actions = useEpisodeActions();
  const live = useDownloadStore((s) => s.live[id]);
  const isCurrent = usePlayerStore((s) => s.nowPlaying?.episodeId === id);
  const livePosition = usePlayerStore((s) =>
    s.nowPlaying?.episodeId === id ? s.status.position : null,
  );

  if (episode.isLoading)
    return (
      <ActivityIndicator style={styles.center} color={PodcastTheme.textMuted} />
    );
  const e = episode.data;
  if (!e)
    return (
      <Text style={[styles.center, styles.muted]}>Episode not found.</Text>
    );

  const accent = accentFromSeed(
    e.artworkUrl ?? e.podcastArtworkUrl ?? e.podcastId,
  );
  const dl = mergeDownload(live, {
    state: e.downloadState,
    bytes: e.downloadedBytes,
  });
  const position = livePosition ?? e.position;
  const playing = isCurrent && actions.playing;

  const seek = (seconds: number) => {
    if (isCurrent) void playbackService.seekTo(seconds);
    else void playbackService.load(e.id, { autoplay: true, startAt: seconds });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: MINI_PLAYER_CONTENT_INSET + 24 },
      ]}
    >
      <View style={styles.hero}>
        <Artwork
          uri={e.artworkUrl ?? e.podcastArtworkUrl}
          size={96}
          title={e.podcastTitle}
          radius={12}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.show}>{e.podcastTitle}</Text>
          <Text style={styles.title}>{e.title}</Text>
          <Text style={styles.muted}>
            {[
              formatRelativeDate(e.publishedAt),
              formatDurationShort(e.duration),
              e.played ? "Played" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </View>

      {e.duration && position > 0 && !e.played ? (
        <ProgressBar progress={position / e.duration} color={accent} />
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => actions.play(e.id)}
          style={[styles.play, { backgroundColor: accent }]}
          accessibilityRole="button"
          testID="episode-play"
        >
          <Ionicons name={playing ? "pause" : "play"} size={20} color="#fff" />
          <Text style={styles.playText}>
            {playing
              ? "Pause"
              : position > 30 && !e.played
                ? `Resume · ${formatDurationShort((e.duration ?? 0) - position)} left`
                : "Play"}
          </Text>
        </Pressable>
        <DownloadBadge
          state={dl.state}
          progress={dl.progress}
          onPress={() => actions.download(e.id, dl.state)}
          size={28}
        />
        <Pressable
          onPress={() => actions.more(e.id, e.played)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="More"
        >
          <Ionicons
            name="ellipsis-horizontal-circle"
            size={30}
            color={PodcastTheme.text}
          />
        </Pressable>
      </View>

      <ChapterList
        chapters={e.chapters}
        activeIndex={isCurrent ? activeChapterIndex(e.chapters, position) : -1}
        accent={accent}
        onSelect={(c) => seek(c.start)}
      />

      <ShowNotes
        text={e.notes}
        links={extractLinks(e.notesHtml)}
        accent={accent}
        onSeek={seek}
        onOpenLink={(url) => void WebBrowser.openBrowserAsync(url)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PodcastTheme.background },
  center: { flex: 1, textAlign: "center", marginTop: 48 },
  content: { padding: 16, gap: 20 },
  hero: { flexDirection: "row", gap: 16 },
  show: { color: PodcastTheme.textMuted, fontSize: 13 },
  title: { color: PodcastTheme.text, fontSize: 20, fontWeight: "700" },
  muted: { color: PodcastTheme.textMuted, fontSize: 13 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  play: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
  },
  playText: { color: "#fff", fontWeight: "700" },
});

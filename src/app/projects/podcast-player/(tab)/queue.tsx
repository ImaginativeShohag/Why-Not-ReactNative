import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SectionHeader } from "@/src/projects/podcast-player/components/common/SectionHeader";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { QueueRow } from "@/src/projects/podcast-player/components/queue/QueueRow";
import { ReorderableList } from "@/src/projects/podcast-player/components/queue/ReorderableList";
import { MINI_PLAYER_CONTENT_INSET } from "@/src/projects/podcast-player/constants/layout";
import { useQueueEpisodes } from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { usePlayerStore } from "@/src/projects/podcast-player/stores/playerStore";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import { formatDurationShort } from "@/src/projects/podcast-player/utils/format";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

const ROW_HEIGHT = 72;

export default function PodcastQueueScreen() {
  const router = useRouter();
  const queue = usePlayerStore((s) => s.queue);
  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const episodes = useQueueEpisodes(queue);

  // Render in queue order; rows whose episode hasn't loaded yet are skipped.
  const byId = new Map((episodes.data ?? []).map((e) => [e.id, e]));
  const items = queue.map((q) => byId.get(q.episodeId)).filter((e) => !!e);

  const header = (
    <View>
      {nowPlaying ? (
        <>
          <SectionHeader title="Now playing" />
          <Pressable
            style={styles.now}
            onPress={() =>
              router.push({
                pathname: "/projects/podcast-player/player",
                params: { from: "tap" },
              })
            }
            accessibilityRole="button"
          >
            <Artwork
              uri={nowPlaying.artworkUrl}
              size={48}
              title={nowPlaying.podcastTitle}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.nowTitle} numberOfLines={1}>
                {nowPlaying.title}
              </Text>
              <Text style={styles.nowShow}>{nowPlaying.podcastTitle}</Text>
            </View>
          </Pressable>
        </>
      ) : null}
      <SectionHeader
        title={`Up next${items.length ? ` (${items.length})` : ""}`}
        actionLabel={items.length ? "Clear" : undefined}
        onAction={() => playbackService.clearQueue()}
      />
      {items.length === 0 ? (
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="list-outline"
          iconColor={PodcastTheme.textMuted}
          title="Nothing queued"
          description="Long-press an episode and choose “Play next” or “Add to queue”."
          titleColor={PodcastTheme.text}
          descriptionColor={PodcastTheme.textMuted}
        />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <ReorderableList
        items={items}
        keyOf={(e) => e.id}
        rowHeight={ROW_HEIGHT}
        header={header}
        contentInsetBottom={MINI_PLAYER_CONTENT_INSET + 16}
        onMove={(from, to) => {
          // Map visible indices back to queue indices (rows may be filtered).
          const a = queue.findIndex((q) => q.episodeId === items[from]?.id);
          const b = queue.findIndex((q) => q.episodeId === items[to]?.id);
          if (a >= 0 && b >= 0) playbackService.moveInQueue(a, b);
        }}
        onRemove={(id) => playbackService.removeFromQueue(id)}
        renderRow={(e) => (
          <QueueRow
            title={e.title}
            showTitle={e.podcastTitle}
            artworkUrl={e.artworkUrl ?? e.podcastArtworkUrl}
            meta={formatDurationShort(e.duration)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PodcastTheme.background },
  now: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nowTitle: { color: PodcastTheme.text, fontWeight: "600" },
  nowShow: { color: PodcastTheme.textMuted, fontSize: 12 },
});

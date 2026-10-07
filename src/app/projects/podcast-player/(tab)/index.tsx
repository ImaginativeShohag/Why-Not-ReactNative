import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { SectionHeader } from "@/src/projects/podcast-player/components/common/SectionHeader";
import { UpdateBanner } from "@/src/projects/podcast-player/components/common/UpdateBanner";
import { LiveEpisodeRow } from "@/src/projects/podcast-player/containers/LiveEpisodeRow";
import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { PodcastTile } from "@/src/projects/podcast-player/components/podcast/PodcastTile";
import { MINI_PLAYER_CONTENT_INSET } from "@/src/projects/podcast-player/constants/layout";
import { useEpisodeActions } from "@/src/projects/podcast-player/hooks/useEpisodeActions";
import {
  useContinueListening,
  useNewEpisodes,
  useRefreshSubscriptions,
  useSubscriptions,
} from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import { useUpdateBanner } from "@/src/projects/podcast-player/lib/updates";
import type { EpisodeListItem } from "@/src/projects/podcast-player/models/Episode";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import {
  formatDurationShort,
  formatRelativeDate,
} from "@/src/projects/podcast-player/utils/format";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

export default function PodcastHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const subs = useSubscriptions();
  const fresh = useNewEpisodes();
  const cont = useContinueListening();
  const refresh = useRefreshSubscriptions();
  const actions = useEpisodeActions();
  const update = useUpdateBanner();

  const tile = (width - 16 * 2 - 12 * 3) / 4;
  const openEpisode = (id: string) =>
    router.push({
      pathname: "/projects/podcast-player/episode/[id]",
      params: { id },
    });

  const renderRow = (e: EpisodeListItem) => {
    return (
      <LiveEpisodeRow
        key={e.id}
        title={e.title}
        showTitle={e.podcastTitle}
        meta={[
          formatRelativeDate(e.publishedAt),
          formatDurationShort(e.duration),
        ]
          .filter(Boolean)
          .join(" · ")}
        artworkUrl={e.artworkUrl ?? e.podcastArtworkUrl}
        listened={e.duration ? e.position / e.duration : 0}
        played={e.played}
        isCurrent={actions.currentId === e.id}
        isPlaying={actions.playing}
        episodeId={e.id}
        fallback={{ state: e.downloadState, bytes: e.downloadedBytes }}
        onPress={() => openEpisode(e.id)}
        onPlay={() => actions.play(e.id)}
        onDownload={(state) => actions.download(e.id, state)}
        onLongPress={() => actions.more(e.id, e.played)}
      />
    );
  };

  const empty = !subs.isLoading && (subs.data?.length ?? 0) === 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: MINI_PLAYER_CONTENT_INSET + 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refresh.isPending}
          onRefresh={() => refresh.mutate()}
          tintColor={PodcastTheme.textMuted}
        />
      }
    >
      <UpdateBanner
        visible={update.visible}
        onRestart={update.restart}
        onDismiss={update.dismiss}
      />

      {empty ? (
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="radio-outline"
          iconColor={PodcastTheme.textMuted}
          title="No subscriptions yet"
          description="Find a show you like and subscribe to see new episodes here."
          titleColor={PodcastTheme.text}
          descriptionColor={PodcastTheme.textMuted}
          action={{
            label: "Discover podcasts",
            onPress: () => router.push("/projects/podcast-player/discover"),
            color: PodcastTheme.accent,
          }}
        />
      ) : null}

      {(cont.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="Continue listening" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cards}
          >
            {cont.data!.map((e) => (
              <Pressable
                key={e.id}
                style={styles.card}
                onPress={() => actions.play(e.id)}
                onLongPress={() => openEpisode(e.id)}
                accessibilityRole="button"
                accessibilityLabel={`Resume ${e.title}`}
              >
                <Artwork
                  uri={e.artworkUrl ?? e.podcastArtworkUrl}
                  size={48}
                  title={e.podcastTitle}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <ProgressBar
                    progress={e.duration ? e.position / e.duration : 0}
                    height={4}
                  />
                  <Text style={styles.cardMeta}>
                    {e.duration
                      ? `${formatDurationShort(e.duration - e.position)} left`
                      : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {(fresh.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="New episodes" />
          {fresh.data!.slice(0, 15).map(renderRow)}
        </>
      ) : null}

      {(subs.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="Shows" />
          <View style={styles.grid}>
            {subs.data!.map((p) => (
              <PodcastTile
                key={p.id}
                title={p.title}
                artworkUrl={p.artworkUrl}
                size={tile}
                onPress={() =>
                  router.push({
                    pathname: "/projects/podcast-player/podcast/[id]",
                    params: { id: p.id },
                  })
                }
              />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PodcastTheme.background },
  cards: { paddingHorizontal: 16, gap: 12 },
  card: {
    width: 280,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: PodcastTheme.surface,
    alignItems: "center",
  },
  cardBody: { flex: 1, gap: 6 },
  cardTitle: { color: PodcastTheme.text, fontWeight: "600" },
  cardMeta: { color: PodcastTheme.textMuted, fontSize: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
});

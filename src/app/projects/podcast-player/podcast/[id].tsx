import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import Text from "@/src/projects/podcast-player/components/common/PodcastText";
import { LiveEpisodeRow } from "@/src/projects/podcast-player/containers/LiveEpisodeRow";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import {
  type PodcastColors,
  usePodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import { useMiniPlayerInset } from "@/src/projects/podcast-player/hooks/useMiniPlayerInset";
import {
  getAutoDownload,
  setAutoDownload,
} from "@/src/projects/podcast-player/db/queries";
import { syncFeed } from "@/src/projects/podcast-player/feeds/sync";
import { useEpisodeActions } from "@/src/projects/podcast-player/hooks/useEpisodeActions";
import {
  usePodcast,
  usePodcastEpisodes,
  useSubscribe,
} from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import { accentFromSeed } from "@/src/projects/podcast-player/utils/color";
import {
  formatDurationShort,
  formatRelativeDate,
} from "@/src/projects/podcast-player/utils/format";
import { podcastKeys } from "@/src/projects/podcast-player/utils/queryKeys";

export default function PodcastDetailScreen() {
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
  const miniInset = useMiniPlayerInset();
  const params = useLocalSearchParams<{
    id: string;
    feedUrl?: string;
    artworkUrl?: string;
  }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const podcast = usePodcast(id, {
    feedUrl: params.feedUrl,
    artworkUrl: params.artworkUrl || null,
  });
  const episodes = usePodcastEpisodes(id, podcast.isSuccess);
  const subscribe = useSubscribe();
  const actions = useEpisodeActions();
  const [expanded, setExpanded] = useState(false);

  const autoDl = useQuery({
    queryKey: podcastKeys.showAutoDownload(id),
    queryFn: () => getAutoDownload(id),
    enabled: podcast.isSuccess,
  });
  const toggleAuto = useMutation({
    mutationFn: (enabled: boolean) => setAutoDownload(id, enabled),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: podcastKeys.showAutoDownload(id),
      }),
  });
  const refresh = useMutation({
    mutationFn: async () => {
      if (podcast.data)
        await syncFeed(podcast.data.feedUrl, { id, force: true });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: podcastKeys.show(id) }),
  });

  if (podcast.isLoading) {
    return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  }
  if (!podcast.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Couldn’t load this podcast’s feed.</Text>
        <Pressable onPress={() => podcast.refetch()} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  const p = podcast.data;
  const accent = accentFromSeed(p.artworkUrl ?? p.id);

  // The off track needs to stay visibly grey against a white screen.
  const offTrack = colors.trackOff;

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <Artwork uri={p.artworkUrl} size={120} title={p.title} radius={14} />
        <View style={styles.heroText}>
          <Text style={styles.title} numberOfLines={3}>
            {p.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {p.author}
          </Text>
          <Pressable
            onPress={() =>
              subscribe.mutate({
                id,
                subscribe: !p.subscribed,
                feedUrl: p.feedUrl,
              })
            }
            style={[
              styles.subscribe,
              {
                backgroundColor: p.subscribed ? colors.surfaceRaised : accent,
              },
            ]}
            accessibilityRole="button"
            testID="podcast-subscribe"
          >
            <Text
              style={[
                styles.subscribeText,
                // White on the artwork-derived accent; themed text on the grey fill.
                { color: p.subscribed ? colors.text : colors.onAccent },
              ]}
            >
              {p.subscribed ? "Subscribed ✓" : "Subscribe"}
            </Text>
          </Pressable>
        </View>
      </View>
      {p.description ? (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : 3}
          >
            {p.description}
          </Text>
        </Pressable>
      ) : null}
      {p.categories.length > 0 ? (
        <Text style={styles.categories}>{p.categories.join(" · ")}</Text>
      ) : null}
      {p.subscribed ? (
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto-download new episodes</Text>
          <Switch
            value={autoDl.data ?? false}
            onValueChange={(v) => toggleAuto.mutate(v)}
            accessibilityLabel="Auto-download new episodes"
            trackColor={{ true: accent, false: offTrack }}
            thumbColor="#FFFFFF"
          />
        </View>
      ) : null}
      <Text style={styles.count}>
        {episodes.data
          ? `${episodes.data.length} episodes`
          : "Loading episodes…"}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: p.title }} />
      <FlashList
        data={episodes.data ?? []}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingBottom: miniInset + 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refresh.isPending}
            onRefresh={() => refresh.mutate()}
            tintColor={colors.textMuted}
          />
        }
        renderItem={({ item: e }) => {
          return (
            <LiveEpisodeRow
              title={e.title}
              meta={[
                formatRelativeDate(e.publishedAt),
                formatDurationShort(e.duration),
              ]
                .filter(Boolean)
                .join(" · ")}
              artworkUrl={e.artworkUrl ?? p.artworkUrl}
              listened={e.duration ? e.position / e.duration : 0}
              played={e.played}
              isCurrent={actions.currentId === e.id}
              isPlaying={actions.playing}
              episodeId={e.id}
              fallback={{ state: e.downloadState, bytes: e.downloadedBytes }}
              onPress={() =>
                router.push({
                  pathname: "/projects/podcast-player/episode/[id]",
                  params: { id: e.id },
                })
              }
              onPlay={() => actions.play(e.id)}
              onDownload={(state) => actions.download(e.id, state)}
              onLongPress={() => actions.more(e.id, e.played)}
            />
          );
        }}
      />
    </View>
  );
}

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
      gap: 12,
    },
    error: { color: c.textMuted },
    retry: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.surfaceRaised,
    },
    retryText: { color: c.text },
    header: { padding: 16, gap: 12 },
    hero: { flexDirection: "row", gap: 16 },
    heroText: { flex: 1, gap: 6, justifyContent: "center" },
    title: { color: c.text, fontSize: 20, fontWeight: "700" },
    author: { color: c.textMuted },
    subscribe: {
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      marginTop: 4,
    },
    subscribeText: { color: c.onAccent, fontWeight: "700" },
    description: { color: c.textMuted, lineHeight: 20 },
    categories: { color: c.textMuted, fontSize: 12 },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingLabel: { color: c.text },
    count: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
      marginTop: 8,
    },
  });

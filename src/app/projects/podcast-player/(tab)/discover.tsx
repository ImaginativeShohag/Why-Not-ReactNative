import Ionicons from "@expo/vector-icons/Ionicons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";

import { OptionChips } from "@/src/projects/podcast-player/components/common/OptionChips";
import { PodcastRow } from "@/src/projects/podcast-player/components/podcast/PodcastRow";
import { MINI_PLAYER_CONTENT_INSET } from "@/src/projects/podcast-player/constants/layout";
import { GENRES } from "@/src/projects/podcast-player/feeds/index-api";
import {
  usePodcastSearch,
  useSubscribe,
  useSubscriptions,
  useTopPodcasts,
} from "@/src/projects/podcast-player/hooks/usePodcastQueries";
import type { SearchResult } from "@/src/projects/podcast-player/models/Episode";
import {
  type PodcastColors,
  usePodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";

export default function PodcastDiscoverScreen() {
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
  const router = useRouter();
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);

  // Debounce keystrokes so we don't hit the index on every character.
  useEffect(() => {
    const t = setTimeout(() => setTerm(text), 350);
    return () => clearTimeout(t);
  }, [text]);

  const searching = term.trim().length >= 2;
  const search = usePodcastSearch(term);
  const top = useTopPodcasts(genre.id);
  const subs = useSubscriptions();
  const subscribe = useSubscribe();

  const subscribedFeeds = new Set((subs.data ?? []).map((p) => p.feedUrl));
  const subscribedIds = new Set((subs.data ?? []).map((p) => p.id));
  const query = searching ? search : top;
  const data = query.data ?? [];

  const isSubscribed = (r: SearchResult) =>
    subscribedIds.has(r.id) || subscribedFeeds.has(r.feedUrl);

  return (
    <View style={styles.root}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search podcasts"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          testID="podcast-search-input"
          accessibilityLabel="Search podcasts"
        />
      </View>
      {!searching ? (
        <OptionChips
          options={GENRES}
          value={genre}
          format={(g) => g.name}
          onChange={setGenre}
        />
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.textMuted} />
      ) : null}
      {query.isError ? (
        <Text style={styles.message}>
          Couldn’t reach the podcast index. Check your connection.
        </Text>
      ) : null}
      {searching && !query.isLoading && data.length === 0 && !query.isError ? (
        <Text style={styles.message}>No podcasts found for “{term}”.</Text>
      ) : null}

      <FlashList
        data={data}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingBottom: MINI_PLAYER_CONTENT_INSET + 16,
        }}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <PodcastRow
            title={item.title}
            author={item.author}
            artworkUrl={item.artworkUrl}
            caption={[
              item.genre,
              item.episodeCount ? `${item.episodeCount} episodes` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            subscribed={isSubscribed(item)}
            busy={subscribe.isPending && subscribe.variables?.id === item.id}
            onPress={() =>
              router.push({
                pathname: "/projects/podcast-player/podcast/[id]",
                params: {
                  id: item.id,
                  feedUrl: item.feedUrl,
                  artworkUrl: item.artworkUrl ?? "",
                },
              })
            }
            onToggleSubscribe={() =>
              subscribe.mutate({
                id: item.id,
                subscribe: !isSubscribed(item),
                feedUrl: item.feedUrl,
                result: item,
              })
            }
          />
        )}
      />
    </View>
  );
}

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      margin: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      color: c.text,
      paddingVertical: 12,
      fontSize: 16,
    },
    loading: { marginTop: 24 },
    message: {
      color: c.textMuted,
      textAlign: "center",
      marginTop: 24,
      paddingHorizontal: 32,
    },
  });

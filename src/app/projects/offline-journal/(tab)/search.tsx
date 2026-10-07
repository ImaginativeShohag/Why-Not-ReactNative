import Ionicons from "@expo/vector-icons/Ionicons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { SearchHitRow } from "@/src/projects/offline-journal/components/SearchHitRow";
import { useTags } from "@/src/projects/offline-journal/hooks/useEntries";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { useSearch } from "@/src/projects/offline-journal/hooks/useSearch";
import type { Mood } from "@/src/projects/offline-journal/models/Entry";
import {
  MOOD_FACES,
  MOODS,
} from "@/src/projects/offline-journal/utils/exportFormat";
import { formatShortDate } from "@/src/projects/offline-journal/utils/date";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";
import { ThemedText } from "@/src/shared/components/themed-text";

export default function SearchScreen() {
  const palette = usePalette();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const { data: hits, loaded, settled } = useSearch(text, mood, tag);
  const { data: tags } = useTags();

  const hasQuery = text.trim().length > 0 || mood !== null || tag !== null;

  const chip = (
    label: string,
    selected: boolean,
    onPress: () => void,
    key: string,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? palette.accent : palette.chip },
      ]}
    >
      <ThemedText
        style={[
          styles.chipText,
          { color: selected ? palette.accentText : palette.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={[styles.fill, { backgroundColor: palette.paper }]}>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
      >
        <Ionicons name="search" size={18} color={palette.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search your journal"
          placeholderTextColor={palette.muted}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          style={[styles.input, { color: palette.text }]}
        />
        {text ? (
          <Pressable
            onPress={() => setText("")}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterBar}
      >
        {MOODS.map((m) =>
          chip(
            MOOD_FACES[m],
            mood === m,
            () => setMood(mood === m ? null : m),
            `m${m}`,
          ),
        )}
        {tags.length > 0 ? (
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
        ) : null}
        {tags.map((t) =>
          chip(
            `#${t.name}`,
            tag === t.name,
            () => setTag(tag === t.name ? null : t.name),
            `t${t.name}`,
          ),
        )}
      </ScrollView>

      {!hasQuery ? (
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="search-outline"
          title="Search every entry"
          description="Full-text search runs on the device, so it works in airplane mode."
        />
      ) : loaded && settled && hits.length === 0 ? (
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="document-text-outline"
          title="No matching entries"
          description="Try fewer words, or clear a filter."
        />
      ) : (
        <FlashList
          data={hits}
          keyExtractor={(hit) => hit.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <ThemedText style={[styles.count, { color: palette.muted }]}>
              {hits.length === 1 ? "1 result" : `${hits.length} results`}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <SearchHitRow
              title={item.title}
              excerpt={item.excerpt}
              mood={item.mood}
              dateLabel={formatShortDate(item.createdAt)}
              onPress={() =>
                router.push({
                  pathname: "/projects/offline-journal/entry/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  filterBar: { flexGrow: 0 },
  filters: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: "center",
    paddingBottom: 8,
  },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 14, lineHeight: 20 },
  divider: { width: 1, height: 20, marginHorizontal: 4 },
  count: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13 },
});

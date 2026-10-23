import Ionicons from "@expo/vector-icons/Ionicons";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";

import { EntryCard } from "@/src/projects/offline-journal/components/EntryCard";
import { Fab } from "@/src/projects/offline-journal/components/Fab";
import { SwipeToDelete } from "@/src/projects/offline-journal/components/SwipeToDelete";
import { SyncBanner } from "@/src/projects/offline-journal/components/SyncBanner";
import { UndoSnackbar } from "@/src/projects/offline-journal/components/UndoSnackbar";
import { useDeleteWithUndo } from "@/src/projects/offline-journal/hooks/useDeleteWithUndo";
import {
  useDeleteEntry,
  useEntries,
} from "@/src/projects/offline-journal/hooks/useEntries";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { useSyncStatus } from "@/src/projects/offline-journal/hooks/useSyncStatus";
import {
  useSettingsHydrated,
  useSettingsStore,
} from "@/src/projects/offline-journal/stores/settingsStore";
import { parseDayKey } from "@/src/projects/offline-journal/utils/date";
import {
  headerIndices,
  toRows,
  type TimelineRow,
} from "@/src/projects/offline-journal/utils/timeline";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";
import { ThemedText } from "@/src/shared/components/themed-text";

const PAGE = 100;

export default function TimelineScreen() {
  const palette = usePalette();
  const hydrated = useSettingsHydrated();
  const onboarded = useSettingsStore((state) => state.onboarded);
  const { day } = useLocalSearchParams<{ day?: string }>();
  const filterDate = parseDayKey(day);

  const [limit, setLimit] = useState(PAGE);
  const { data: entries, loaded } = useEntries({
    day: filterDate ? day : null,
    limit,
  });

  const listRef = useRef<FlashListRef<TimelineRow>>(null);
  const deleteEntry = useDeleteEntry();
  const { pendingId, remove, undo } = useDeleteWithUndo(deleteEntry);
  const sync = useSyncStatus();

  const onDelete = useCallback(
    (id: string) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Subtle motion only: let the list animate the gap closing.
      listRef.current?.prepareForLayoutAnimationRender();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      remove(id);
    },
    [remove],
  );

  const onUndo = useCallback(() => {
    listRef.current?.prepareForLayoutAnimationRender();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    undo();
  }, [undo]);

  // The optimistic part: the row is gone from the UI while the DB still has it.
  const rows = useMemo(
    () => toRows(entries.filter((entry) => entry.id !== pendingId)),
    [entries, pendingId],
  );
  const stickyHeaderIndices = useMemo(() => headerIndices(rows), [rows]);

  // Gate on hydration, or every cold start flashes onboarding.
  if (hydrated && !onboarded) {
    return <Redirect href="/projects/offline-journal/onboarding" />;
  }

  const renderItem = ({ item }: { item: TimelineRow }) =>
    item.kind === "header" ? (
      <View style={[styles.header, { backgroundColor: palette.paper }]}>
        <ThemedText style={[styles.headerText, { color: palette.muted }]}>
          {item.label}
        </ThemedText>
      </View>
    ) : (
      <SwipeToDelete onDelete={() => onDelete(item.entry.id)}>
        <EntryCard
          title={item.entry.title}
          excerpt={item.entry.body}
          mood={item.entry.mood}
          time={item.entry.createdAt}
          tags={item.entry.tags}
          attachmentCount={item.entry.attachmentCount}
          onPress={() =>
            router.push({
              pathname: "/projects/offline-journal/entry/[id]",
              params: { id: item.entry.id },
            })
          }
        />
      </SwipeToDelete>
    );

  return (
    <View style={[styles.fill, { backgroundColor: palette.paper }]}>
      <SyncBanner
        pending={sync.pending}
        dead={sync.dead}
        syncing={sync.phase === "syncing"}
        online={sync.online}
        enabled={sync.enabled}
      />

      {filterDate ? (
        <Pressable
          onPress={() => router.setParams({ day: undefined })}
          style={[styles.filter, { backgroundColor: palette.chip }]}
          accessibilityRole="button"
          accessibilityLabel="Clear day filter"
        >
          <ThemedText style={[styles.filterText, { color: palette.text }]}>
            {filterDate.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </ThemedText>
          <Ionicons name="close-circle" size={18} color={palette.muted} />
        </Pressable>
      ) : null}

      {loaded && rows.length === 0 ? (
        // Three empty states, three messages: first launch, filtered day, and
        // (on the search tab) no results.
        filterDate ? (
          <ContentUnavailableView
            iconComponent={Ionicons}
            iconName="calendar-clear-outline"
            title="Nothing written that day"
            titleColor={palette.text}
            descriptionColor={palette.muted}
            description="Pick another day in the calendar, or clear the filter."
          />
        ) : (
          <ContentUnavailableView
            iconComponent={Ionicons}
            iconName="book-outline"
            title="Your journal is empty"
            titleColor={palette.text}
            descriptionColor={palette.muted}
            description="Everything you write stays on this device. Tap the pen to start."
          />
        )
      ) : (
        <FlashList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.key}
          // Two very different row shapes: tell FlashList so it recycles per type.
          getItemType={(row) => row.kind}
          stickyHeaderIndices={stickyHeaderIndices}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            // Only grow when the last page came back full — otherwise we're at the end.
            if (entries.length >= limit) setLimit((current) => current + PAGE);
          }}
        />
      )}

      <Fab
        icon="create-outline"
        label="New entry"
        onPress={() => router.push("/projects/offline-journal/entry/compose")}
        bottom={pendingId ? 84 : 24}
      />
      <UndoSnackbar
        visible={!!pendingId}
        message="Entry deleted"
        onUndo={onUndo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  headerText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  filter: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterText: { fontSize: 14 },
});

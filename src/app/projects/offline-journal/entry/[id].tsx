import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AttachmentStrip } from "@/src/projects/offline-journal/components/AttachmentStrip";
import { TagChipRow } from "@/src/projects/offline-journal/components/TagChipRow";
import { BODY_SIZES } from "@/src/projects/offline-journal/constants/palette";
import { useAttachments } from "@/src/projects/offline-journal/hooks/useAttachments";
import {
  useDeleteEntry,
  useEntry,
} from "@/src/projects/offline-journal/hooks/useEntries";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { useSettingsStore } from "@/src/projects/offline-journal/stores/settingsStore";
import {
  formatLongDate,
  formatShortDate,
} from "@/src/projects/offline-journal/utils/date";
import { MOOD_FACES } from "@/src/projects/offline-journal/utils/exportFormat";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";
import { ThemedText } from "@/src/shared/components/themed-text";
import { Fonts } from "@/src/shared/constants/theme";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const fontSize = useSettingsStore((state) => state.fontSize);
  const { data: entry, loaded } = useEntry(id);
  const { data: attachments } = useAttachments(id);
  const deleteEntry = useDeleteEntry();
  const [viewing, setViewing] = useState<string | null>(null);

  const confirmDelete = () =>
    Alert.alert("Delete this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEntry(id);
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          router.back();
        },
      },
    ]);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: palette.paper }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.fill, { backgroundColor: palette.paper }]}>
        <ContentUnavailableView
          iconComponent={Ionicons}
          iconName="trash-outline"
          title="Entry not found"
          description="It may have been deleted on this or another device."
        />
      </View>
    );
  }

  const viewed = attachments.find((a) => a.id === viewing);

  return (
    <>
      <Stack.Screen
        options={{
          title: formatShortDate(entry.createdAt),
          headerRight: () => (
            <View style={styles.actions}>
              <Pressable
                hitSlop={8}
                accessibilityLabel="Edit entry"
                onPress={() =>
                  router.push({
                    pathname: "/projects/offline-journal/entry/compose",
                    params: { id: entry.id },
                  })
                }
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={palette.accent}
                />
              </Pressable>
              <Pressable
                hitSlop={8}
                accessibilityLabel="Delete entry"
                onPress={confirmDelete}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={palette.danger}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: palette.paper }}
        contentContainerStyle={styles.content}
      >
        <ThemedText style={[styles.date, { color: palette.muted }]}>
          {formatLongDate(entry.createdAt)}
          {entry.mood ? `  ${MOOD_FACES[entry.mood]}` : ""}
        </ThemedText>
        <ThemedText
          type="title"
          style={[styles.title, { color: palette.text }]}
        >
          {entry.title || "Untitled"}
        </ThemedText>

        {entry.tags.length > 0 ? <TagChipRow tags={entry.tags} /> : null}

        <ThemedText
          selectable
          style={[
            styles.body,
            BODY_SIZES[fontSize],
            { color: palette.text, fontFamily: Fonts?.serif },
          ]}
        >
          {entry.body}
        </ThemedText>

        <AttachmentStrip items={attachments} size={120} onPress={setViewing} />

        {entry.updatedAt.getTime() - entry.createdAt.getTime() > 60_000 ? (
          <ThemedText style={[styles.edited, { color: palette.muted }]}>
            Edited {formatLongDate(entry.updatedAt)}
          </ThemedText>
        ) : null}
      </ScrollView>

      <Modal
        visible={!!viewed}
        animationType="fade"
        transparent
        onRequestClose={() => setViewing(null)}
      >
        <Pressable style={styles.viewer} onPress={() => setViewing(null)}>
          {viewed ? (
            <Image
              source={{ uri: viewed.uri }}
              placeholder={
                viewed.blurhash ? { blurhash: viewed.blurhash } : undefined
              }
              contentFit="contain"
              style={styles.fill}
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  actions: { flexDirection: "row", gap: 20 },
  date: { fontSize: 13 },
  title: { fontSize: 28, lineHeight: 34 },
  body: {},
  edited: { fontSize: 12, marginTop: 8 },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
});

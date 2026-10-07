import { useHeaderHeight } from "expo-router/react-navigation";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AttachmentStrip } from "@/src/projects/offline-journal/components/AttachmentStrip";
import { MoodPicker } from "@/src/projects/offline-journal/components/MoodPicker";
import { TagChipRow } from "@/src/projects/offline-journal/components/TagChipRow";
import { BODY_SIZES } from "@/src/projects/offline-journal/constants/palette";
import {
  useAttachmentActions,
  useAttachments,
} from "@/src/projects/offline-journal/hooks/useAttachments";
import { useAutosave } from "@/src/projects/offline-journal/hooks/useAutosave";
import {
  useEntry,
  useSaveEntry,
  useTags,
} from "@/src/projects/offline-journal/hooks/useEntries";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import type { Entry, Mood } from "@/src/projects/offline-journal/models/Entry";
import { useSettingsStore } from "@/src/projects/offline-journal/stores/settingsStore";
import type { AttachSource } from "@/src/projects/offline-journal/utils/attachments";
import {
  formatLongDate,
  formatTime,
} from "@/src/projects/offline-journal/utils/date";
import { normalizeTag } from "@/src/projects/offline-journal/utils/text";
import { ThemedText } from "@/src/shared/components/themed-text";
import { Fonts } from "@/src/shared/constants/theme";

/**
 * `?id=` edits an existing entry; no id composes a new one. Either way the
 * editor below is keyed and seeded ONCE — a live query feeding the inputs
 * would fight the user's typing every time autosave wrote a row.
 */
export default function ComposeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const palette = usePalette();

  if (!id) return <Editor initial={null} />;
  return <ExistingEntry id={id} background={palette.paper} />;
}

function ExistingEntry({ id, background }: { id: string; background: string }) {
  const { data: entry, loaded } = useEntry(id);
  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Editor key={id} initial={entry} />;
}

type Draft = { title: string; body: string; mood: Mood | null; tags: string[] };

function Editor({ initial }: { initial: Entry | null }) {
  const palette = usePalette();
  const headerHeight = useHeaderHeight();
  const fontSize = useSettingsStore((state) => state.fontSize);
  const saveEntry = useSaveEntry();
  const { data: allTags } = useTags();
  const { attach, remove } = useAttachmentActions();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [createdAt] = useState(() => initial?.createdAt ?? new Date());

  // The id the first save produced, so later saves update instead of inserting.
  // Ref for the save path (always current), state for the attachments query.
  const entryId = useRef<string | undefined>(initial?.id);
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);
  // Skip writes that would not change anything (each one is an outbox op).
  const lastSaved = useRef(
    initial
      ? JSON.stringify({
          title: initial.title,
          body: initial.body,
          mood: initial.mood,
          tags: initial.tags,
        })
      : "",
  );

  const { data: attachments } = useAttachments(savedId);

  const draft = useMemo<Draft>(
    () => ({ title, body, mood, tags }),
    [title, body, mood, tags],
  );

  // Saves are chained, never concurrent: an autosave and an "attach" racing
  // before the first insert would otherwise create two entries.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const persist = useCallback(
    (value: Draft) => {
      const run = queue.current.then(async () => {
        const snapshot = JSON.stringify(value);
        if (snapshot === lastSaved.current) return entryId.current;
        const id = await saveEntry({ id: entryId.current, ...value });
        lastSaved.current = snapshot;
        if (!entryId.current) {
          entryId.current = id;
          setSavedId(id);
        }
        return id;
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [saveEntry],
  );

  const save = useCallback(
    async (value: Draft) => {
      // Never create an empty entry just because the modal opened.
      if (!entryId.current && !value.title.trim() && !value.body.trim()) return;
      await persist(value);
    },
    [persist],
  );

  const { savedAt, flush } = useAutosave(draft, save);

  const onAttach = async (source: AttachSource) => {
    try {
      // A photo needs a row to belong to: create it now if autosave hasn't.
      const id = entryId.current ?? (await persist(draft));
      if (!id) return;
      const attached = await attach(id, source);
      if (attached) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (cause) {
      Alert.alert("Could not attach photo", String(cause));
    }
  };

  const onRemoveAttachment = (attachmentId: string) =>
    Alert.alert("Remove photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void remove(attachmentId),
      },
    ]);

  const done = async () => {
    await flush();
    if (entryId.current)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: initial ? "Edit entry" : "New entry",
          headerStyle: { backgroundColor: palette.paper },
          headerLeft: () => (
            <Pressable
              onPress={() => void done()}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <ThemedText style={{ color: palette.accent, fontSize: 20 }}>
                ✕
              </ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => void done()} hitSlop={8}>
              <ThemedText style={{ color: palette.accent, fontWeight: "600" }}>
                Done
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.fill, { backgroundColor: palette.paper }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <ThemedText style={[styles.date, { color: palette.muted }]}>
          {formatLongDate(createdAt)}
        </ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={palette.muted}
          returnKeyType="next"
          style={[
            styles.title,
            { color: palette.text, borderColor: palette.border },
          ]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write…"
          placeholderTextColor={palette.muted}
          multiline
          autoFocus={!initial}
          style={[
            styles.body,
            BODY_SIZES[fontSize],
            { color: palette.text, fontFamily: Fonts?.serif },
          ]}
        />

        {/* The toolbar sits on the keyboard, not behind it. */}
        <View
          style={[
            styles.toolbar,
            { borderColor: palette.border, backgroundColor: palette.paper },
          ]}
        >
          <AttachmentStrip
            items={attachments}
            size={56}
            onLongPress={onRemoveAttachment}
          />
          <MoodPicker value={mood} onChange={setMood} />
          <TagChipRow
            tags={tags}
            onRemove={(tag) => setTags(tags.filter((t) => t !== tag))}
            onAdd={addTag}
            suggestions={allTags.map((t) => t.name)}
          />
          <View style={styles.row}>
            <Pressable onPress={() => void onAttach("library")} hitSlop={6}>
              <ThemedText style={{ color: palette.accent }}>
                📎 Attach
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => void onAttach("camera")} hitSlop={6}>
              <ThemedText style={{ color: palette.accent }}>
                📷 Photo
              </ThemedText>
            </Pressable>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              {savedAt
                ? `Saved ${formatTime(savedAt)} ✓`
                : initial
                  ? ""
                  : "Not saved yet"}
            </ThemedText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  date: { fontSize: 13, paddingHorizontal: 16, paddingTop: 16 },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, padding: 16, textAlignVertical: "top" },
  toolbar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  hint: { marginLeft: "auto", fontSize: 12 },
});

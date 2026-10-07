import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type TagChipRowProps = {
  tags: string[];
  /** Omit to render read-only chips. */
  onRemove?: (tag: string) => void;
  /** Omit to hide the "+ tag" input. */
  onAdd?: (tag: string) => void;
  /** Tapping a suggestion adds it. Already-applied tags are filtered out. */
  suggestions?: string[];
};

export function TagChipRow({
  tags,
  onRemove,
  onAdd,
  suggestions = [],
}: TagChipRowProps) {
  const palette = usePalette();
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = () => {
    if (draft.trim()) onAdd?.(draft);
    setDraft("");
    setAdding(false);
  };

  const unused = suggestions.filter((tag) => !tags.includes(tag)).slice(0, 8);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {tags.map((tag) => (
        <Pressable
          key={tag}
          disabled={!onRemove}
          onPress={() => onRemove?.(tag)}
          accessibilityLabel={onRemove ? `Remove tag ${tag}` : `Tag ${tag}`}
          style={[styles.chip, { backgroundColor: palette.chip }]}
        >
          <ThemedText style={[styles.text, { color: palette.accent }]}>
            #{tag}
            {onRemove ? " ×" : ""}
          </ThemedText>
        </Pressable>
      ))}

      {onAdd && adding ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          onBlur={submit}
          placeholder="tag"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={[
            styles.input,
            { color: palette.text, borderColor: palette.border },
          ]}
        />
      ) : null}

      {onAdd && !adding ? (
        <Pressable
          onPress={() => setAdding(true)}
          style={[styles.chip, { borderColor: palette.border, borderWidth: 1 }]}
        >
          <ThemedText style={[styles.text, { color: palette.muted }]}>
            + tag
          </ThemedText>
        </Pressable>
      ) : null}

      {onAdd
        ? unused.map((tag) => (
            <Pressable
              key={`s:${tag}`}
              onPress={() => onAdd(tag)}
              style={[
                styles.chip,
                styles.suggestion,
                { borderColor: palette.border },
              ]}
            >
              <ThemedText style={[styles.text, { color: palette.muted }]}>
                #{tag}
              </ThemedText>
            </Pressable>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  suggestion: { borderWidth: 1, borderStyle: "dashed" },
  text: { fontSize: 13, lineHeight: 18 },
  input: {
    minWidth: 80,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 14,
  },
});

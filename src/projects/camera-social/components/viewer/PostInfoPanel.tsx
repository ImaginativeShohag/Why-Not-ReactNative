import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Palette, Spacing } from "@/src/projects/camera-social/constants/theme";

type Props = {
  caption: string;
  /** e.g. "6 Aug 2026 · 18:42" */
  dateLabel: string;
  /** e.g. "4032×3024 · 3.2 MB · HEIC" */
  specsLabel: string;
  /** e.g. "f/1.8 · 1/120 · ISO 64", or null when there's no EXIF. */
  exposureLabel: string | null;
  cameraLabel: string | null;
  /** e.g. "Edited" / "Shared in" — where the capture came from. */
  badges: string[];
  onCaptionChange: (caption: string) => void;
};

/** Caption + the metadata block under the viewer (the EXIF panel). */
export function PostInfoPanel({
  caption,
  dateLabel,
  specsLabel,
  exposureLabel,
  cameraLabel,
  badges,
  onCaptionChange,
}: Props) {
  const [draft, setDraft] = useState(caption);

  return (
    <View style={styles.panel}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={() => {
          if (draft !== caption) onCaptionChange(draft.trim());
        }}
        placeholder="Add a caption"
        placeholderTextColor={Palette.textFaint}
        style={styles.caption}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        accessibilityLabel="Caption"
      />
      <Text style={styles.line}>{dateLabel}</Text>
      <Text style={styles.line}>{specsLabel}</Text>
      {cameraLabel ? <Text style={styles.faint}>{cameraLabel}</Text> : null}
      {exposureLabel ? <Text style={styles.faint}>{exposureLabel}</Text> : null}
      {badges.length ? (
        <View style={styles.badges}>
          {badges.map((b) => (
            <Text key={b} style={styles.badge}>
              {b}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 2,
  },
  caption: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: Spacing.xs,
  },
  line: { color: Palette.textMuted, fontSize: 13 },
  faint: { color: Palette.textFaint, fontSize: 13 },
  badges: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  badge: {
    color: Palette.text,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
});

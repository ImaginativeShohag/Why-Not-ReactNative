import { StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type SyncBannerProps = {
  pending: number;
  dead: number;
  syncing: boolean;
  online: boolean;
  enabled: boolean;
};

/**
 * The timeline's subtle sync state. Renders nothing when there is nothing worth
 * saying — an "all synced" banner is noise.
 */
export function SyncBanner({
  pending,
  dead,
  syncing,
  online,
  enabled,
}: SyncBannerProps) {
  const palette = usePalette();

  let text: string | null = null;
  if (!online)
    text =
      pending > 0
        ? `Offline · ${pending} waiting`
        : "Offline · all saved on device";
  else if (!enabled) text = null;
  else if (syncing) text = "⟳ Syncing…";
  else if (dead > 0)
    text = `${dead} change${dead === 1 ? "" : "s"} failed to sync`;
  else if (pending > 0) text = `⟳ ${pending} pending`;

  if (!text) return null;

  return (
    <View style={[styles.banner, { borderColor: palette.border }]}>
      <ThemedText
        style={[
          styles.text,
          { color: dead > 0 ? palette.danger : palette.muted },
        ]}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 6,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 12, lineHeight: 16 },
});

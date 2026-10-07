import { StyleSheet, Text, View } from "react-native";

import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import { formatBytes } from "@/src/projects/podcast-player/utils/format";

type Props = { usedBytes: number; capBytes: number; freeBytes: number };

export function StorageBar({ usedBytes, capBytes, freeBytes }: Props) {
  const ratio = capBytes > 0 ? usedBytes / capBytes : 0;
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={styles.label}>Storage</Text>
        <Text style={styles.value}>
          {formatBytes(usedBytes)} / {formatBytes(capBytes)}
        </Text>
      </View>
      <ProgressBar
        progress={ratio}
        height={6}
        color={ratio > 0.9 ? PodcastTheme.danger : PodcastTheme.accent}
      />
      {Number.isFinite(freeBytes) ? (
        <Text style={styles.caption}>
          {formatBytes(freeBytes)} free on device
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: PodcastTheme.text, fontWeight: "600" },
  value: { color: PodcastTheme.textMuted },
  caption: { color: PodcastTheme.textMuted, fontSize: 12 },
});

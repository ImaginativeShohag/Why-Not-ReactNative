import { StyleSheet, View } from "react-native";

import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import {
  type PodcastColors,
  usePodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";
import { formatBytes } from "@/src/projects/podcast-player/utils/format";

type Props = { usedBytes: number; capBytes: number; freeBytes: number };

export function StorageBar({ usedBytes, capBytes, freeBytes }: Props) {
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
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
        color={ratio > 0.9 ? colors.danger : colors.accent}
      />
      {Number.isFinite(freeBytes) ? (
        <Text style={styles.caption}>
          {formatBytes(freeBytes)} free on device
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    box: { padding: 16, gap: 8 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    label: { color: c.text, fontWeight: "600" },
    value: { color: c.textMuted },
    caption: { color: c.textMuted, fontSize: 12 },
  });

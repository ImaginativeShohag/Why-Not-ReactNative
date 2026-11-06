import { StyleSheet, View } from "react-native";

import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import {
  type PodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";

type Props = {
  title: string;
  showTitle: string;
  artworkUrl: string | null;
  meta: string;
};

export function QueueRow({ title, showTitle, artworkUrl, meta }: Props) {
  const styles = usePodcastStyles(createStyles);
  return (
    <View style={styles.row}>
      <Artwork uri={artworkUrl} size={48} title={showTitle} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {showTitle}
          {meta ? ` · ${meta}` : ""}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingLeft: 16,
    },
    text: { flex: 1 },
    title: { color: c.text, fontWeight: "600" },
    meta: { color: c.textMuted, fontSize: 12 },
  });

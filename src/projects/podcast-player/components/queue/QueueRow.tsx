import { StyleSheet, Text, View } from "react-native";

import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = {
  title: string;
  showTitle: string;
  artworkUrl: string | null;
  meta: string;
};

export function QueueRow({ title, showTitle, artworkUrl, meta }: Props) {
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

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16 },
  text: { flex: 1 },
  title: { color: PodcastTheme.text, fontWeight: "600" },
  meta: { color: PodcastTheme.textMuted, fontSize: 12 },
});

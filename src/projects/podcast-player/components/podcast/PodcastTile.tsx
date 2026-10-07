import { Pressable, StyleSheet, Text } from "react-native";

import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = {
  title: string;
  artworkUrl: string | null;
  size: number;
  onPress: () => void;
};

export function PodcastTile({ title, artworkUrl, size, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, { width: size }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Artwork uri={artworkUrl} size={size} title={title} radius={10} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { gap: 6 },
  title: { color: PodcastTheme.text, fontSize: 12 },
});

import { Pressable, StyleSheet } from "react-native";

import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import {
  type PodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import Text from "@/src/projects/podcast-player/components/common/PodcastText";

type Props = {
  title: string;
  artworkUrl: string | null;
  size: number;
  onPress: () => void;
};

export function PodcastTile({ title, artworkUrl, size, onPress }: Props) {
  const styles = usePodcastStyles(createStyles);
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

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    tile: { gap: 6 },
    title: { color: c.text, fontSize: 12 },
  });

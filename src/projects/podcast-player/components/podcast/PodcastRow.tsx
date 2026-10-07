import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";

type Props = {
  title: string;
  author: string;
  artworkUrl: string | null;
  caption?: string | null;
  subscribed: boolean;
  busy?: boolean;
  onPress: () => void;
  onToggleSubscribe: () => void;
};

export function PodcastRow({
  title,
  author,
  artworkUrl,
  caption,
  subscribed,
  busy,
  onPress,
  onToggleSubscribe,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: PodcastTheme.surface },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${author}`}
    >
      <Artwork uri={artworkUrl} size={60} title={title} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      <Pressable
        onPress={onToggleSubscribe}
        disabled={busy}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={
          subscribed ? `Unsubscribe from ${title}` : `Subscribe to ${title}`
        }
        testID={`subscribe-${title}`}
      >
        <Ionicons
          name={subscribed ? "checkmark-circle" : "add-circle-outline"}
          size={30}
          color={subscribed ? PodcastTheme.success : PodcastTheme.accent}
          style={busy ? { opacity: 0.4 } : undefined}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  body: { flex: 1, gap: 2 },
  title: { color: PodcastTheme.text, fontSize: 15, fontWeight: "600" },
  author: { color: PodcastTheme.textMuted, fontSize: 13 },
  caption: { color: PodcastTheme.textMuted, fontSize: 11 },
});

import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";

export type AttachmentThumb = {
  id: string;
  uri: string;
  thumbUri: string | null;
  blurhash: string | null;
};

export type AttachmentStripProps = {
  items: AttachmentThumb[];
  size?: number;
  onPress?: (id: string) => void;
  /** Long-press action, e.g. remove. */
  onLongPress?: (id: string) => void;
};

export function AttachmentStrip({
  items,
  size = 88,
  onPress,
  onLongPress,
}: AttachmentStripProps) {
  const palette = usePalette();
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={onPress ? () => onPress(item.id) : undefined}
          onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
          accessibilityRole="imagebutton"
          accessibilityLabel="Attached photo"
        >
          <Image
            // Thumbnail in the strip; the full image only when opened.
            source={{ uri: item.thumbUri ?? item.uri }}
            placeholder={
              item.blurhash ? { blurhash: item.blurhash } : undefined
            }
            contentFit="cover"
            transition={150}
            style={[
              styles.image,
              { width: size, height: size, backgroundColor: palette.chip },
            ]}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  image: { borderRadius: 8 },
});

import {
  Canvas,
  ColorMatrix,
  Image as SkiaImage,
  type SkImage,
} from "@shopify/react-native-skia";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";

export type FilterOption<T extends string> = {
  name: T;
  label: string;
  matrix: number[];
};

type Props<T extends string> = {
  image: SkImage | null;
  options: FilterOption<T>[];
  selected: T;
  onSelect: (name: T) => void;
};

const TILE = 64;

/** Horizontal strip of live filter swatches, each a tiny Skia canvas. */
export function FilterStrip<T extends string>({
  image,
  options,
  selected,
  onSelect,
}: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {options.map((o) => {
        const active = o.name === selected;
        return (
          <Pressable
            key={o.name}
            onPress={() => onSelect(o.name)}
            accessibilityRole="button"
            accessibilityLabel={`${o.label} filter`}
            accessibilityState={{ selected: active }}
            style={styles.item}
          >
            <View style={[styles.tile, active && styles.tileActive]}>
              <Canvas style={styles.canvas}>
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={TILE}
                  height={TILE}
                  fit="cover"
                >
                  <ColorMatrix matrix={o.matrix} />
                </SkiaImage>
              </Canvas>
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 12, gap: 10 },
  item: { alignItems: "center" },
  tile: {
    width: TILE + 4,
    height: TILE + 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tileActive: { borderColor: Palette.accent },
  canvas: { width: TILE, height: TILE, borderRadius: 8 },
  label: {
    color: Palette.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  labelActive: { color: Palette.accent },
});

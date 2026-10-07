import { Pressable, StyleSheet, Text, View } from "react-native";

import { Palette } from "@/src/projects/camera-social/constants/theme";
import { formatFactor } from "@/src/projects/camera-social/utils/zoom";

type Props = {
  presets: readonly number[];
  /** Current zoom factor (1 = no zoom, 0.5 = ultra-wide). */
  factor: number;
  onSelect: (factor: number) => void;
  iconRotation?: number;
};

/**
 * .5× 1× 2× 3× pills. The pill nearest *below* the live factor is active and
 * shows the live value while pinching ("2.4×"), like the system camera.
 */
export function ZoomPills({
  presets,
  factor,
  onSelect,
  iconRotation = 0,
}: Props) {
  let active = 0;
  presets.forEach((p, i) => {
    if (factor >= p - 0.05) active = i;
  });

  return (
    <View style={styles.row}>
      {presets.map((p, i) => {
        const isActive = i === active;
        return (
          <Pressable
            key={p}
            onPress={() => onSelect(p)}
            accessibilityRole="button"
            accessibilityLabel={`Zoom ${formatFactor(p)}`}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text
              style={[
                styles.text,
                isActive && styles.textActive,
                iconRotation
                  ? { transform: [{ rotate: `${iconRotation}deg` }] }
                  : null,
              ]}
            >
              {isActive ? formatFactor(factor) : formatFactor(p)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  pillActive: { backgroundColor: "rgba(0,0,0,0.6)" },
  text: { color: Palette.text, fontSize: 12, fontWeight: "700" },
  textActive: { color: Palette.accent, fontSize: 13 },
});

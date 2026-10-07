import { StyleSheet, Text, View } from "react-native";

type Props = {
  value: string;
  label: string;
  color: string;
  mutedColor: string;
  /** "hero" = the one number that dominates the screen (64pt). */
  size?: "hero" | "large" | "small";
};

export function MetricTile({
  value,
  label,
  color,
  mutedColor,
  size = "large",
}: Props) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${label} ${value}`}
    >
      <Text
        style={[
          styles.value,
          { color },
          size === "hero"
            ? styles.hero
            : size === "small"
              ? styles.small
              : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.label, { color: mutedColor }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: "center", paddingVertical: 6 },
  value: { fontSize: 30, fontWeight: "700", fontVariant: ["tabular-nums"] },
  hero: { fontSize: 64, fontWeight: "800" },
  small: { fontSize: 20 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, marginTop: 2 },
});

import { StyleSheet, Text, View } from "react-native";

type Props = {
  quality: "none" | "poor" | "fair" | "good";
  color: string;
  mutedColor: string;
  showLabel?: boolean;
};

const BARS = { none: 0, poor: 1, fair: 2, good: 4 } as const;
const LABEL = {
  none: "No GPS",
  poor: "Weak",
  fair: "Fair",
  good: "Good",
} as const;

export function GpsSignal({ quality, color, mutedColor, showLabel }: Props) {
  const lit = BARS[quality];
  return (
    <View style={styles.row} accessibilityLabel={`GPS ${LABEL[quality]}`}>
      <Text style={[styles.text, { color }]}>GPS</Text>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: 5 + i * 3,
              backgroundColor: i < lit ? color : mutedColor,
              opacity: i < lit ? 1 : 0.35,
            },
          ]}
        />
      ))}
      {showLabel ? (
        <Text style={[styles.text, { color }]}>{LABEL[quality]}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { width: 4, borderRadius: 1 },
  text: { fontSize: 13, fontWeight: "700", marginHorizontal: 4 },
});

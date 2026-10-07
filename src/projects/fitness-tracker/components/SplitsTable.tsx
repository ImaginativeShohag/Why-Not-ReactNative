import { StyleSheet, Text, View } from "react-native";

import type { Split } from "../models/Workout";
import { formatKm, formatPace } from "../utils/format";

type Props = {
  splits: Split[];
  textColor: string;
  mutedColor: string;
  barColor: string;
  trackColor: string;
};

export function SplitsTable({
  splits,
  textColor,
  mutedColor,
  barColor,
  trackColor,
}: Props) {
  if (!splits.length)
    return <Text style={{ color: mutedColor }}>No full kilometre yet.</Text>;
  const fastest = Math.min(...splits.map((s) => s.paceSecPerKm));
  const slowest = Math.max(...splits.map((s) => s.paceSecPerKm));
  return (
    <View style={{ gap: 6 }}>
      {splits.map((s) => {
        // Faster = longer bar; never collapse the slowest to zero.
        const f =
          slowest === fastest
            ? 1
            : 0.35 + (0.65 * (slowest - s.paceSecPerKm)) / (slowest - fastest);
        const km = s.distanceM >= 999 ? `${s.index} km` : formatKm(s.distanceM);
        return (
          <View key={s.index} style={styles.row}>
            <Text style={[styles.km, { color: mutedColor }]}>{km}</Text>
            <Text style={[styles.pace, { color: textColor }]}>
              {formatPace(s.paceSecPerKm)}
            </Text>
            <View style={[styles.track, { backgroundColor: trackColor }]}>
              <View
                style={[
                  styles.bar,
                  { width: `${f * 100}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={[styles.elev, { color: mutedColor }]}>
              {s.elevationDeltaM >= 0 ? "+" : ""}
              {Math.round(s.elevationDeltaM)} m
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  km: { width: 48, fontSize: 13, fontWeight: "600" },
  pace: {
    width: 56,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  bar: { height: 10, borderRadius: 5 },
  elev: { width: 52, fontSize: 12, textAlign: "right" },
});

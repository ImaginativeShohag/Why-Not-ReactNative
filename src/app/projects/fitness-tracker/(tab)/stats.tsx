import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BarChart } from "@/src/projects/fitness-tracker/components/charts/BarChart";
import { LineChart } from "@/src/projects/fitness-tracker/components/charts/LineChart";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { useStats } from "@/src/projects/fitness-tracker/hooks/useWorkouts";
import { paceSecPerKm } from "@/src/projects/fitness-tracker/tracking/metrics";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatKmLabel,
  formatPace,
  formatShortDate,
} from "@/src/projects/fitness-tracker/utils/format";

// Twelve weekly bars leave ~28 pt per bar; "Sep 21" needs about three.
const WEEK_LABEL_EVERY = 3;

export default function StatsScreen() {
  const palette = usePalette();
  const { data } = useStats();
  const { bests } = data;
  const rows: [string, string, string | null][] = [
    [
      "Longest distance",
      bests.longestDistance
        ? formatDistance(bests.longestDistance.distanceM)
        : "—",
      bests.longestDistance
        ? formatDate(bests.longestDistance.startedAt)
        : null,
    ],
    [
      "Longest duration",
      bests.longestDuration
        ? formatDuration(bests.longestDuration.movingMs)
        : "—",
      bests.longestDuration
        ? formatDate(bests.longestDuration.startedAt)
        : null,
    ],
    [
      "Fastest avg pace (≥1 km)",
      bests.fastestPace
        ? `${formatPace(paceSecPerKm(bests.fastestPace.distanceM, bests.fastestPace.movingMs))}/km`
        : "—",
      bests.fastestPace ? formatDate(bests.fastestPace.startedAt) : null,
    ],
    [
      "Fastest kilometre",
      bests.fastestKmMs ? formatPace(bests.fastestKmMs / 1000) : "—",
      null,
    ],
    [
      "Most climbing",
      bests.mostClimb ? `${Math.round(bests.mostClimb.elevationGainM)} m` : "—",
      bests.mostClimb ? formatDate(bests.mostClimb.startedAt) : null,
    ],
  ];

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
    >
      <Section title="Weekly distance" palette={palette}>
        <BarChart
          data={data.weekly.map((w) => ({
            label: formatShortDate(w.weekStart),
            value: w.distanceM / 1000,
          }))}
          height={150}
          color={palette.accent}
          labelColor={palette.muted}
          formatValue={formatKmLabel}
          labelEvery={WEEK_LABEL_EVERY}
          highlightLast
        />
      </Section>
      <Section title="Pace trend (last 30 workouts)" palette={palette}>
        <LineChart
          data={data.paceTrend}
          height={140}
          color={palette.info}
          labelColor={palette.muted}
          formatY={(y) => `${formatPace(y)}/km`}
          invert
        />
      </Section>
      <Section title="Weekly elevation gain" palette={palette}>
        <BarChart
          data={data.weekly.map((w) => ({
            label: formatShortDate(w.weekStart),
            value: w.elevationM,
          }))}
          height={120}
          color={palette.warn}
          labelColor={palette.muted}
          formatValue={(v) => `${Math.round(v)} m`}
          labelEvery={WEEK_LABEL_EVERY}
        />
      </Section>
      <Section title="Personal bests" palette={palette}>
        {rows.map(([label, value, date]) => (
          <View key={label} style={styles.pb}>
            <Text style={{ color: palette.muted, flex: 1 }}>{label}</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.pbValue, { color: palette.text }]}>
                {value}
              </Text>
              {date ? (
                <Text style={{ color: palette.muted, fontSize: 11 }}>
                  {date}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  palette,
  children,
}: {
  title: string;
  palette: { card: string; text: string };
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <Text style={[styles.h2, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 14, gap: 10 },
  h2: { fontSize: 17, fontWeight: "800" },
  pb: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  pbValue: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
});

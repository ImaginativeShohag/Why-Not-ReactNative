import Ionicons from "@expo/vector-icons/Ionicons";
import { drawAsImage } from "@shopify/react-native-skia";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LineChart } from "@/src/projects/fitness-tracker/components/charts/LineChart";
import { RouteMap } from "@/src/projects/fitness-tracker/components/map/RouteMap";
import { MetricTile } from "@/src/projects/fitness-tracker/components/MetricTile";
import {
  SHARE_CARD_SIZE,
  ShareCard,
} from "@/src/projects/fitness-tracker/components/ShareCard";
import { SplitsTable } from "@/src/projects/fitness-tracker/components/SplitsTable";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { getDb } from "@/src/projects/fitness-tracker/db/client";
import {
  deleteWorkout,
  updateWorkout,
} from "@/src/projects/fitness-tracker/db/queries/workouts";
import {
  sharePng,
  shareGpx,
} from "@/src/projects/fitness-tracker/export/share";
import { health } from "@/src/projects/fitness-tracker/health/sync";
import { useHeartRate } from "@/src/projects/fitness-tracker/hooks/useHeartRate";
import {
  usePoints,
  useSplits,
  useWorkout,
} from "@/src/projects/fitness-tracker/hooks/useWorkouts";
import {
  elevationSeries,
  kmMarkers,
  paceSecPerKm,
  paceSeries,
  simplifyRoute,
} from "@/src/projects/fitness-tracker/tracking/metrics";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatKm,
  formatPace,
  formatTime,
} from "@/src/projects/fitness-tracker/utils/format";
import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { paceColoredSegments } from "@/src/projects/fitness-tracker/utils/paceColor";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = usePalette();
  const colorScheme = useColorScheme();
  const { data: workout, loading } = useWorkout(id);
  const { data: points } = usePoints(id);
  const { data: splits } = useSplits(id);
  const heartRate = useHeartRate(workout);
  const [busy, setBusy] = useState<string | null>(null);

  // Everything derived once per points change — a 12k-point hike is
  // simplified to a few hundred vertices before the map sees it.
  const derived = useMemo(() => {
    const simplified = simplifyRoute(points, 4).flat();
    return {
      segments: paceColoredSegments(simplified),
      fit: simplified.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      markers: kmMarkers(points).map((m) => ({
        coordinate: { latitude: m.lat, longitude: m.lng },
        label: String(m.km),
      })),
      pace: paceSeries(points),
      elevation: elevationSeries(points),
    };
  }, [points]);

  if (!workout) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ color: palette.muted }}>Workout not found.</Text>
        )}
      </View>
    );
  }

  const avgPace = paceSecPerKm(workout.distanceM, workout.movingMs);
  const avgHr = heartRate.length
    ? heartRate.reduce((s, h) => s + h.bpm, 0) / heartRate.length
    : workout.avgHeartRate;
  const first = points[0];
  const lastP = points[points.length - 1];

  const run = async (label: string, job: () => Promise<void>) => {
    setBusy(label);
    try {
      await job();
    } catch (e) {
      Alert.alert(`${label} failed`, (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const shareCard = () =>
    run("Share", async () => {
      const image = await drawAsImage(
        <ShareCard
          data={{
            title: workout.title,
            date: `${formatDate(workout.startedAt)} · ${formatTime(workout.startedAt)}`,
            path: workout.thumbnail ?? [],
            stats: [
              { label: "km", value: formatKm(workout.distanceM) },
              { label: "time", value: formatDuration(workout.movingMs) },
              { label: "pace /km", value: formatPace(avgPace) },
              { label: "kcal", value: String(workout.calories) },
              {
                label: "climb m",
                value: String(Math.round(workout.elevationGainM)),
              },
            ],
          }}
        />,
        SHARE_CARD_SIZE,
      );
      if (!image) throw new Error("Could not render the card.");
      await sharePng(image.encodeToBase64(), workout.title);
    });

  const saveToHealth = () =>
    run("Health sync", async () => {
      const result = await health.saveWorkout(workout, points);
      if (result.ok)
        await updateWorkout(await getDb(), workout.id, {
          healthSyncedAt: Date.now(),
        });
      Alert.alert(health.storeName, result.message);
    });

  const remove = () =>
    Alert.alert(
      "Delete workout?",
      "This removes the route and all its points.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteWorkout(await getDb(), workout.id);
            router.back();
          },
        },
      ],
    );

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen
        options={{
          title: workout.title,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={shareCard}
                hitSlop={10}
                accessibilityLabel="Share card"
              >
                <Ionicons name="share-outline" size={24} color={palette.text} />
              </Pressable>
              <Pressable
                onPress={remove}
                hitSlop={10}
                accessibilityLabel="Delete workout"
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={palette.danger}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={styles.map}>
        {derived.fit.length > 1 ? (
          <RouteMap
            segments={derived.segments}
            splitMarkers={derived.markers}
            start={first ? { latitude: first.lat, longitude: first.lng } : null}
            end={lastP ? { latitude: lastP.lat, longitude: lastP.lng } : null}
            fitTo={derived.fit}
            dark={colorScheme === "dark"}
          />
        ) : (
          <View style={[styles.center, { backgroundColor: palette.card }]}>
            <Text style={{ color: palette.muted }}>No route recorded</Text>
          </View>
        )}
      </View>
      <Text style={{ color: palette.muted }}>
        {formatDate(workout.startedAt)} · {formatTime(workout.startedAt)} ·
        colour = pace (blue fast → red slow)
      </Text>

      <View style={styles.grid}>
        <MetricTile
          value={formatDistance(workout.distanceM)}
          label="Distance"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={formatDuration(workout.movingMs)}
          label="Moving"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={formatPace(avgPace)}
          label="Avg pace"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
      </View>
      <View style={styles.grid}>
        <MetricTile
          value={`${workout.calories}`}
          label="kcal"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={`${Math.round(workout.elevationGainM)} m ↑`}
          label="Climb"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={avgHr ? `${Math.round(avgHr)}` : "—"}
          label="bpm"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
      </View>
      {workout.batteryStart != null && workout.batteryEnd != null ? (
        <Text style={{ color: palette.muted, fontSize: 12 }}>
          Battery {Math.round(workout.batteryStart * 100)}% →{" "}
          {Math.round(workout.batteryEnd * 100)}% ·{" "}
          {workout.mode === "saver" ? "battery-saver" : "accurate"} mode ·{" "}
          {workout.pointCount} points
          {workout.steps ? ` · ${workout.steps} steps` : ""}
        </Text>
      ) : null}

      <Section title="Pace" color={palette.text}>
        <LineChart
          data={derived.pace}
          height={120}
          color={palette.info}
          labelColor={palette.muted}
          formatY={(y) => formatPace(y)}
          invert
        />
      </Section>
      <Section title="Elevation" color={palette.text}>
        <LineChart
          data={derived.elevation}
          height={100}
          color={palette.warn}
          labelColor={palette.muted}
          formatY={(y) => `${Math.round(y)} m`}
        />
      </Section>
      {heartRate.length > 1 ? (
        <Section title="Heart rate" color={palette.text}>
          <LineChart
            data={heartRate.map((h) => ({ x: h.t, y: h.bpm }))}
            height={100}
            color={palette.danger}
            labelColor={palette.muted}
            formatY={(y) => `${Math.round(y)} bpm`}
          />
        </Section>
      ) : null}
      <Section title="Splits" color={palette.text}>
        <SplitsTable
          splits={splits}
          textColor={palette.text}
          mutedColor={palette.muted}
          barColor={palette.accent}
          trackColor={palette.card}
        />
      </Section>

      <View style={styles.actions}>
        <Action
          label="Export GPX"
          icon="download-outline"
          onPress={() => run("Export", () => shareGpx(workout, points))}
          palette={palette}
        />
        <Action
          label={
            workout.healthSyncedAt
              ? `Synced to ${health.storeName}`
              : `Save to ${health.storeName}`
          }
          icon="heart-outline"
          onPress={saveToHealth}
          // Saved once is enough: a second save would duplicate the workout.
          disabled={workout.healthSyncedAt != null || busy != null}
          palette={palette}
        />
      </View>
      {busy ? <ActivityIndicator /> : null}
    </ScrollView>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.h2, { color }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  disabled = false,
  palette,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  palette: { card: string; text: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.action,
        { backgroundColor: palette.card, opacity: disabled ? 0.6 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={20} color={palette.text} />
      <Text style={{ color: palette.text, fontWeight: "700", flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  map: { height: 280, borderRadius: 16, overflow: "hidden" },
  grid: { flexDirection: "row" },
  h2: { fontSize: 13, fontWeight: "800", letterSpacing: 1.2 },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
  },
  headerActions: { flexDirection: "row", gap: 18 },
});

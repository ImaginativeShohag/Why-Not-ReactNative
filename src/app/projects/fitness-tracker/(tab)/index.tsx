import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BigButton } from "@/src/projects/fitness-tracker/components/BigButton";
import { BarChart } from "@/src/projects/fitness-tracker/components/charts/BarChart";
import { ProgressRing } from "@/src/projects/fitness-tracker/components/ProgressRing";
import { RecoveryBanner } from "@/src/projects/fitness-tracker/components/RecoveryBanner";
import { WorkoutRow } from "@/src/projects/fitness-tracker/components/WorkoutRow";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { useTodaySteps } from "@/src/projects/fitness-tracker/hooks/useTodaySteps";
import {
  usePrefs,
  useSession,
  useTodayStats,
} from "@/src/projects/fitness-tracker/hooks/useWorkouts";
import {
  discardWorkout,
  findRecoverable,
  reattach,
  stopWorkout,
} from "@/src/projects/fitness-tracker/tracking/controller";
import type { Session } from "@/src/projects/fitness-tracker/tracking/state";
import { syncWidget } from "@/src/projects/fitness-tracker/tracking/widget";
import { DAY_MS, startOfDay } from "@/src/projects/fitness-tracker/utils/dates";
import {
  formatDuration,
  formatKm,
  formatKmLabel,
  formatTime,
} from "@/src/projects/fitness-tracker/utils/format";
import { computeStreak } from "@/src/projects/fitness-tracker/utils/streak";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function TodayScreen() {
  const router = useRouter();
  const palette = usePalette();
  const { data: stats } = useTodayStats();
  const { data: prefs } = usePrefs();
  const { data: session } = useSession();
  const { steps, available: stepsAvailable } = useTodaySteps();
  // Captured once per mount; the week buckets don't need to tick.
  const [now] = useState(() => Date.now());
  const [recovery, setRecovery] = useState<{
    session: Session;
    tracking: boolean;
  } | null>(null);

  // Crash/kill recovery: a session row with no live location source means
  // the process died mid-workout.
  useEffect(() => {
    findRecoverable()
      .then((r) => setRecovery(r && !r.tracking ? r : null))
      .catch(() => {});
  }, []);

  // syncWidget throttles itself to the widget's reload budget.
  useEffect(() => {
    syncWidget(steps);
  }, [steps]);

  const distanceToday = stats.today?.distanceM ?? 0;
  const streak = computeStreak(stats.days, new Date());
  const today0 = startOfDay(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today0 - (6 - i) * DAY_MS;
    return {
      label: DAY_LETTERS[new Date(day).getDay()],
      value: (stats.week.find((d) => d.day === day)?.distanceM ?? 0) / 1000,
    };
  });

  const goToActive = () =>
    router.push("/projects/fitness-tracker/workout/active");

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push("/projects/fitness-tracker/settings/permissions")
              }
              accessibilityLabel="Permissions"
              hitSlop={12}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={palette.text}
              />
            </Pressable>
          ),
        }}
      />

      {recovery ? (
        <RecoveryBanner
          title="Unfinished workout"
          subtitle={`${recovery.session.title} started at ${formatTime(recovery.session.startedAt)} was interrupted. Points recorded up to that moment are safe.`}
          color={palette.warn}
          onResume={async () => {
            await reattach();
            setRecovery(null);
            goToActive();
          }}
          onFinish={async () => {
            const id = await stopWorkout();
            setRecovery(null);
            if (id)
              router.push({
                pathname: "/projects/fitness-tracker/workout/[id]",
                params: { id },
              });
          }}
          onDiscard={() =>
            Alert.alert(
              "Discard workout?",
              "The recorded route will be deleted.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: async () => {
                    await discardWorkout();
                    setRecovery(null);
                  },
                },
              ],
            )
          }
        />
      ) : null}

      <View style={styles.rings}>
        <ProgressRing
          progress={steps / prefs.dailyStepGoal}
          size={150}
          color={palette.accent}
          trackColor={palette.card}
        >
          <Text style={[styles.ringValue, { color: palette.text }]}>
            {stepsAvailable === false ? "—" : steps}
          </Text>
          <Text style={[styles.ringLabel, { color: palette.muted }]}>
            STEPS
          </Text>
        </ProgressRing>
        <ProgressRing
          progress={distanceToday / (prefs.dailyDistanceGoalKm * 1000)}
          size={150}
          color={palette.info}
          trackColor={palette.card}
        >
          <Text style={[styles.ringValue, { color: palette.text }]}>
            {formatKm(distanceToday)}
          </Text>
          <Text style={[styles.ringLabel, { color: palette.muted }]}>
            KM TODAY
          </Text>
        </ProgressRing>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.h2, { color: palette.text }]}>This week</Text>
          <Text style={{ color: palette.warn, fontWeight: "800" }}>
            🔥 {streak} day streak
          </Text>
        </View>
        <BarChart
          data={week}
          height={110}
          color={palette.accent}
          labelColor={palette.muted}
          formatValue={formatKmLabel}
          highlightLast
        />
      </View>

      {session ? (
        <BigButton
          label="● WORKOUT IN PROGRESS"
          color={palette.danger}
          onPress={goToActive}
        />
      ) : (
        <View style={styles.row}>
          <BigButton
            label="START WORKOUT"
            color={palette.accent}
            onPress={() =>
              router.push("/projects/fitness-tracker/workout/start")
            }
          />
        </View>
      )}

      <Text style={[styles.h2, { color: palette.text }]}>Recent</Text>
      {stats.recent.length === 0 ? (
        <Text style={{ color: palette.muted }}>
          No workouts yet. Your first one is a tap away.
        </Text>
      ) : (
        stats.recent.map((w) => (
          <WorkoutRow
            key={w.id}
            workout={w}
            textColor={palette.text}
            mutedColor={palette.muted}
            cardColor={palette.card}
            accent={palette.accent}
            onPress={(id) =>
              router.push({
                pathname: "/projects/fitness-tracker/workout/[id]",
                params: { id },
              })
            }
          />
        ))
      )}
      {stats.today ? (
        <Text style={{ color: palette.muted, textAlign: "center" }}>
          Moving today: {formatDuration(stats.today.movingMs)} ·{" "}
          {stats.today.calories} kcal
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  rings: { flexDirection: "row", justifyContent: "space-around" },
  ringValue: { fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"] },
  ringLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  card: { borderRadius: 16, padding: 14, gap: 10 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  h2: { fontSize: 18, fontWeight: "800" },
  row: { flexDirection: "row" },
});

import * as Battery from "expo-battery";
import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BigButton } from "@/src/projects/fitness-tracker/components/BigButton";
import { GpsSignal } from "@/src/projects/fitness-tracker/components/GpsSignal";
import { HoldButton } from "@/src/projects/fitness-tracker/components/HoldButton";
import { MetricTile } from "@/src/projects/fitness-tracker/components/MetricTile";
import { RouteMap } from "@/src/projects/fitness-tracker/components/map/RouteMap";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { getDb } from "@/src/projects/fitness-tracker/db/client";
import { updateWorkout } from "@/src/projects/fitness-tracker/db/queries/workouts";
import { useBarometerElevation } from "@/src/projects/fitness-tracker/hooks/useBarometerElevation";
import { useElapsed } from "@/src/projects/fitness-tracker/hooks/useElapsed";
import { gpsQuality } from "@/src/projects/fitness-tracker/hooks/useGpsFix";
import { useLivePoints } from "@/src/projects/fitness-tracker/hooks/useLivePoints";
import { useMotionAutoPause } from "@/src/projects/fitness-tracker/hooks/useMotionAutoPause";
import {
  useSession,
  useWorkout,
} from "@/src/projects/fitness-tracker/hooks/useWorkouts";
import { watchSteps } from "@/src/projects/fitness-tracker/sensors/pedometer";
import { silentStopAt } from "@/src/projects/fitness-tracker/tracking/autoPause";
import {
  staleFixMs,
  stillAfterSilenceMs,
} from "@/src/projects/fitness-tracker/tracking/config";
import {
  autoPauseFromMotion,
  autoPauseFromSilence,
  pauseWorkout,
  reattach,
  resumeWorkout,
  stopWorkout,
} from "@/src/projects/fitness-tracker/tracking/controller";
import { MAX_ACCURACY_M } from "@/src/projects/fitness-tracker/tracking/filters";
import {
  douglasPeucker,
  estimateCalories,
  haversine,
  paceSecPerKm,
} from "@/src/projects/fitness-tracker/tracking/metrics";
import { activeSince } from "@/src/projects/fitness-tracker/tracking/state";
import {
  formatDuration,
  formatKm,
  formatPace,
} from "@/src/projects/fitness-tracker/utils/format";
import { goalProgress } from "@/src/projects/fitness-tracker/utils/goal";
import { paceColoredSegments } from "@/src/projects/fitness-tracker/utils/paceColor";
import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";

export default function ActiveWorkoutScreen() {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const colorScheme = useColorScheme();
  const { data: session, loading } = useSession();
  const { data: workout } = useWorkout(session?.workoutId);
  const points = useLivePoints(session?.workoutId);
  const { elapsed, now } = useElapsed(session);
  const battery = Battery.useBatteryLevel();
  const baroDelta = useBarometerElevation(session != null);
  const [steps, setSteps] = useState(0);
  const lastWorkoutId = useRef<string | null>(null);

  useEffect(() => {
    const sub = watchSteps(setSteps);
    return () => sub.remove();
  }, []);

  // However we got here (Today button, notification tap, recovery skipped),
  // make sure the location source is armed. Idempotent.
  useEffect(() => {
    reattach().catch(() => {});
  }, []);

  useMotionAutoPause(
    session?.autoPause === true && session.status !== "paused",
    session?.status === "autopaused",
    (action, at) => autoPauseFromMotion(action, at),
  );

  // The single place that leaves for the summary: after the hold-to-stop
  // below, or when the workout ended elsewhere (lock-screen End button,
  // notification).
  useEffect(() => {
    if (session) lastWorkoutId.current = session.workoutId;
    else if (!loading) {
      const id = lastWorkoutId.current;
      if (id)
        router.replace({
          pathname: "/projects/fitness-tracker/workout/[id]",
          params: { id },
        });
      else router.back();
    }
  }, [session, loading, router]);

  // Downsample before rendering: 10k raw coordinates kill the map's frame rate.
  const segments = useMemo(
    () => paceColoredSegments(douglasPeucker(points, 3)),
    [points],
  );
  const last = points[points.length - 1];
  const follow = useMemo(
    () => (last ? { latitude: last.lat, longitude: last.lng } : null),
    // Only re-centre when we've moved noticeably.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [last && Math.round(last.lat * 5000), last && Math.round(last.lng * 5000)],
  );

  const currentPace = useMemo(() => {
    // Rolling pace over the last ~200 m of the current segment.
    let d = 0;
    for (let i = points.length - 1; i > 0 && d < 200; i--) {
      if (points[i].segment !== points[i - 1].segment) break;
      d += haversine(points[i - 1], points[i]);
      if (d >= 200) return (points[points.length - 1].t - points[i - 1].t) / d;
    }
    return null;
  }, [points]);

  const status = session?.status ?? "active";
  const since = session ? activeSince(session) : 0;
  const lastRaw = session?.lastRaw ?? null;
  const lastFixAt = lastRaw?.timestamp ?? last?.t ?? null;
  // A standing user gets no fixes at all (distance filter), so silence after
  // good fixes is not "GPS lost". Warn only when there has been no fix since
  // the start / last resume, or fixes arrive but are too inaccurate to use.
  const noFix =
    session != null &&
    status === "active" &&
    (lastFixAt == null || lastFixAt < since) &&
    now - since > staleFixMs(session.mode);
  const weakFix =
    status === "active" &&
    lastRaw != null &&
    lastRaw.timestamp >= since &&
    lastRaw.accuracy != null &&
    lastRaw.accuracy > MAX_ACCURACY_M;
  const quality = noFix
    ? "none"
    : gpsQuality(lastRaw?.accuracy ?? last?.acc ?? null);
  const distance = workout?.distanceM ?? 0;
  const avgPace = workout ? paceSecPerKm(distance, workout.movingMs, 20) : null;
  const goal = workout
    ? goalProgress(workout.goalType, workout.goalValue, {
        distanceM: distance,
        elapsedMs: elapsed,
        calories: estimateCalories(workout.type, distance, workout.movingMs),
      })
    : null;

  // Time-based auto-pause: silence longer than one distance interval at
  // stopping speed means standing still, even with no "still" fix.
  const silent =
    session != null &&
    session.autoPause &&
    status === "active" &&
    silentStopAt(lastFixAt, since, now, stillAfterSilenceMs(session.mode)) !=
      null;
  useEffect(() => {
    if (silent) autoPauseFromSilence().catch(() => {});
  }, [silent]);

  const stop = async () => {
    // Navigation happens in the effect above once the session row is gone.
    const id = await stopWorkout();
    if (id && steps > 0) {
      await updateWorkout(await getDb(), id, { steps });
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: palette.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <View style={styles.statusRow}>
        <Text
          style={[
            styles.rec,
            { color: status === "active" ? palette.danger : palette.warn },
          ]}
        >
          {status === "active"
            ? "● REC"
            : status === "autopaused"
              ? "❚❚ AUTO-PAUSED"
              : "❚❚ PAUSED"}
        </Text>
        <GpsSignal
          quality={quality}
          color={palette.text}
          mutedColor={palette.muted}
        />
        <Text style={[styles.battery, { color: palette.text }]}>
          🔋 {battery >= 0 ? Math.round(battery * 100) : "—"}%
        </Text>
      </View>
      {noFix || weakFix ? (
        <Text style={[styles.banner, { backgroundColor: palette.warn }]}>
          {noFix ? "GPS signal lost" : "GPS signal too weak"} — distance is not
          being recorded
        </Text>
      ) : null}
      {session && !session.background ? (
        <Text style={[styles.banner, { backgroundColor: palette.info }]}>
          Foreground-only tracking: keep the app open
        </Text>
      ) : null}

      <MetricTile
        value={formatDuration(elapsed, true)}
        label="Duration"
        size="hero"
        color={palette.text}
        mutedColor={palette.muted}
      />
      {goal ? (
        <View style={styles.goal}>
          <Text style={[styles.goalText, { color: palette.text }]}>
            Goal {goal.label}
            {goal.fraction >= 1 ? " ✓" : ""}
          </Text>
          <View style={[styles.goalTrack, { backgroundColor: palette.card }]}>
            <View
              style={[
                styles.goalFill,
                {
                  backgroundColor: palette.accent,
                  width: `${goal.fraction * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : null}
      <View style={styles.row}>
        <MetricTile
          value={`${formatKm(distance)} km`}
          label="Distance"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={formatPace(avgPace)}
          label="Avg pace"
          color={palette.text}
          mutedColor={palette.muted}
        />
      </View>
      <View style={styles.row}>
        <MetricTile
          value={formatPace(currentPace)}
          label="Pace"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={`${Math.round(workout?.elevationGainM ?? 0)} m`}
          label={
            baroDelta != null
              ? `Climb · baro ${baroDelta >= 0 ? "+" : ""}${Math.round(baroDelta)}`
              : "Climb"
          }
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
        <MetricTile
          value={String(steps)}
          label="Steps"
          size="small"
          color={palette.text}
          mutedColor={palette.muted}
        />
      </View>

      <View style={[styles.map, { borderColor: palette.border }]}>
        <RouteMap
          segments={segments}
          follow={follow}
          dark={colorScheme === "dark"}
        />
      </View>

      <View style={styles.controls}>
        {status === "active" ? (
          <BigButton
            label="❚❚ PAUSE"
            color={palette.warn}
            onPress={() => pauseWorkout()}
          />
        ) : (
          <BigButton
            label="▶ RESUME"
            color={palette.accent}
            onPress={() => resumeWorkout()}
          />
        )}
        <HoldButton
          label={"■\nHOLD"}
          color={palette.danger}
          trackColor={palette.card}
          onComplete={stop}
          size={88}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, gap: 6 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  rec: { fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  battery: { fontSize: 14, fontWeight: "700" },
  banner: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: { flexDirection: "row" },
  goal: { gap: 4 },
  goalText: {
    textAlign: "center",
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  goalTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  goalFill: { height: 6, borderRadius: 3 },
  map: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    minHeight: 140,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
  },
});

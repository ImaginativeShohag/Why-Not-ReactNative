import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ActivityTypePicker } from "@/src/projects/fitness-tracker/components/ActivityTypePicker";
import { BigButton } from "@/src/projects/fitness-tracker/components/BigButton";
import { Chip } from "@/src/projects/fitness-tracker/components/Chip";
import { GpsSignal } from "@/src/projects/fitness-tracker/components/GpsSignal";
import { ToggleRow } from "@/src/projects/fitness-tracker/components/ToggleRow";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { getDb } from "@/src/projects/fitness-tracker/db/client";
import {
  setPrefs,
  type Prefs,
} from "@/src/projects/fitness-tracker/db/queries/prefs";
import { useGpsFix } from "@/src/projects/fitness-tracker/hooks/useGpsFix";
import { usePermissions } from "@/src/projects/fitness-tracker/hooks/usePermissions";
import { usePrefs } from "@/src/projects/fitness-tracker/hooks/useWorkouts";
import type { GoalType } from "@/src/projects/fitness-tracker/models/Workout";
import { startWorkout } from "@/src/projects/fitness-tracker/tracking/controller";

const GOALS: { type: GoalType; label: string; unit: string; step: number }[] = [
  { type: "open", label: "Open", unit: "", step: 0 },
  { type: "distance", label: "Distance", unit: "km", step: 0.5 },
  { type: "time", label: "Time", unit: "min", step: 5 },
  { type: "calories", label: "Calories", unit: "kcal", step: 50 },
];

const GPS_TEXT = {
  none: "Acquiring satellites…",
  poor: "Weak signal — move away from buildings",
  fair: "Usable fix",
  good: "Locked",
};

export default function StartWorkoutScreen() {
  const router = useRouter();
  const palette = usePalette();
  const { data: stored } = usePrefs();
  // Local overrides on top of stored prefs: instant UI, persisted in the background.
  const [overrides, setOverrides] = useState<Partial<Prefs>>({});
  const prefs: Prefs = { ...stored, ...overrides };
  const [countdown, setCountdown] = useState<number | null>(null);
  const { state: perms } = usePermissions();
  const canTrack = perms?.foreground === "granted";
  const gps = useGpsFix(canTrack);

  const update = (patch: Partial<Prefs>) => {
    setOverrides((o) => ({ ...o, ...patch }));
    getDb().then((db) => setPrefs(db, patch));
  };

  const goal = GOALS.find((g) => g.type === prefs.goalType)!;

  useEffect(() => {
    if (countdown == null) return;
    if (countdown === 0) {
      startWorkout({
        activity: prefs.activity,
        mode: prefs.mode,
        goalType: prefs.goalType,
        goalValue: prefs.goalValue,
        autoPause: prefs.autoPause,
        voiceCues: prefs.voiceCues,
      })
        .then(() => router.replace("/projects/fitness-tracker/workout/active"))
        .catch((e: Error) => {
          setCountdown(null);
          Alert.alert("Couldn't start", e.message);
        });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const id = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  if (countdown != null) {
    return (
      <View style={[styles.countdown, { backgroundColor: palette.accent }]}>
        <Text style={styles.countdownText}>
          {countdown === 0 ? "GO" : countdown}
        </Text>
        <Pressable onPress={() => setCountdown(null)} style={styles.cancel}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
    >
      <ActivityTypePicker
        value={prefs.activity}
        onChange={(activity) => update({ activity })}
        accent={palette.accent}
        textColor={palette.text}
        cardColor={palette.card}
      />

      <View style={[styles.card, { backgroundColor: palette.card }]}>
        {canTrack ? (
          <>
            <GpsSignal
              quality={gps.quality}
              color={palette.text}
              mutedColor={palette.muted}
              showLabel
            />
            <Text style={{ color: palette.muted }}>
              {GPS_TEXT[gps.quality]}
              {gps.accuracy != null ? ` · ±${Math.round(gps.accuracy)} m` : ""}
            </Text>
          </>
        ) : (
          <Pressable
            onPress={() =>
              router.push("/projects/fitness-tracker/settings/permissions")
            }
          >
            <Text style={{ color: palette.danger, fontWeight: "700" }}>
              Location permission needed — tap to set up permissions.
            </Text>
          </Pressable>
        )}
        {canTrack && perms?.background !== "granted" ? (
          <Text style={{ color: palette.warn, fontSize: 12 }}>
            Background location is off: tracking stops when the screen locks.
          </Text>
        ) : null}
      </View>

      <Text style={[styles.h2, { color: palette.muted }]}>GOAL</Text>
      <View style={styles.chips}>
        {GOALS.map((g) => (
          <Chip
            key={g.type}
            label={g.label}
            selected={prefs.goalType === g.type}
            onPress={() =>
              update({
                goalType: g.type,
                goalValue:
                  g.type === "distance"
                    ? 5
                    : g.type === "time"
                      ? 30
                      : g.type === "calories"
                        ? 300
                        : 0,
              })
            }
            color={palette.accent}
            textColor={palette.text}
            borderColor={palette.border}
          />
        ))}
      </View>
      {goal.type !== "open" ? (
        <View style={[styles.stepper, { backgroundColor: palette.card }]}>
          <Stepper
            label="−"
            onPress={() =>
              update({
                goalValue: Math.max(goal.step, prefs.goalValue - goal.step),
              })
            }
            color={palette.text}
          />
          <Text style={[styles.goalValue, { color: palette.text }]}>
            {prefs.goalValue} {goal.unit}
          </Text>
          <Stepper
            label="+"
            onPress={() => update({ goalValue: prefs.goalValue + goal.step })}
            color={palette.text}
          />
        </View>
      ) : null}

      <View>
        <ToggleRow
          label="Auto-pause when stopped"
          value={prefs.autoPause}
          onChange={(autoPause) => update({ autoPause })}
          textColor={palette.text}
          accent={palette.accent}
        />
        <ToggleRow
          label="Voice cues every 1 km"
          value={prefs.voiceCues}
          onChange={(voiceCues) => update({ voiceCues })}
          textColor={palette.text}
          accent={palette.accent}
        />
        <ToggleRow
          label="Battery saver"
          hint="Balanced accuracy, 25 m / 10 s, deferred batches. Rougher route, much less drain."
          value={prefs.mode === "saver"}
          onChange={(saver) => update({ mode: saver ? "saver" : "accurate" })}
          textColor={palette.text}
          mutedColor={palette.muted}
          accent={palette.accent}
        />
      </View>

      <View style={{ flexDirection: "row" }}>
        <BigButton
          label="START"
          color={palette.accent}
          onPress={() => setCountdown(3)}
          disabled={!canTrack}
        />
      </View>
    </ScrollView>
  );
}

function Stepper({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={styles.stepBtn}
      accessibilityRole="button"
    >
      <Text style={{ color, fontSize: 30, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 14, gap: 6 },
  h2: { fontSize: 13, fontWeight: "800", letterSpacing: 1.2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  stepBtn: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  goalValue: { fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  countdown: { flex: 1, alignItems: "center", justifyContent: "center" },
  countdownText: { fontSize: 160, fontWeight: "900", color: "#fff" },
  cancel: { position: "absolute", bottom: 60, padding: 16 },
});

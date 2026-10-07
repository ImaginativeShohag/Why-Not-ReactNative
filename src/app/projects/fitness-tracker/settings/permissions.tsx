import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import {
  PermissionFlow,
  type PermissionStep,
} from "@/src/projects/fitness-tracker/components/PermissionFlow";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { health } from "@/src/projects/fitness-tracker/health/sync";
import {
  PERMISSION_ORDER,
  usePermissions,
  type PermissionKey,
} from "@/src/projects/fitness-tracker/hooks/usePermissions";
import { isAvailable as liveActivitiesAvailable } from "@/src/projects/fitness-tracker/liveactivity";

const COPY: Record<PermissionKey, { title: string; why: string }> = {
  foreground: {
    title: "Location while using",
    why: "Needed to draw your route at all. Asked first — nothing else works without it.",
  },
  background: {
    title: "Location always",
    why:
      Platform.OS === "android"
        ? 'Keeps recording with the screen off. Android sends you to Settings — pick "Allow all the time".'
        : 'Keeps recording with the phone locked in your pocket. Choose "Change to Always Allow".',
  },
  motion: {
    title: "Motion & fitness",
    why: "Step count and cadence, and faster auto-pause when you stop at a light.",
  },
  notifications: {
    title: "Notifications",
    why: "The live workout notification with Pause and End buttons (Android 13+ requires this).",
  },
};

export default function PermissionsScreen() {
  const palette = usePalette();
  const { state, request, openSettings, openBatterySettings } =
    usePermissions();
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  useEffect(() => {
    health.isAvailable().then(setHealthOk);
  }, []);

  const steps: PermissionStep[] = PERMISSION_ORDER.map((key, i) => ({
    key,
    ...COPY[key],
    status: state?.[key] ?? "undetermined",
    // Background location only unlocks after foreground is granted.
    locked:
      key === "background" && state?.[PERMISSION_ORDER[i - 1]] !== "granted",
  }));

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={{ color: palette.muted }}>
        This app needs four separate grants, in this order. Each one says why.
      </Text>
      <PermissionFlow
        steps={steps}
        onRequest={(key) => request(key as PermissionKey)}
        onOpenSettings={openSettings}
        colors={palette}
      />

      {Platform.OS === "android" ? (
        <Pressable
          onPress={openBatterySettings}
          style={[styles.card, { backgroundColor: palette.card }]}
        >
          <Text style={[styles.title, { color: palette.text }]}>
            Battery optimisation
          </Text>
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            Xiaomi, Samsung, Huawei and OnePlus kill background tracking after
            ~20 minutes by default. Tap to exempt this app (set it to
            &quot;Unrestricted&quot;).
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.status, { color: palette.muted }]}>
        {health.storeName}:{" "}
        {healthOk == null
          ? "checking…"
          : healthOk
            ? "available (asked when you sync)"
            : "unavailable"}
      </Text>
      <Text style={[styles.status, { color: palette.muted }]}>
        {Platform.OS === "ios" ? "Live Activities" : "Live notification"}:{" "}
        {liveActivitiesAvailable()
          ? "enabled"
          : "unavailable (needs a development build, or disabled in Settings)"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 14, gap: 6 },
  title: { fontSize: 16, fontWeight: "700" },
  status: { fontSize: 13 },
});

import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useShallow } from "zustand/react/shallow";

import { OptionPicker } from "@/src/projects/offline-journal/components/OptionPicker";
import {
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from "@/src/projects/offline-journal/components/SettingsRows";
import { TimeStepper } from "@/src/projects/offline-journal/components/TimeStepper";
import {
  canAuthenticate,
  promptAuthentication,
} from "@/src/projects/offline-journal/hooks/useAppLock";
import { useJournalActions } from "@/src/projects/offline-journal/hooks/useJournalActions";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { useSyncStatus } from "@/src/projects/offline-journal/hooks/useSyncStatus";
import {
  cancelDailyReminder,
  getPermissionState,
  scheduleDailyReminder,
} from "@/src/projects/offline-journal/reminders/scheduleReminder";
import { useLockStore } from "@/src/projects/offline-journal/stores/lockStore";
import {
  useSettingsStore,
  type FontSize,
  type ThemePreference,
} from "@/src/projects/offline-journal/stores/settingsStore";
import { formatRelative } from "@/src/projects/offline-journal/utils/date";
import { ThemedText } from "@/src/shared/components/themed-text";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const satisfies readonly { value: ThemePreference; label: string }[];

const FONT_SIZES = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
] as const satisfies readonly { value: FontSize; label: string }[];

const LOCK_AFTER = [
  { value: 0, label: "Instant" },
  { value: 60_000, label: "1 min" },
  { value: 300_000, label: "5 min" },
] as const;

const FAILURE_RATES = [
  { value: 0, label: "0%" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "100%" },
] as const;

const LATENCIES = [
  { value: 0, label: "0" },
  { value: 1000, label: "1s" },
  { value: 3000, label: "3s" },
] as const;

type SyncLabelInput = Pick<
  ReturnType<typeof useSyncStatus>,
  "enabled" | "online" | "phase" | "lastError" | "pending"
>;

function syncLabel(s: SyncLabelInput) {
  if (!s.enabled) return "Off";
  if (!s.online) return `Offline · ${s.pending} pending`;
  if (s.phase === "syncing") return "⟳ Syncing…";
  if (s.lastError) return `Error · ${s.pending} pending`;
  if (s.pending > 0) return `⟳ ${s.pending} pending`;
  return "Up to date";
}

export default function SettingsScreen() {
  const palette = usePalette();
  // Only the fields this screen renders, compared shallowly: a write to
  // anything else in the store (`onboarded`, a field added later) no longer
  // re-renders it. The actions are stable, so they get plain selectors.
  const settings = useSettingsStore(
    useShallow((s) => ({
      theme: s.theme,
      fontSize: s.fontSize,
      biometricLock: s.biometricLock,
      lockAfterMs: s.lockAfterMs,
      reminder: s.reminder,
      sync: s.sync,
    })),
  );
  const patch = useSettingsStore((s) => s.patch);
  const patchSync = useSettingsStore((s) => s.patchSync);
  const sync = useSyncStatus();
  const actions = useJournalActions();
  const [serverUrl, setServerUrl] = useState(settings.sync.baseUrl);

  // --- Privacy -------------------------------------------------------------

  const toggleLock = async (enabled: boolean) => {
    if (!enabled) {
      patch({ biometricLock: false });
      return;
    }
    if (!(await canAuthenticate())) {
      Alert.alert(
        "No passcode or biometrics",
        "Set up Face ID, Touch ID, a fingerprint or a device passcode first.",
      );
      return;
    }
    // Prove it works BEFORE turning it on — never lock someone out of a
    // journal with a lock they could not open.
    if (await promptAuthentication("Turn on journal lock")) {
      useLockStore.getState().unlock();
      patch({ biometricLock: true });
    }
  };

  // --- Reminders -----------------------------------------------------------

  const enableReminder = async (hour: number, minute: number) => {
    const id = await scheduleDailyReminder(hour, minute);
    if (id) {
      patch({ reminder: { enabled: true, hour, minute } });
      return;
    }
    patch({ reminder: { enabled: false, hour, minute } });
    Alert.alert(
      "Notifications are off",
      "Allow notifications for this app in Settings to get a daily reminder.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
  };

  const toggleReminder = async (enabled: boolean) => {
    const { hour, minute } = settings.reminder;
    if (!enabled) {
      await cancelDailyReminder();
      patch({ reminder: { enabled: false, hour, minute } });
      return;
    }
    // Our own rationale first: the system prompt is one-shot, so spend it only
    // on someone who already said yes.
    if ((await getPermissionState()) === "undetermined") {
      Alert.alert(
        "A daily nudge",
        "One quiet notification a day at the time you choose. Nothing else, ever.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Continue",
            onPress: () => void enableReminder(hour, minute),
          },
        ],
      );
      return;
    }
    await enableReminder(hour, minute);
  };

  const changeReminderTime = (hour: number, minute: number) => {
    patch({ reminder: { ...settings.reminder, hour, minute } });
    // Reschedule is cancel + schedule under a fixed id, so this is idempotent.
    if (settings.reminder.enabled) void scheduleDailyReminder(hour, minute);
  };

  // --- Data ----------------------------------------------------------------

  const confirmDeleteAll = () =>
    Alert.alert(
      "Delete all entries?",
      settings.sync.enabled
        ? "Entries are removed here and, on the next sync, from your server."
        : "Entries and their photos are removed from this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: async () => {
            const count = await actions.deleteAll(!settings.sync.enabled);
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            Alert.alert("Deleted", `${count} entries removed.`);
          },
        },
      ],
    );

  const runPurge = async () => {
    const { purged, orphans } = await actions.purge(!settings.sync.enabled);
    Alert.alert(
      "Cleaned up",
      `${purged} deleted entries purged, ${orphans} orphaned files removed.`,
    );
  };

  const runExport = async (format: "json" | "md") => {
    try {
      const { count } = await actions.exportAs(format);
      if (count === 0)
        Alert.alert("Nothing to export", "Write something first.");
    } catch (cause) {
      Alert.alert("Export failed", String(cause));
    }
  };

  const runBenchmark = async () => {
    const { ftsMs, likeMs, rows } = await actions.benchmark("sync design");
    Alert.alert(
      "Search benchmark",
      `${rows} rows\nFTS5 MATCH: ${ftsMs.toFixed(2)} ms\nLIKE '%x%': ${likeMs.toFixed(2)} ms`,
    );
  };

  // --- Render --------------------------------------------------------------

  return (
    <ScrollView
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <SettingsSection title="APPEARANCE">
        <SettingsRow
          label="Theme"
          accessory={
            <OptionPicker
              options={THEMES}
              value={settings.theme}
              onChange={(theme) => patch({ theme })}
            />
          }
        />
        <SettingsRow
          label="Font size"
          accessory={
            <OptionPicker
              options={FONT_SIZES}
              value={settings.fontSize}
              onChange={(fontSize) => patch({ fontSize })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="PRIVACY">
        <SettingsSwitchRow
          label="Biometric lock"
          value={settings.biometricLock}
          onValueChange={(value) => void toggleLock(value)}
        />
        {settings.biometricLock ? (
          <>
            <SettingsRow
              label="Lock after"
              accessory={
                <OptionPicker
                  options={LOCK_AFTER}
                  value={settings.lockAfterMs}
                  onChange={(lockAfterMs) => patch({ lockAfterMs })}
                />
              }
            />
            <SettingsRow
              label="Lock now"
              onPress={() => router.push("/projects/offline-journal/lock")}
            />
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection title="REMINDERS">
        <SettingsSwitchRow
          label="Daily reminder"
          value={settings.reminder.enabled}
          onValueChange={(value) => void toggleReminder(value)}
        />
        <SettingsRow
          label="Time"
          accessory={
            <TimeStepper
              hour={settings.reminder.hour}
              minute={settings.reminder.minute}
              onChange={changeReminderTime}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="SYNC">
        <SettingsSwitchRow
          label="Sync to server"
          value={settings.sync.enabled}
          onValueChange={(enabled) => patchSync({ enabled })}
        />
        <View style={[styles.urlRow, { borderColor: palette.border }]}>
          <ThemedText style={[styles.urlLabel, { color: palette.muted }]}>
            Server
          </ThemedText>
          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            onEndEditing={() => patchSync({ baseUrl: serverUrl.trim() })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://localhost:3000"
            placeholderTextColor={palette.muted}
            style={[styles.urlInput, { color: palette.text }]}
          />
        </View>
        <SettingsRow label="Status" value={syncLabel(sync)} />
        <SettingsRow
          label="Last synced"
          value={
            sync.lastSyncedAt ? formatRelative(sync.lastSyncedAt) : "Never"
          }
        />
        {sync.lastError ? (
          <SettingsRow label="Last error" value={sync.lastError} />
        ) : null}
        <SettingsRow
          label="Sync now"
          onPress={async () => {
            const result = await sync.syncNow();
            if (result.skipped === "disabled")
              Alert.alert("Sync is off", "Turn on “Sync to server” first.");
            else if (result.skipped === "offline")
              Alert.alert("Offline", "Your changes are safe on this device.");
          }}
        />
        {sync.dead > 0 ? (
          <>
            <SettingsRow
              label={`Retry ${sync.dead} failed change${sync.dead === 1 ? "" : "s"}`}
              onPress={() => void actions.retryDeadLetters()}
            />
            <SettingsRow
              label="Discard failed changes"
              destructive
              onPress={() => void actions.discardDeadLetters()}
            />
          </>
        ) : null}
        {/* Fault injection: drive the 5xx / backoff paths on demand. */}
        <SettingsRow
          label="Artificial latency"
          accessory={
            <OptionPicker
              options={LATENCIES}
              value={settings.sync.latencyMs}
              onChange={(latencyMs) => patchSync({ latencyMs })}
            />
          }
        />
        <SettingsRow
          label="Artificial failures"
          accessory={
            <OptionPicker
              options={FAILURE_RATES}
              value={settings.sync.failureRate}
              onChange={(failureRate) => patchSync({ failureRate })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="DATA">
        <SettingsRow
          label="Export as JSON"
          onPress={() => void runExport("json")}
        />
        <SettingsRow
          label="Export as Markdown"
          onPress={() => void runExport("md")}
        />
        <SettingsRow
          label="Clean up deleted entries & files"
          onPress={() => void runPurge()}
        />
        <SettingsRow
          label="Delete all entries"
          destructive
          onPress={confirmDeleteAll}
        />
      </SettingsSection>

      {__DEV__ ? (
        <SettingsSection title="DEVELOPER">
          <SettingsRow
            label="Seed 500 entries"
            onPress={async () => {
              await actions.seed(500);
              Alert.alert("Seeded", "500 entries added.");
            }}
          />
          <SettingsRow
            label="Benchmark search (FTS vs LIKE)"
            onPress={() => void runBenchmark()}
          />
          <SettingsRow
            label="Rebuild search index"
            onPress={async () => {
              await actions.rebuildSearchIndex();
              Alert.alert("Done", "entries_fts rebuilt from entries.");
            }}
          />
          <SettingsRow
            label="Sweep orphaned files"
            onPress={async () => {
              const removed = await actions.sweepOrphans();
              Alert.alert("Swept", `${removed} orphaned files removed.`);
            }}
          />
          <SettingsRow
            label="Replay onboarding"
            onPress={() => {
              patch({ onboarded: false });
              router.replace("/projects/offline-journal/onboarding");
            }}
          />
        </SettingsSection>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  urlLabel: { fontSize: 16 },
  urlInput: { flex: 1, fontSize: 15, textAlign: "right", paddingVertical: 10 },
});

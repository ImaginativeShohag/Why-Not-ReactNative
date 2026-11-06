import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";

import Text from "@/src/projects/podcast-player/components/common/PodcastText";
import { OptionChips } from "@/src/projects/podcast-player/components/common/OptionChips";
import { SectionHeader } from "@/src/projects/podcast-player/components/common/SectionHeader";
import {
  type PodcastColors,
  usePodcastColors,
  usePodcastStyles,
} from "@/src/projects/podcast-player/constants/theme";
import { useMiniPlayerInset } from "@/src/projects/podcast-player/hooks/useMiniPlayerInset";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import {
  getUpdatesInfo,
  switchChannel,
  updatesAvailable,
} from "@/src/projects/podcast-player/lib/updates";
import {
  AUTO_DELETE_OPTIONS,
  CONCURRENT_DOWNLOAD_OPTIONS,
  RATE_OPTIONS,
  SKIP_OPTIONS,
  STORAGE_CAP_OPTIONS_GB,
  useSettingsStore,
} from "@/src/projects/podcast-player/stores/settingsStore";
import { env } from "@/src/shared/constants/env";

const GB = 1024 ** 3;
// The channels that actually exist: one per eas.json build profile. Any other
// name only works after `eas channel:create`; the text field below covers that.
const CHANNELS: readonly string[] = ["development", "preview", "production"];

export default function PodcastSettingsScreen() {
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
  const miniInset = useMiniPlayerInset();
  const s = useSettingsStore();
  const info = getUpdatesInfo();
  // Channel surfing is a tester tool: never shown in production store builds.
  const showChannelTools = __DEV__ || env.variant !== "production";
  const [channel, setChannel] = useState(info.channel ?? "");
  const [switching, setSwitching] = useState(false);

  const applyChannel = async (next: string | null) => {
    setSwitching(true);
    try {
      await switchChannel(next);
    } catch (e) {
      Alert.alert("Couldn’t switch channel", (e as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: miniInset + 24 }}
    >
      <SectionHeader title="Playback" />
      <Label text="Skip back" />
      <OptionChips
        options={SKIP_OPTIONS}
        value={s.skipBackSec}
        format={(v) => `${v}s`}
        onChange={(v) => s.update({ skipBackSec: v })}
      />
      <Label text="Skip forward" />
      <OptionChips
        options={SKIP_OPTIONS}
        value={s.skipForwardSec}
        format={(v) => `${v}s`}
        onChange={(v) => s.update({ skipForwardSec: v })}
      />
      <Label text="Default speed" />
      <OptionChips
        options={RATE_OPTIONS}
        value={s.defaultRate}
        format={(v) => `${v}×`}
        onChange={(v) => s.update({ defaultRate: v })}
      />

      <SectionHeader title="Downloads" />
      <ToggleRow
        label="Download on Wi-Fi only"
        value={s.wifiOnly}
        onChange={(v) => {
          s.update({ wifiOnly: v });
          void downloadManager.refreshNetworkRule();
        }}
      />
      <ToggleRow
        label="Delete episodes right after they’re played"
        value={s.deleteWhenPlayed}
        onChange={(v) => s.update({ deleteWhenPlayed: v })}
      />
      <ToggleRow
        label="Auto-download new episodes for new subscriptions"
        value={s.autoDownloadNewForNewSubscriptions}
        onChange={(v) => s.update({ autoDownloadNewForNewSubscriptions: v })}
      />
      <Label text="Auto-delete played episodes after" />
      <OptionChips
        options={AUTO_DELETE_OPTIONS}
        value={s.autoDeleteDays}
        format={(v) => (v === 0 ? "Never" : `${v} d`)}
        onChange={(v) => s.update({ autoDeleteDays: v })}
      />
      <Label text="Storage cap (oldest played episodes are evicted first)" />
      <OptionChips
        options={STORAGE_CAP_OPTIONS_GB}
        value={Math.round(s.storageCapBytes / GB)}
        format={(v) => `${v} GB`}
        onChange={(v) => s.update({ storageCapBytes: v * GB })}
      />
      <Label text="Simultaneous downloads" />
      <OptionChips
        options={CONCURRENT_DOWNLOAD_OPTIONS}
        value={s.maxConcurrentDownloads}
        format={(v) => String(v)}
        onChange={(v) => s.update({ maxConcurrentDownloads: v })}
      />

      <SectionHeader title="App updates" />
      <View style={styles.info}>
        <InfoRow label="Variant" value={env.variant} />
        <InfoRow
          label="Updates enabled"
          value={info.enabled ? "yes" : "no (dev build / Expo Go)"}
        />
        <InfoRow label="Channel" value={info.channel ?? "—"} />
        <InfoRow label="Runtime version" value={info.runtimeVersion ?? "—"} />
        <InfoRow
          label="Running"
          value={
            info.isEmbeddedLaunch ? "embedded bundle" : (info.updateId ?? "—")
          }
        />
        {info.createdAt ? (
          <InfoRow label="Published" value={info.createdAt.toLocaleString()} />
        ) : null}
      </View>

      {showChannelTools ? (
        <>
          <SectionHeader title="Channel surfing (testers only)" />
          <Text style={styles.help}>
            Overrides the expo-channel-name header so this build fetches another
            channel’s updates. Only updates with this build’s runtime version (
            {info.runtimeVersion ?? "unknown"}) can be delivered. The override
            persists until reset.
          </Text>
          <OptionChips
            options={CHANNELS}
            value={channel}
            format={(c) => c}
            onChange={setChannel}
          />
          <TextInput
            value={channel}
            onChangeText={setChannel}
            placeholder="channel name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.buttons}>
            <Button
              label="Switch & reload"
              disabled={!updatesAvailable() || switching || !channel.trim()}
              onPress={() => void applyChannel(channel.trim())}
            />
            <Button
              label="Reset to build channel"
              disabled={!updatesAvailable() || switching}
              onPress={() => void applyChannel(null)}
            />
          </View>
          {!updatesAvailable() ? (
            <Text style={styles.help}>
              Unavailable here: expo-updates is disabled in development builds.
            </Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  const styles = usePodcastStyles(createStyles);
  return <Text style={styles.label}>{text}</Text>;
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const colors = usePodcastColors();
  const styles = usePodcastStyles(createStyles);
  // The off track needs to stay visibly grey against a white screen.
  const offTrack = colors.trackOff;
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: offTrack }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = usePodcastStyles(createStyles);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function Button({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = usePodcastStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (c: PodcastColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    label: {
      color: c.text,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 12,
    },
    toggleLabel: { color: c.text, flex: 1 },
    info: { paddingHorizontal: 16, gap: 6 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
    infoLabel: { color: c.textMuted },
    // No numberOfLines: Android ignores it on selectable text and clips the overflow
    // line. Runtime versions and update ids wrap, which keeps them fully readable.
    infoValue: { color: c.text, flexShrink: 1, textAlign: "right" },
    help: {
      color: c.textMuted,
      fontSize: 12,
      paddingHorizontal: 16,
      paddingBottom: 8,
      lineHeight: 17,
    },
    input: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.surface,
      color: c.text,
    },
    buttons: { flexDirection: "row", gap: 12, padding: 16 },
    button: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.surfaceRaised,
      alignItems: "center",
    },
    buttonText: { color: c.text, fontWeight: "600" },
  });

import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { Palette, Spacing } from "@/src/projects/camera-social/constants/theme";
import { useCaptureStats } from "@/src/projects/camera-social/hooks/useCaptures";
import { useSettings } from "@/src/projects/camera-social/hooks/useSettings";
import { removeAllCaptures } from "@/src/projects/camera-social/media/ingest";
import { storageUsage } from "@/src/projects/camera-social/media/storage";
import { formatBytes } from "@/src/projects/camera-social/utils/format";

const VIDEO_LIMITS = [15, 30, 60];

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const stats = useCaptureStats();
  const { settings, update } = useSettings();

  // Disk usage is a filesystem walk, so it's measured when the tab gains
  // focus (captures can't change while you're on it) and after clearing.
  const [usage, setUsage] = useState(storageUsage);
  useFocusEffect(
    useCallback(() => {
      setUsage(storageUsage());
    }, []),
  );

  const clearAll = useCallback(() => {
    Alert.alert(
      "Delete all captures?",
      "Removes every photo, video and thumbnail stored in this app. Items saved to your gallery are kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: async () => {
            await removeAllCaptures(db);
            setUsage(storageUsage());
          },
        },
      ],
    );
  }, [db]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.statsRow}>
        <Stat value={stats.photos} label="Photos" />
        <Stat value={stats.videos} label="Videos" />
        <Stat value={stats.edits} label="Edits" />
        <Stat value={stats.favorites} label="Liked" />
      </View>

      <Section title="Storage">
        <StorageBar originals={usage.originals} thumbs={usage.thumbs} />
        <Row label="Originals" value={formatBytes(usage.originals)} />
        <Row label="Thumbnails" value={formatBytes(usage.thumbs)} />
      </Section>

      <Section title="Capture">
        <ToggleRow
          label="Save captures to gallery"
          hint="Also writes each capture to the “Why Not RN” album."
          value={settings.saveToGallery}
          onChange={(v) => update({ saveToGallery: v })}
        />
        <ToggleRow
          label="Keep EXIF metadata"
          hint="Camera, exposure and location stay on your captures."
          value={settings.keepExif}
          onChange={(v) => update({ keepExif: v })}
        />
        <ToggleRow
          label="Haptic feedback"
          value={settings.haptics}
          onChange={(v) => update({ haptics: v })}
        />
        <ToggleRow
          label="Shutter sound"
          value={settings.shutterSound}
          onChange={(v) => update({ shutterSound: v })}
        />
        <View style={styles.row}>
          <Text style={styles.label}>Max video length</Text>
          <View style={styles.segment}>
            {VIDEO_LIMITS.map((s) => (
              <Pressable
                key={s}
                onPress={() => update({ maxVideoSeconds: s })}
                style={[
                  styles.segmentItem,
                  settings.maxVideoSeconds === s && styles.segmentActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{
                  selected: settings.maxVideoSeconds === s,
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.maxVideoSeconds === s && styles.segmentTextActive,
                  ]}
                >
                  {s}s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Section>

      <Section title="Permissions">
        <Pressable
          onPress={() => Linking.openSettings()}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.label}>Camera, microphone & photos</Text>
          <Text style={styles.link}>Open Settings</Text>
        </Pressable>
      </Section>

      <Pressable
        onPress={clearAll}
        style={styles.danger}
        accessibilityRole="button"
      >
        <Text style={styles.dangerText}>Delete all captures</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Palette.accent }}
        accessibilityLabel={label}
      />
    </View>
  );
}

function StorageBar({
  originals,
  thumbs,
}: {
  originals: number;
  thumbs: number;
}) {
  const total = originals + thumbs;
  const share = total > 0 ? originals / total : 0;
  return (
    <View style={styles.barWrap}>
      <View style={styles.bar}>
        <View style={[styles.barOriginals, { flex: share }]} />
        <View style={[styles.barThumbs, { flex: 1 - share }]} />
      </View>
      <Text style={styles.barLabel}>{formatBytes(total)} used by this app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: 60 },
  flex: { flex: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: Palette.text, fontSize: 26, fontWeight: "800" },
  statLabel: { color: Palette.textMuted, fontSize: 12, marginTop: 2 },
  section: { gap: Spacing.sm },
  sectionTitle: {
    color: Palette.textFaint,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  label: { color: Palette.text, fontSize: 15 },
  hint: { color: Palette.textFaint, fontSize: 12, marginTop: 2 },
  value: { color: Palette.textMuted, fontSize: 15 },
  link: { color: Palette.accent, fontSize: 15, fontWeight: "600" },
  segment: {
    flexDirection: "row",
    backgroundColor: Palette.surfaceRaised,
    borderRadius: 8,
    padding: 2,
  },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  segmentActive: { backgroundColor: Palette.accent },
  segmentText: { color: Palette.text, fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: "#000" },
  barWrap: { padding: Spacing.lg, gap: Spacing.sm },
  bar: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: Palette.surfaceRaised,
  },
  barOriginals: { backgroundColor: Palette.accent },
  barThumbs: { backgroundColor: Palette.textFaint },
  barLabel: { color: Palette.textMuted, fontSize: 13 },
  danger: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Palette.surface,
  },
  dangerText: { color: Palette.danger, fontWeight: "700", fontSize: 15 },
});

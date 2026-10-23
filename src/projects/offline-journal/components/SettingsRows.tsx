import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const palette = usePalette();
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
        {title}
      </ThemedText>
      <View
        style={[
          styles.group,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  /** Right-hand slot for a control (stepper, segmented picker…). */
  accessory?: ReactNode;
};

export function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  accessory,
}: SettingsRowProps) {
  const palette = usePalette();
  const content = (
    <>
      <ThemedText
        style={[
          styles.label,
          {
            color: destructive
              ? palette.danger
              : onPress && !value && !accessory
                ? palette.accent
                : palette.text,
          },
        ]}
      >
        {label}
      </ThemedText>
      {value ? (
        <ThemedText
          numberOfLines={1}
          style={[styles.value, { color: palette.muted }]}
        >
          {value}
          {onPress ? "  ›" : ""}
        </ThemedText>
      ) : null}
      {accessory}
    </>
  );

  // A row without an action is a plain View. A disabled Pressable is one
  // accessibility element, which hides the accessory's own controls (picker
  // radios, stepper buttons) from VoiceOver and TalkBack.
  if (!onPress) {
    return (
      <View style={[styles.row, { borderColor: palette.border }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderColor: palette.border },
        pressed ? { opacity: 0.6 } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsSwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const palette = usePalette();
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <ThemedText style={[styles.label, { color: palette.text }]}>
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: palette.accent }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  group: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1, fontSize: 16 },
  value: { fontSize: 15, maxWidth: "60%" },
});

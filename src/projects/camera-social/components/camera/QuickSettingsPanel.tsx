import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { GlassView } from "@/src/projects/camera-social/components/common/GlassView";
import { Palette } from "@/src/projects/camera-social/constants/theme";

export type ToggleRow = { key: string; label: string; value: boolean };

type Props = {
  top: number;
  rows: ToggleRow[];
  onToggle: (key: string, value: boolean) => void;
  onDismiss: () => void;
};

/** Small drop-down of camera toggles under the top bar. */
export function QuickSettingsPanel({ top, rows, onToggle, onDismiss }: Props) {
  return (
    <>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
        accessibilityLabel="Close settings"
      />
      <Animated.View
        entering={FadeInUp.duration(160)}
        exiting={FadeOutUp.duration(120)}
        style={[styles.wrap, { top }]}
      >
        <GlassView style={styles.panel} intensity={70}>
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              <Switch
                value={row.value}
                onValueChange={(v) => onToggle(row.key, v)}
                trackColor={{ true: Palette.accent }}
              />
            </View>
          ))}
        </GlassView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 12, width: 250 },
  panel: { borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: { color: Palette.text, fontSize: 15 },
});

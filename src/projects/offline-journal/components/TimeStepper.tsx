import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { formatClock } from "@/src/projects/offline-journal/utils/date";
import { ThemedText } from "@/src/shared/components/themed-text";

export type TimeStepperProps = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  /** Minutes per step. */
  step?: number;
};

/**
 * A dependency-free time control. (No date-picker package is installed; a
 * stepper is enough for "remind me at 21:00".)
 */
export function TimeStepper({
  hour,
  minute,
  onChange,
  step = 15,
}: TimeStepperProps) {
  const palette = usePalette();
  const shift = (delta: number) => {
    const total = (((hour * 60 + minute + delta) % 1440) + 1440) % 1440;
    onChange(Math.floor(total / 60), total % 60);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => shift(-step)}
        hitSlop={8}
        accessibilityLabel="Earlier"
        style={[styles.button, { backgroundColor: palette.chip }]}
      >
        <ThemedText style={{ color: palette.accent }}>−</ThemedText>
      </Pressable>
      <ThemedText style={[styles.time, { color: palette.text }]}>
        {formatClock(hour, minute)}
      </ThemedText>
      <Pressable
        onPress={() => shift(step)}
        hitSlop={8}
        accessibilityLabel="Later"
        style={[styles.button, { backgroundColor: palette.chip }]}
      >
        <ThemedText style={{ color: palette.accent }}>+</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontVariant: ["tabular-nums"],
    fontSize: 16,
    minWidth: 48,
    textAlign: "center",
  },
});

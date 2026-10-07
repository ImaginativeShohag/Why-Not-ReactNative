import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type CalendarMonthViewProps = {
  title: string;
  /** Weeks of day-of-month numbers, null for padding cells. */
  weeks: (number | null)[][];
  weekdayLabels: string[];
  /** Days (1..31) that have at least one entry. */
  markedDays: Set<number>;
  today: number | null;
  selected: number | null;
  onSelectDay: (day: number) => void;
  onPrev: () => void;
  onNext: () => void;
};

export function CalendarMonthView({
  title,
  weeks,
  weekdayLabels,
  markedDays,
  today,
  selected,
  onSelectDay,
  onPrev,
  onNext,
}: CalendarMonthViewProps) {
  const palette = usePalette();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onPrev}
          hitSlop={12}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={22} color={palette.accent} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
          {title}
        </ThemedText>
        <Pressable
          onPress={onNext}
          hitSlop={12}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={22} color={palette.accent} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {weekdayLabels.map((label, index) => (
          <ThemedText
            key={`${label}${index}`}
            style={[styles.weekday, { color: palette.muted }]}
          >
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((day, col) => {
            if (day === null) return <View key={col} style={styles.cell} />;
            const isSelected = day === selected;
            const isToday = day === today;
            const marked = markedDays.has(day);
            return (
              <Pressable
                key={col}
                style={styles.cell}
                onPress={() => onSelectDay(day)}
                accessibilityLabel={`${title} ${day}${marked ? ", has entries" : ""}`}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isToday && { borderColor: palette.accent, borderWidth: 1 },
                    isSelected && { backgroundColor: palette.accent },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayText,
                      { color: isSelected ? palette.accentText : palette.text },
                    ]}
                  >
                    {day}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: marked ? palette.accent : "transparent",
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontSize: 12 },
  cell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 15 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});

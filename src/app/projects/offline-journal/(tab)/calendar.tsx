import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CalendarMonthView } from "@/src/projects/offline-journal/components/CalendarMonthView";
import { SettingsRow } from "@/src/projects/offline-journal/components/SettingsRows";
import { useEntryDays } from "@/src/projects/offline-journal/hooks/useEntries";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import {
  addMonths,
  dayKey,
  formatMonth,
  monthBounds,
  monthGrid,
} from "@/src/projects/offline-journal/utils/date";
import { ThemedText } from "@/src/shared/components/themed-text";

// Sunday-first to match monthGrid's default; labels derived from a known Sunday
// (4 Jan 2026) so they follow the device locale.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Date(2026, 0, 4 + i).toLocaleDateString(undefined, { weekday: "narrow" }),
);

export default function CalendarScreen() {
  const palette = usePalette();
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const { from, to } = monthBounds(cursor.year, cursor.month);
  const { data: counts } = useEntryDays(from, to);

  const weeks = monthGrid(cursor.year, cursor.month);

  const keyFor = (day: number) =>
    dayKey(new Date(cursor.year, cursor.month, day));

  // `counts` only holds this month, keyed `YYYY-MM-DD`: the day is the tail.
  const marked = new Set(
    Object.keys(counts).map((key) => Number(key.slice(8))),
  );

  const isCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const monthTotal = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Tapping a day filters the timeline rather than duplicating it here: one
  // list implementation, one set of row interactions.
  const openDay = (day: number) =>
    router.navigate({
      pathname: "/projects/offline-journal",
      params: { day: keyFor(day) },
    });

  return (
    <ScrollView style={{ backgroundColor: palette.paper }}>
      <CalendarMonthView
        title={formatMonth(cursor.year, cursor.month)}
        weeks={weeks}
        weekdayLabels={WEEKDAYS}
        markedDays={marked}
        today={isCurrentMonth ? now.getDate() : null}
        selected={null}
        onSelectDay={openDay}
        onPrev={() => setCursor((c) => addMonths(c.year, c.month, -1))}
        onNext={() => setCursor((c) => addMonths(c.year, c.month, 1))}
      />

      <View style={styles.summary}>
        <ThemedText style={{ color: palette.muted }}>
          {monthTotal === 0
            ? "No entries this month."
            : `${monthTotal} ${monthTotal === 1 ? "entry" : "entries"} on ${marked.size} ${marked.size === 1 ? "day" : "days"}.`}
        </ThemedText>
      </View>

      {!isCurrentMonth ? (
        <View style={styles.today}>
          <SettingsRow
            label="Jump to today"
            onPress={() =>
              setCursor({ year: now.getFullYear(), month: now.getMonth() })
            }
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { paddingHorizontal: 20, paddingTop: 16 },
  today: { marginTop: 12, marginHorizontal: 16 },
});

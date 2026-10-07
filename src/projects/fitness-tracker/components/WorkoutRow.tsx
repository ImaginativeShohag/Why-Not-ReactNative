import { Pressable, StyleSheet, Text, View } from "react-native";

import { ACTIVITY_EMOJI, type Workout } from "../models/Workout";
import { paceSecPerKm } from "../tracking/metrics";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from "../utils/format";
import { RouteThumbnail } from "./map/RouteThumbnail";

type Props = {
  workout: Workout;
  onPress: (id: string) => void;
  textColor: string;
  mutedColor: string;
  cardColor: string;
  accent: string;
};

export function WorkoutRow({
  workout,
  onPress,
  textColor,
  mutedColor,
  cardColor,
  accent,
}: Props) {
  return (
    <Pressable
      onPress={() => onPress(workout.id)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: cardColor, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <RouteThumbnail
        path={workout.thumbnail ?? []}
        size={64}
        color={accent}
        background={cardColor}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {ACTIVITY_EMOJI[workout.type]} {workout.title}
        </Text>
        <Text style={{ color: mutedColor, fontSize: 12 }}>
          {formatDate(workout.startedAt)}
        </Text>
        <Text style={[styles.stats, { color: textColor }]}>
          {formatDistance(workout.distanceM)} ·{" "}
          {formatDuration(workout.movingMs)} ·{" "}
          {formatPace(paceSecPerKm(workout.distanceM, workout.movingMs))}
          /km
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "700" },
  stats: { fontSize: 14, marginTop: 4, fontVariant: ["tabular-nums"] },
});

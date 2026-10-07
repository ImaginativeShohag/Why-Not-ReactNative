import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABELS,
  type ActivityType,
} from "../models/Workout";

type Props = {
  value: ActivityType;
  onChange: (type: ActivityType) => void;
  accent: string;
  textColor: string;
  cardColor: string;
};

const TYPES: ActivityType[] = ["run", "walk", "cycle", "hike"];

export function ActivityTypePicker({
  value,
  onChange,
  accent,
  textColor,
  cardColor,
}: Props) {
  return (
    <View style={styles.row}>
      {TYPES.map((t) => {
        const selected = t === value;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.item,
              {
                backgroundColor: cardColor,
                borderColor: selected ? accent : "transparent",
              },
            ]}
          >
            <Text style={styles.emoji}>{ACTIVITY_EMOJI[t]}</Text>
            <Text
              style={[styles.label, { color: selected ? accent : textColor }]}
            >
              {ACTIVITY_LABELS[t]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  item: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
  },
  emoji: { fontSize: 28 },
  label: { fontSize: 14, fontWeight: "700", marginTop: 4 },
});

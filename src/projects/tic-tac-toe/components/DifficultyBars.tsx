import { StyleSheet, View } from "react-native";

type Props = {
  /** How many of the three bars are filled: 1 easy, 2 medium, 3 hard. */
  level: 1 | 2 | 3;
  color: string;
  emptyColor: string;
};

const HEIGHTS = [8, 14, 20];

/** A signal-strength style difficulty icon. */
export function DifficultyBars({ level, color, emptyColor }: Props) {
  return (
    <View style={styles.row}>
      {HEIGHTS.map((height, i) => (
        <View
          key={height}
          style={[
            styles.bar,
            { height, backgroundColor: i < level ? color : emptyColor },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 20,
  },
  bar: {
    width: 5,
    borderRadius: 2.5,
  },
});

import { useEffect, useRef } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { Mode, Player } from "@/src/projects/tic-tac-toe/utils/game";
import type { TicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

type Props = {
  scores: { X: number; O: number; draw: number };
  mode: Mode;
  /** Whose turn it is; that tile is highlighted. Null once the round is over. */
  active: Player | null;
  onReset: () => void;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

type TileProps = {
  label: string;
  count: number;
  color: string;
  active: boolean;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

function Tile({
  label,
  count,
  color,
  active,
  palette,
  reduceMotion,
}: TileProps) {
  const bump = useSharedValue(1);
  const glow = useSharedValue(active ? 1 : 0);
  const previousRef = useRef(count);

  useEffect(() => {
    if (previousRef.current === count) return;
    previousRef.current = count;
    if (reduceMotion) return;
    bump.set(
      withSequence(
        withTiming(1.35, { duration: 120 }),
        withSpring(1, { damping: 7, stiffness: 220 }),
      ),
    );
  }, [count, bump, reduceMotion]);

  useEffect(() => {
    const target = active ? 1 : 0;
    glow.set(reduceMotion ? target : withTiming(target, { duration: 220 }));
  }, [active, glow, reduceMotion]);

  const tileStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(glow.get(), [0, 1], [palette.border, color]),
    opacity: 0.7 + glow.get() * 0.3,
  }));
  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bump.get() }],
  }));

  return (
    <Animated.View
      style={[styles.tile, { backgroundColor: palette.surface }, tileStyle]}
      accessible
      accessibilityLabel={`${label}: ${count}`}
    >
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.Text
        style={[styles.count, { color: palette.text }, countStyle]}
      >
        {count}
      </Animated.Text>
    </Animated.View>
  );
}

export function Scoreboard({
  scores,
  mode,
  active,
  onReset,
  palette,
  reduceMotion,
}: Props) {
  const xLabel = mode === "cpu" ? "You" : "Player X";
  const oLabel = mode === "cpu" ? "CPU" : "Player O";
  const empty = scores.X + scores.O + scores.draw === 0;

  const confirmReset = () => {
    if (Platform.OS === "web") {
      onReset();
      return;
    }
    const which = mode === "cpu" ? "vs CPU" : "two-player";
    Alert.alert("Reset scores?", `This clears the ${which} wins and draws.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: onReset },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Tile
          label={xLabel}
          count={scores.X}
          color={palette.x}
          active={active === "X"}
          palette={palette}
          reduceMotion={reduceMotion}
        />
        <Tile
          label="Draws"
          count={scores.draw}
          color={palette.muted}
          active={false}
          palette={palette}
          reduceMotion={reduceMotion}
        />
        <Tile
          label={oLabel}
          count={scores.O}
          color={palette.o}
          active={active === "O"}
          palette={palette}
          reduceMotion={reduceMotion}
        />
      </View>
      <Pressable
        onPress={confirmReset}
        disabled={empty}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Reset scores"
        accessibilityState={{ disabled: empty }}
        style={({ pressed }) => [
          styles.reset,
          { opacity: empty ? 0.6 : pressed ? 0.5 : 1 },
        ]}
      >
        <Text style={[styles.resetText, { color: palette.muted }]}>
          Reset scores
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 2,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  count: {
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  reset: {
    alignSelf: "flex-end",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

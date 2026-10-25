import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import {
  moveSquare,
  type Squares,
} from "@/src/projects/tic-tac-toe/utils/game";
import type { TicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

type Props = {
  history: Squares[];
  currentMove: number;
  onSelect: (move: number) => void;
  /** Locked once the round has a result. */
  disabled: boolean;
  /** Moves that can't be travelled to are shown but not pressable. */
  isSelectable?: (move: number) => boolean;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

/** "Start", or "3 · X B2" (move number, mark, column letter + row number). */
export function moveChipLabel(history: Squares[], move: number): string {
  if (move === 0) return "Start";
  const square = moveSquare(history, move);
  if (square < 0) return `${move}`;
  const mark = history[move][square];
  const cell = `${"ABC"[square % 3]}${Math.floor(square / 3) + 1}`;
  return `${move} · ${mark} ${cell}`;
}

/** A horizontal strip of moves; tapping one travels back (or forward) to it. */
export function MoveTimeline({
  history,
  currentMove,
  onSelect,
  disabled,
  isSelectable,
  palette,
  reduceMotion,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const count = history.length;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
  }, [count, reduceMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {history.map((_, move) => {
        const selected = move === currentMove;
        const future = move > currentMove;
        const locked = disabled || (isSelectable ? !isSelectable(move) : false);
        const label = moveChipLabel(history, move);
        return (
          <Animated.View
            key={move}
            entering={
              reduceMotion
                ? undefined
                : move === 0
                  ? FadeIn
                  : ZoomIn.springify()
            }
          >
            <Pressable
              onPress={() => onSelect(move)}
              disabled={locked || selected}
              accessibilityRole="button"
              accessibilityLabel={
                move === 0 ? "Go to game start" : `Go to move ${label}`
              }
              accessibilityState={{ selected, disabled: locked }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected
                    ? palette.chipSelected
                    : palette.chip,
                  borderColor: selected ? palette.chipSelected : palette.border,
                  opacity:
                    (locked && !selected) || future ? 0.65 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selected
                      ? palette.chipSelectedText
                      : palette.chipText,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView in a column grows to fill it otherwise.
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});

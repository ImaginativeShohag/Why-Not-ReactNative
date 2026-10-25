import { StyleSheet, View } from "react-native";
import { Square } from "@/src/projects/tic-tac-toe/components/Square";
import { WinLine } from "@/src/projects/tic-tac-toe/components/WinLine";
import {
  squareLabel,
  type Squares,
  type WinningLine,
} from "@/src/projects/tic-tac-toe/utils/game";
import type { TicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

type Props = {
  squares: Squares;
  win: WinningLine | null;
  /** Locks every square (round over, or the computer's turn). */
  disabled: boolean;
  onPress: (index: number) => void;
  /** Outer width and height of the card, in points. */
  size: number;
  palette: TicTacToePalette;
  reduceMotion: boolean;
};

const PADDING = 12;
const LINE = 4;
const LINE_INSET = 10;

export function Board({
  squares,
  win,
  disabled,
  onPress,
  size,
  palette,
  reduceMotion,
}: Props) {
  const grid = size - PADDING * 2;
  const cell = grid / 3;

  return (
    <View
      style={[
        styles.card,
        {
          width: size,
          height: size,
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={{ width: grid, height: grid }}>
        {[1, 2].map((k) => (
          <View
            key={`v${k}`}
            style={[
              styles.line,
              {
                backgroundColor: palette.grid,
                left: cell * k - LINE / 2,
                top: LINE_INSET,
                bottom: LINE_INSET,
                width: LINE,
              },
            ]}
          />
        ))}
        {[1, 2].map((k) => (
          <View
            key={`h${k}`}
            style={[
              styles.line,
              {
                backgroundColor: palette.grid,
                top: cell * k - LINE / 2,
                left: LINE_INSET,
                right: LINE_INSET,
                height: LINE,
              },
            ]}
          />
        ))}

        <View style={styles.cells}>
          {squares.map((value, index) => {
            const winning = win !== null && win.line.includes(index);
            return (
              <Square
                key={index}
                value={value}
                label={squareLabel(index, value)}
                size={cell}
                disabled={disabled || value !== null}
                winning={winning}
                dimmed={win !== null && !winning && value !== null}
                onPress={() => onPress(index)}
                palette={palette}
                reduceMotion={reduceMotion}
              />
            );
          })}
        </View>

        {win && (
          <WinLine
            key={win.line.join("-")}
            line={win.line}
            size={grid}
            // The winner's colour, so the line reads as part of its marks.
            color={win.winner === "X" ? palette.x : palette.o}
            reduceMotion={reduceMotion}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    padding: PADDING,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  line: {
    position: "absolute",
    borderRadius: LINE / 2,
  },
  cells: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

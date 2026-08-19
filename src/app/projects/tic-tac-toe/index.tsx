import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { create } from "zustand";
import { combine } from "zustand/middleware";

type Player = "X" | "O";
type SquareValue = Player | null;
type Squares = SquareValue[];
type Updater<T> = T | ((prev: T) => T);

const useGameStore = create(
  combine(
    {
      history: [Array<SquareValue>(9).fill(null)],
      currentMove: 0,
    },
    (set) => {
      return {
        setHistory: (nextHistory: Updater<Squares[]>) => {
          set((state) => ({
            history:
              typeof nextHistory === "function"
                ? nextHistory(state.history)
                : nextHistory,
          }));
        },
        setCurrentMove: (nextCurrentMove: Updater<number>) => {
          set((state) => ({
            currentMove:
              typeof nextCurrentMove === "function"
                ? nextCurrentMove(state.currentMove)
                : nextCurrentMove,
          }));
        },
      };
    },
  ),
);

type SquareProps = {
  value: SquareValue;
  onSquareClick: () => void;
};

function Square({ value, onSquareClick }: SquareProps) {
  return (
    <Pressable style={styles.square} onPress={onSquareClick}>
      <Text style={styles.squareText}>{value}</Text>
    </Pressable>
  );
}

type BoardProps = {
  xIsNext: boolean;
  squares: Squares;
  onPlay: (nextSquares: Squares) => void;
};

function Board({ xIsNext, squares, onPlay }: BoardProps) {
  const winner = calculateWinner(squares);
  const turns = calculateTurns(squares);
  const player = xIsNext ? "X" : "O";
  const status = calculateStatus(winner, turns, player);

  function handleClick(i: number) {
    if (squares[i] || winner) return;
    const nextSquares = squares.slice();
    nextSquares[i] = player;
    onPlay(nextSquares);
  }

  return (
    <View>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.board}>
        {squares.map((square, squareIndex) => (
          <Square
            key={`square-${squareIndex}`}
            value={square}
            onSquareClick={() => handleClick(squareIndex)}
          />
        ))}
      </View>
    </View>
  );
}

export default function Game() {
  const history = useGameStore((state) => state.history);
  const setHistory = useGameStore((state) => state.setHistory);
  const currentMove = useGameStore((state) => state.currentMove);
  const setCurrentMove = useGameStore((state) => state.setCurrentMove);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];

  function handlePlay(nextSquares: Squares) {
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentMove(nextHistory.length - 1);
  }

  function jumpTo(nextMove: number) {
    setCurrentMove(nextMove);
  }

  return (
    <View style={styles.game}>
      <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
      <View style={styles.moves}>
        {history.map((_, historyIndex) => {
          const description =
            historyIndex > 0
              ? `Go to move #${historyIndex}`
              : "Go to game start";

          return (
            <Pressable
              key={historyIndex}
              style={styles.moveButton}
              onPress={() => jumpTo(historyIndex)}
            >
              <Text style={styles.moveText}>{description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function calculateWinner(squares: Squares): SquareValue {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}

function calculateTurns(squares: Squares): number {
  return squares.filter((square) => !square).length;
}

function calculateStatus(
  winner: SquareValue,
  turns: number,
  player: Player,
): string {
  if (!winner && !turns) return "Draw";
  if (winner) return `Winner ${winner}`;
  return `Next player: ${player}`;
}

const SQUARE_SIZE = 40;
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

const styles = StyleSheet.create({
  game: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 16,
  },
  status: {
    marginBottom: 8,
    fontFamily: MONO,
  },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: SQUARE_SIZE * 3,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#999",
  },
  squareText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: MONO,
  },
  moves: {
    gap: 4,
  },
  moveButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#999",
    backgroundColor: "#fff",
  },
  moveText: {
    fontFamily: MONO,
  },
});

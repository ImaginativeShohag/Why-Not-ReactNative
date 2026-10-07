export type Player = "X" | "O";
export type SquareValue = Player | null;
export type Squares = SquareValue[];

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function calculateWinner(squares: Squares): SquareValue {
  for (let i = 0; i < LINES.length; i++) {
    const [a, b, c] = LINES[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}

/** Turns left to play, which is the number of empty squares. */
export function countRemainingTurns(squares: Squares): number {
  return squares.filter((square) => !square).length;
}

export function calculateStatus(
  winner: SquareValue,
  remainingTurns: number,
  player: Player,
): string {
  if (!winner && !remainingTurns) return "Draw";
  if (winner) return `Winner ${winner}`;
  return `Next player: ${player}`;
}

/** Screen-reader label for square `index` (0–8), e.g. "Row 2, column 3, X". */
export function squareLabel(index: number, value: SquareValue): string {
  const row = Math.floor(index / 3) + 1;
  const column = (index % 3) + 1;
  return `Row ${row}, column ${column}, ${value ?? "empty"}`;
}

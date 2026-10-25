export type Player = "X" | "O";
export type SquareValue = Player | null;
export type Squares = SquareValue[];
export type Mode = "pvp" | "cpu";
export type Difficulty = "easy" | "medium" | "hard";
export type Line = readonly [number, number, number];

export type WinningLine = { winner: Player; line: Line };

/** Everything the screen needs about the board at `currentMove`. */
export type GameView = {
  squares: Squares;
  /** Whose turn it is (meaningless once `isOver`). */
  next: Player;
  win: WinningLine | null;
  isDraw: boolean;
  isOver: boolean;
};

/** In vs-computer mode the human always plays X and moves first. */
export const HUMAN: Player = "X";
export const CPU: Player = "O";

export const LINES: readonly Line[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function emptyBoard(): Squares {
  return Array<SquareValue>(9).fill(null);
}

export function opponent(player: Player): Player {
  return player === "X" ? "O" : "X";
}

const MODES: readonly Mode[] = ["pvp", "cpu"];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

/** The header's mode button toggles: two players ↔ vs computer. */
export function nextMode(mode: Mode): Mode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
}

/** The header's difficulty button cycles easy → medium → hard → easy. */
export function nextDifficulty(difficulty: Difficulty): Difficulty {
  return DIFFICULTIES[
    (DIFFICULTIES.indexOf(difficulty) + 1) % DIFFICULTIES.length
  ];
}

/** 1–3, for the difficulty bars. */
export function difficultyLevel(difficulty: Difficulty): 1 | 2 | 3 {
  return difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
}

/** The first completed line, with who completed it, or null. */
export function findWinningLine(squares: Squares): WinningLine | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const mark = squares[a];
    if (mark && mark === squares[b] && mark === squares[c]) {
      return { winner: mark, line };
    }
  }
  return null;
}

/** Turns left to play, which is the number of empty squares. */
export function countRemainingTurns(squares: Squares): number {
  return squares.filter((square) => !square).length;
}

/** X plays the even moves (0, 2, 4…), O the odd ones. */
export function nextPlayer(moveIndex: number): Player {
  return moveIndex % 2 === 0 ? "X" : "O";
}

export function deriveGame(history: Squares[], currentMove: number): GameView {
  const squares = history[currentMove] ?? emptyBoard();
  const win = findWinningLine(squares);
  const isDraw = !win && countRemainingTurns(squares) === 0;
  return {
    squares,
    next: nextPlayer(currentMove),
    win,
    isDraw,
    isOver: win !== null || isDraw,
  };
}

/**
 * Time travel may land on any move between two players. Against the computer
 * only on the human's turns: landing on the CPU's turn would make it reply at
 * once and throw the rest of the timeline away.
 */
export function canJumpTo(move: number, mode: Mode): boolean {
  return mode === "pvp" || nextPlayer(move) === HUMAN;
}

/** Banner text. A win takes priority, even on the ninth square. */
export function statusText(view: GameView, mode: Mode): string {
  if (view.win) {
    if (mode === "cpu")
      return view.win.winner === HUMAN ? "You win!" : "Computer wins";
    return `${view.win.winner} wins!`;
  }
  if (view.isDraw) return "It's a draw";
  if (mode === "cpu")
    return view.next === HUMAN ? "Your turn" : "Computer is thinking…";
  return `${view.next} to play`;
}

/** Screen-reader label for square `index` (0–8), e.g. "Row 2, column 3, X". */
export function squareLabel(index: number, value: SquareValue): string {
  const row = Math.floor(index / 3) + 1;
  const column = (index % 3) + 1;
  return `Row ${row}, column ${column}, ${value ?? "empty"}`;
}

/** The square that move `moveIndex` (1-based, as in history) filled, or -1. */
export function moveSquare(history: Squares[], moveIndex: number): number {
  const before = history[moveIndex - 1];
  const after = history[moveIndex];
  if (!before || !after) return -1;
  return after.findIndex((value, i) => value !== before[i]);
}

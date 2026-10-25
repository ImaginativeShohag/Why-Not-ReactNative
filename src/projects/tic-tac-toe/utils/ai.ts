import {
  countRemainingTurns,
  Difficulty,
  findWinningLine,
  LINES,
  opponent,
  Player,
  Squares,
} from "@/src/projects/tic-tac-toe/utils/game";

/** Indexes of every empty square, lowest first. */
export function emptySquares(squares: Squares): number[] {
  const empty: number[] = [];
  squares.forEach((value, index) => {
    if (!value) empty.push(index);
  });
  return empty;
}

/** The square that completes a line for `player` right now, or -1. */
export function findImmediateWin(squares: Squares, player: Player): number {
  for (const line of LINES) {
    const marks = line.map((i) => squares[i]);
    const own = marks.filter((mark) => mark === player).length;
    const gap = line.find((i) => !squares[i]);
    if (own === 2 && gap !== undefined) return gap;
  }
  return -1;
}

/** One item from `items`, picked with `random` (a number in [0, 1)). */
function pickRandom(items: number[], random: () => number): number {
  if (items.length === 0) return -1;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
}

/**
 * Minimax score of `squares` from `cpu`'s point of view, with `turn` to move.
 * A win scores 10 - depth and a loss depth - 10, so faster wins and slower
 * losses rank higher. A draw scores 0.
 */
function score(
  squares: Squares,
  cpu: Player,
  turn: Player,
  depth: number,
): number {
  const win = findWinningLine(squares);
  if (win) return win.winner === cpu ? 10 - depth : depth - 10;
  if (countRemainingTurns(squares) === 0) return 0;

  let best = turn === cpu ? -Infinity : Infinity;
  for (const index of emptySquares(squares)) {
    squares[index] = turn;
    const value = score(squares, cpu, opponent(turn), depth + 1);
    squares[index] = null;
    best = turn === cpu ? Math.max(best, value) : Math.min(best, value);
  }
  return best;
}

/** Every move with the best minimax score for `cpu`. */
function bestMoves(squares: Squares, cpu: Player): number[] {
  const board = squares.slice();
  let best = -Infinity;
  let moves: number[] = [];
  for (const index of emptySquares(board)) {
    board[index] = cpu;
    const value = score(board, cpu, opponent(cpu), 1);
    board[index] = null;
    if (value > best) {
      best = value;
      moves = [index];
    } else if (value === best) {
      moves.push(index);
    }
  }
  return moves;
}

/**
 * The computer's move for `cpu`, or -1 when the board is full or already won.
 *
 * - easy: any empty square.
 * - medium: win if it can, else block the opponent's win, else any square.
 * - hard: minimax, unbeatable. Equally good moves are picked with `random`.
 *
 * `random` is injectable so tests can make the choice deterministic.
 */
export function pickMove(
  squares: Squares,
  cpu: Player,
  difficulty: Difficulty,
  random: () => number = Math.random,
): number {
  if (findWinningLine(squares)) return -1;
  const empty = emptySquares(squares);
  if (empty.length === 0) return -1;

  if (difficulty === "easy") return pickRandom(empty, random);

  if (difficulty === "medium") {
    const win = findImmediateWin(squares, cpu);
    if (win !== -1) return win;
    const block = findImmediateWin(squares, opponent(cpu));
    if (block !== -1) return block;
    return pickRandom(empty, random);
  }

  return pickRandom(bestMoves(squares, cpu), random);
}

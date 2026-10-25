import { emptySquares, findImmediateWin, pickMove } from "../utils/ai";
import {
  Difficulty,
  emptyBoard,
  findWinningLine,
  opponent,
  Player,
  Squares,
} from "../utils/game";

const board = (cells: string): Squares =>
  [...cells].map((c) => (c === "X" || c === "O" ? c : null));

const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

describe("findImmediateWin", () => {
  it("finds the gap in a two-in-a-row", () => {
    expect(findImmediateWin(board("XX......."), "X")).toBe(2);
    expect(findImmediateWin(board("O...O...."), "O")).toBe(8);
    expect(findImmediateWin(board("XX......."), "O")).toBe(-1);
  });
});

describe("pickMove", () => {
  it("returns -1 on a full or already won board", () => {
    for (const level of LEVELS) {
      expect(pickMove(board("XOXXOOOXX"), "O", level)).toBe(-1);
      expect(pickMove(board("XXXOO...."), "O", level)).toBe(-1);
    }
  });

  it("takes an immediate win at medium and hard", () => {
    // O can win at 5; X also threatens 2.
    const squares = board("XX.OO.X..");
    expect(pickMove(squares, "O", "medium")).toBe(5);
    expect(pickMove(squares, "O", "hard", () => 0)).toBe(5);
    expect(pickMove(squares, "O", "hard", () => 0.99)).toBe(5);
  });

  it("takes an immediate win at easy when it is the only square", () => {
    // O wins with 3, 4, 5. Easy is random, so leave it no other choice.
    expect(pickMove(board("XOX.OOXXO"), "O", "easy", () => 0)).toBe(3);
    expect(pickMove(board("XOX.OOXXO"), "O", "easy", () => 0.99)).toBe(3);
  });

  it("blocks the opponent at medium and hard", () => {
    const squares = board("XX..O....");
    for (const random of [() => 0, () => 0.5, () => 0.99]) {
      expect(pickMove(squares, "O", "medium", random)).toBe(2);
      expect(pickMove(squares, "O", "hard", random)).toBe(2);
    }
  });

  it("only ever picks empty squares at easy", () => {
    const squares = board("X.O.X.O..");
    const empty = emptySquares(squares);
    expect(pickMove(squares, "X", "easy", () => 0)).toBe(empty[0]);
    expect(pickMove(squares, "X", "easy", () => 0.99)).toBe(
      empty[empty.length - 1],
    );
    for (let r = 0; r < 1; r += 0.05) {
      expect(empty).toContain(pickMove(squares, "X", "easy", () => r));
    }
  });

  /**
   * Plays every possible opponent line against hard and returns how many
   * finished games the opponent won. `hard` uses the seeded tie-break.
   */
  function opponentWins(
    squares: Squares,
    turn: Player,
    cpu: Player,
    random: () => number,
  ): number {
    const win = findWinningLine(squares);
    if (win) return win.winner === cpu ? 0 : 1;
    const empty = emptySquares(squares);
    if (empty.length === 0) return 0;

    if (turn === cpu) {
      const move = pickMove(squares, cpu, "hard", random);
      expect(squares[move]).toBeNull();
      const nextSquares = squares.slice();
      nextSquares[move] = cpu;
      return opponentWins(nextSquares, opponent(turn), cpu, random);
    }

    let wins = 0;
    for (const index of empty) {
      const nextSquares = squares.slice();
      nextSquares[index] = turn;
      wins += opponentWins(nextSquares, opponent(turn), cpu, random);
    }
    return wins;
  }

  it.each([
    ["as O, opponent first", "O" as Player],
    ["as X, moving first", "X" as Player],
  ])("hard never loses %s", (_label, cpu) => {
    for (const random of [() => 0, () => 0.5, () => 0.99]) {
      expect(opponentWins(emptyBoard(), "X", cpu, random)).toBe(0);
    }
  });
});

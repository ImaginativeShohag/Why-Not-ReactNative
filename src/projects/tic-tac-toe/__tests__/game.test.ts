import {
  calculateStatus,
  calculateWinner,
  countRemainingTurns,
  squareLabel,
  Squares,
} from "../utils/game";

const board = (cells: string): Squares =>
  [...cells].map((c) => (c === "X" || c === "O" ? c : null));

describe("calculateWinner", () => {
  it("finds rows, columns and diagonals", () => {
    expect(calculateWinner(board("XXX......"))).toBe("X");
    expect(calculateWinner(board(".O..O..O."))).toBe("O");
    expect(calculateWinner(board("..X.X.X.."))).toBe("X");
  });

  it("returns null with no line", () => {
    expect(calculateWinner(board("........."))).toBeNull();
    expect(calculateWinner(board("XOXXOOOXX"))).toBeNull();
  });
});

describe("countRemainingTurns", () => {
  it("counts empty squares", () => {
    expect(countRemainingTurns(board("........."))).toBe(9);
    expect(countRemainingTurns(board("XO......."))).toBe(7);
    expect(countRemainingTurns(board("XOXXOOOXX"))).toBe(0);
  });
});

describe("calculateStatus", () => {
  it("reports a draw only when the board is full with no winner", () => {
    expect(calculateStatus(null, 0, "X")).toBe("Draw");
    expect(calculateStatus(null, 1, "O")).toBe("Next player: O");
  });

  it("prefers the winner, even on the last square", () => {
    expect(calculateStatus("X", 0, "O")).toBe("Winner X");
  });
});

describe("squareLabel", () => {
  it("names row, column and contents", () => {
    expect(squareLabel(0, null)).toBe("Row 1, column 1, empty");
    expect(squareLabel(5, "O")).toBe("Row 2, column 3, O");
    expect(squareLabel(8, "X")).toBe("Row 3, column 3, X");
  });
});

import {
  canJumpTo,
  countRemainingTurns,
  Difficulty,
  difficultyLevel,
  nextDifficulty,
  nextMode,
  deriveGame,
  emptyBoard,
  findWinningLine,
  GameView,
  moveSquare,
  nextPlayer,
  opponent,
  squareLabel,
  Squares,
  statusText,
} from "../utils/game";

const board = (cells: string): Squares =>
  [...cells].map((c) => (c === "X" || c === "O" ? c : null));

/** The view of a single board, with the turn given by its move number. */
const view = (cells: string, currentMove: number): GameView => ({
  ...deriveGame([board(cells)], 0),
  next: nextPlayer(currentMove),
});

describe("findWinningLine", () => {
  it("finds rows, columns and diagonals with the line", () => {
    expect(findWinningLine(board("XXX......"))).toEqual({
      winner: "X",
      line: [0, 1, 2],
    });
    expect(findWinningLine(board(".O..O..O."))).toEqual({
      winner: "O",
      line: [1, 4, 7],
    });
    expect(findWinningLine(board("..X.X.X.."))).toEqual({
      winner: "X",
      line: [2, 4, 6],
    });
    expect(findWinningLine(board("O...O...O"))).toEqual({
      winner: "O",
      line: [0, 4, 8],
    });
  });

  it("returns null with no line", () => {
    expect(findWinningLine(emptyBoard())).toBeNull();
    expect(findWinningLine(board("XOXXOOOXX"))).toBeNull();
  });
});

describe("countRemainingTurns", () => {
  it("counts empty squares", () => {
    expect(countRemainingTurns(emptyBoard())).toBe(9);
    expect(countRemainingTurns(board("XO......."))).toBe(7);
    expect(countRemainingTurns(board("XOXXOOOXX"))).toBe(0);
  });
});

describe("nextPlayer and opponent", () => {
  it("gives X the even moves", () => {
    expect([0, 1, 2, 3, 8].map(nextPlayer)).toEqual(["X", "O", "X", "O", "X"]);
  });

  it("swaps players", () => {
    expect(opponent("X")).toBe("O");
    expect(opponent("O")).toBe("X");
  });
});

describe("deriveGame", () => {
  it("starts empty with X to play", () => {
    const game = deriveGame([emptyBoard()], 0);
    expect(game).toEqual({
      squares: emptyBoard(),
      next: "X",
      win: null,
      isDraw: false,
      isOver: false,
    });
  });

  it("reads the board at currentMove, not the latest", () => {
    const history = [emptyBoard(), board("X........"), board("XO.......")];
    const game = deriveGame(history, 1);
    expect(game.squares).toEqual(board("X........"));
    expect(game.next).toBe("O");
  });

  it("falls back to an empty board for a missing move", () => {
    expect(deriveGame([], 3).squares).toEqual(emptyBoard());
  });

  it("calls a full board with no line a draw", () => {
    const game = deriveGame([board("XOXXOOOXX")], 0);
    expect(game.isDraw).toBe(true);
    expect(game.isOver).toBe(true);
    expect(game.win).toBeNull();
  });

  it("counts a win on the ninth square as a win, not a draw", () => {
    const game = deriveGame([board("XOXOXOOXX")], 0);
    expect(game.win).toEqual({ winner: "X", line: [0, 4, 8] });
    expect(game.isDraw).toBe(false);
    expect(game.isOver).toBe(true);
  });
});

describe("statusText", () => {
  it("covers pvp turns, wins and draws", () => {
    expect(statusText(view(".........", 0), "pvp")).toBe("X to play");
    expect(statusText(view("X........", 1), "pvp")).toBe("O to play");
    expect(statusText(view("OOO.XX.X.", 6), "pvp")).toBe("O wins!");
    expect(statusText(view("XOXXOOOXX", 9), "pvp")).toBe("It's a draw");
  });

  it("speaks to the human in cpu mode", () => {
    expect(statusText(view(".........", 0), "cpu")).toBe("Your turn");
    expect(statusText(view("X........", 1), "cpu")).toBe(
      "Computer is thinking…",
    );
    expect(statusText(view("XXXOO....", 5), "cpu")).toBe("You win!");
    expect(statusText(view("OOO.XX.X.", 6), "cpu")).toBe("Computer wins");
    expect(statusText(view("XOXXOOOXX", 9), "cpu")).toBe("It's a draw");
  });

  it("prefers the winner, even on the ninth square", () => {
    expect(statusText(deriveGame([board("XOXOXOOXX")], 0), "pvp")).toBe(
      "X wins!",
    );
  });
});

describe("squareLabel", () => {
  it("names row, column and contents", () => {
    expect(squareLabel(0, null)).toBe("Row 1, column 1, empty");
    expect(squareLabel(5, "O")).toBe("Row 2, column 3, O");
    expect(squareLabel(8, "X")).toBe("Row 3, column 3, X");
  });
});

describe("moveSquare", () => {
  const history = [emptyBoard(), board("....X...."), board("O...X....")];

  it("finds the square each move filled", () => {
    expect(moveSquare(history, 1)).toBe(4);
    expect(moveSquare(history, 2)).toBe(0);
  });

  it("returns -1 outside the history", () => {
    expect(moveSquare(history, 0)).toBe(-1);
    expect(moveSquare(history, 3)).toBe(-1);
  });
});

describe("canJumpTo", () => {
  it("allows any move between two players", () => {
    expect([0, 1, 2, 3].map((m) => canJumpTo(m, "pvp"))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it("allows only the human's turns against the computer", () => {
    expect([0, 1, 2, 3].map((m) => canJumpTo(m, "cpu"))).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });
});

describe("nextMode and nextDifficulty", () => {
  it("toggles the mode", () => {
    expect(nextMode("pvp")).toBe("cpu");
    expect(nextMode("cpu")).toBe("pvp");
  });

  it("cycles easy → medium → hard → easy", () => {
    expect(nextDifficulty("easy")).toBe("medium");
    expect(nextDifficulty("medium")).toBe("hard");
    expect(nextDifficulty("hard")).toBe("easy");
  });

  it("maps difficulty to 1–3 bars", () => {
    expect(
      ["easy", "medium", "hard"].map((d) => difficultyLevel(d as Difficulty)),
    ).toEqual([1, 2, 3]);
  });
});

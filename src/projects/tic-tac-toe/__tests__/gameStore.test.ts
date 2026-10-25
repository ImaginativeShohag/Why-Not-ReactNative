import { migrateGame, useGameStore } from "../stores/gameStore";
import { deriveGame, emptyBoard } from "../utils/game";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const initialData = {
  history: [emptyBoard()],
  currentMove: 0,
  mode: "pvp" as const,
  difficulty: "medium" as const,
  scores: { pvp: { X: 0, O: 0, draw: 0 }, cpu: { X: 0, O: 0, draw: 0 } },
  hapticsEnabled: true,
};

const state = () => useGameStore.getState();
const view = () => deriveGame(state().history, state().currentMove);
const playAll = (...indexes: number[]) =>
  indexes.forEach((i) => state().play(i));

beforeEach(() => {
  useGameStore.setState(initialData);
});

describe("play", () => {
  it("fills squares and alternates players", () => {
    playAll(4, 0);
    expect(view().squares[4]).toBe("X");
    expect(view().squares[0]).toBe("O");
    expect(state().currentMove).toBe(2);
    expect(view().next).toBe("X");
  });

  it("ignores a filled square", () => {
    playAll(4, 4);
    expect(state().currentMove).toBe(1);
    expect(state().history).toHaveLength(2);
  });

  it("throws the future away after a jump back", () => {
    playAll(0, 1, 2);
    state().jumpTo(1);
    state().play(8);
    expect(state().history).toHaveLength(3);
    expect(state().currentMove).toBe(2);
    expect(view().squares[8]).toBe("O");
    expect(view().squares[2]).toBeNull();
  });
});

describe("scores", () => {
  it("counts a win exactly once", () => {
    playAll(0, 3, 1, 4, 2);
    expect(view().win?.winner).toBe("X");
    expect(state().scores.pvp).toEqual({ X: 1, O: 0, draw: 0 });
    playAll(5, 6);
    state().undo();
    state().jumpTo(0);
    expect(state().scores.pvp).toEqual({ X: 1, O: 0, draw: 0 });
  });

  it("counts a draw exactly once", () => {
    // X O X / X O O / O X X
    playAll(0, 1, 2, 4, 3, 5, 7, 6, 8);
    expect(view().isDraw).toBe(true);
    expect(state().scores.pvp).toEqual({ X: 0, O: 0, draw: 1 });
    state().play(0);
    expect(state().scores.pvp).toEqual({ X: 0, O: 0, draw: 1 });
  });

  it("resetScores clears the scores only", () => {
    playAll(0, 3, 1, 4, 2);
    state().resetScores();
    expect(state().scores.pvp).toEqual({ X: 0, O: 0, draw: 0 });
    expect(state().currentMove).toBe(5);
  });
});

describe("locked after the result", () => {
  it("ignores play, undo and jumpTo", () => {
    playAll(0, 3, 1, 4, 2);
    const before = state();
    state().play(8);
    state().undo();
    state().jumpTo(1);
    expect(state().history).toBe(before.history);
    expect(state().currentMove).toBe(5);
  });
});

describe("undo", () => {
  it("is a no-op at move 0", () => {
    state().undo();
    expect(state().currentMove).toBe(0);
  });

  it("steps back one move in pvp", () => {
    playAll(0, 4);
    state().undo();
    expect(state().currentMove).toBe(1);
    expect(view().next).toBe("O");
  });

  it("returns to the human's turn after the CPU replied", () => {
    useGameStore.setState({ mode: "cpu" });
    playAll(0, 4, 8, 2);
    state().undo();
    expect(state().currentMove).toBe(2);
    expect(view().next).toBe("X");
  });

  it("returns to the human's turn while the CPU is still to move", () => {
    useGameStore.setState({ mode: "cpu" });
    playAll(0, 4, 8);
    state().undo();
    expect(state().currentMove).toBe(2);
    expect(view().next).toBe("X");

    useGameStore.setState(initialData);
    useGameStore.setState({ mode: "cpu" });
    state().play(0);
    state().undo();
    expect(state().currentMove).toBe(0);
  });
});

describe("jumpTo", () => {
  it("moves within the history and ignores out-of-range moves", () => {
    playAll(0, 1, 2);
    state().jumpTo(1);
    expect(state().currentMove).toBe(1);
    expect(state().history).toHaveLength(4);
    state().jumpTo(9);
    state().jumpTo(-1);
    expect(state().currentMove).toBe(1);
  });
});

describe("jumpTo against the computer", () => {
  it("only lands on the human's turns", () => {
    useGameStore.setState({ mode: "cpu" });
    playAll(0, 4, 8);
    state().jumpTo(1);
    expect(state().currentMove).toBe(3);
    state().jumpTo(2);
    expect(state().currentMove).toBe(2);
    expect(state().history).toHaveLength(4);
  });
});

describe("scores per mode", () => {
  it("counts into the active mode only, and resets only that mode", () => {
    playAll(0, 3, 1, 4, 2); // X wins between two players
    state().setMode("cpu");
    expect(state().scores.cpu).toEqual({ X: 0, O: 0, draw: 0 });
    useGameStore.setState({
      scores: { ...state().scores, cpu: { X: 2, O: 1, draw: 0 } },
    });
    state().resetScores();
    expect(state().scores.cpu).toEqual({ X: 0, O: 0, draw: 0 });
    expect(state().scores.pvp).toEqual({ X: 1, O: 0, draw: 0 });
  });
});

describe("migrateGame", () => {
  it("moves a version 1 shared tally to the mode that was active", () => {
    const v1 = { mode: "pvp", scores: { X: 3, O: 1, draw: 2 } };
    expect(migrateGame(v1, 1)).toMatchObject({
      scores: {
        pvp: { X: 3, O: 1, draw: 2 },
        cpu: { X: 0, O: 0, draw: 0 },
      },
    });
  });

  it("leaves a current save alone", () => {
    const v2 = { scores: initialData.scores };
    expect(migrateGame(v2, 2)).toBe(v2);
  });
});

describe("rounds and settings", () => {
  it("newRound clears the board and keeps the scores", () => {
    playAll(0, 3, 1, 4, 2);
    state().newRound();
    expect(state().history).toEqual([emptyBoard()]);
    expect(state().currentMove).toBe(0);
    expect(state().scores.pvp.X).toBe(1);
  });

  it("setMode starts a new round and keeps the scores", () => {
    playAll(0, 3, 1, 4, 2);
    state().newRound();
    playAll(4);
    state().setMode("cpu");
    expect(state().mode).toBe("cpu");
    expect(state().history).toEqual([emptyBoard()]);
    expect(state().currentMove).toBe(0);
    expect(state().scores.pvp.X).toBe(1);
  });

  it("setDifficulty starts a new round and keeps the scores", () => {
    playAll(0, 3, 1, 4, 2);
    state().newRound();
    playAll(4);
    state().setDifficulty("hard");
    expect(state().difficulty).toBe("hard");
    expect(state().history).toEqual([emptyBoard()]);
    expect(state().scores.pvp.X).toBe(1);
  });

  it("setHapticsEnabled toggles haptics", () => {
    state().setHapticsEnabled(false);
    expect(state().hapticsEnabled).toBe(false);
  });
});

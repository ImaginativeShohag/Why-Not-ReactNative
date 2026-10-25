import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";
import {
  canJumpTo,
  CPU,
  deriveGame,
  Difficulty,
  emptyBoard,
  HUMAN,
  Mode,
  nextPlayer,
  Squares,
} from "@/src/projects/tic-tac-toe/utils/game";

export type Scores = { X: number; O: number; draw: number };
/** Each mode keeps its own tally: a two-player win isn't a win against the CPU. */
export type ScoresByMode = Record<Mode, Scores>;

const noScores = (): Scores => ({ X: 0, O: 0, draw: 0 });

/** A fresh round: one empty board, at move 0. */
const freshRound = () => ({ history: [emptyBoard()], currentMove: 0 });

const initialState = {
  ...freshRound(),
  mode: "cpu" as Mode,
  difficulty: "medium" as Difficulty,
  scores: { pvp: noScores(), cpu: noScores() } as ScoresByMode,
  hapticsEnabled: true,
};

/**
 * The whole game. `combine` infers the state type from `initialState`, and
 * `persist` saves it to AsyncStorage, so a round survives an app restart.
 *
 * The rules live here rather than in the UI: a screen can call `play` for any
 * square and the store decides whether that is a legal move.
 */
export const useGameStore = create(
  persist(
    combine(initialState, (set, get) => ({
      play: (index: number) => {
        const { history, currentMove, mode, scores } = get();
        const view = deriveGame(history, currentMove);
        if (view.isOver || view.squares[index] !== null) return;

        const nextSquares: Squares = view.squares.slice();
        nextSquares[index] = view.next;
        // Playing after a jump back throws the old future away.
        const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
        const result = deriveGame(nextHistory, nextHistory.length - 1);

        // Count the result in the same `set` as the winning move, exactly once:
        // a finished round can't be played, undone or rewound.
        const tally = scores[mode];
        let nextTally = tally;
        if (result.win) {
          const { winner } = result.win;
          nextTally = { ...tally, [winner]: tally[winner] + 1 };
        } else if (result.isDraw) {
          nextTally = { ...tally, draw: tally.draw + 1 };
        }
        const nextScores = { ...scores, [mode]: nextTally };

        set({
          history: nextHistory,
          currentMove: nextHistory.length - 1,
          scores: nextScores,
        });
      },

      undo: () => {
        const { history, currentMove, mode } = get();
        if (currentMove === 0 || deriveGame(history, currentMove).isOver)
          return;
        let target = currentMove - 1;
        // Against the computer, step back past its reply to the human's turn.
        if (mode === "cpu" && nextPlayer(target) === CPU) target -= 1;
        set({ currentMove: Math.max(0, target) });
      },

      jumpTo: (move: number) => {
        const { history, currentMove, mode } = get();
        if (move < 0 || move >= history.length) return;
        if (!canJumpTo(move, mode)) return;
        if (deriveGame(history, currentMove).isOver) return;
        set({ currentMove: move });
      },

      newRound: () => set(freshRound()),

      setMode: (mode: Mode) => set({ mode, ...freshRound() }),

      setDifficulty: (difficulty: Difficulty) =>
        set({ difficulty, ...freshRound() }),

      setHapticsEnabled: (hapticsEnabled: boolean) => set({ hapticsEnabled }),

      /** Clears the current mode's tally only. */
      resetScores: () =>
        set((state) => ({
          scores: { ...state.scores, [state.mode]: noScores() },
        })),
    })),
    {
      name: "tic-tac-toe/game",
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: migrateGame,
      // Data only: actions are recreated by `combine` on every launch.
      partialize: ({
        history,
        currentMove,
        mode,
        difficulty,
        scores,
        hapticsEnabled,
      }) => ({
        history,
        currentMove,
        mode,
        difficulty,
        scores,
        hapticsEnabled,
      }),
    },
  ),
);

export { CPU, HUMAN };

/**
 * Upgrades a saved game to the current `version`. Version 1 kept one shared
 * tally; it can't be split by mode, so it moves to the mode that was active.
 */
export function migrateGame(persisted: unknown, version: number) {
  const state = (persisted ?? {}) as Record<string, unknown>;
  if (version < 2) {
    const mode: Mode = state.mode === "pvp" ? "pvp" : "cpu";
    const old = (state.scores as Scores | undefined) ?? noScores();
    const scores: ScoresByMode = { pvp: noScores(), cpu: noScores() };
    scores[mode] = old;
    return { ...state, scores };
  }
  return state;
}

/**
 * Whether the saved game has loaded. Until then the store holds the defaults,
 * so the screen keeps the board disabled (a tap would be overwritten).
 */
export function useGameHydrated(): boolean {
  return useSyncExternalStore(
    useGameStore.persist.onFinishHydration,
    useGameStore.persist.hasHydrated,
  );
}

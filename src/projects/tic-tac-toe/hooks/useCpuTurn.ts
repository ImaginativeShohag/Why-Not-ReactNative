import { useEffect } from "react";
import { pickMove } from "@/src/projects/tic-tac-toe/utils/ai";
import {
  CPU,
  Difficulty,
  GameView,
  Mode,
} from "@/src/projects/tic-tac-toe/utils/game";

/** How long the computer "thinks" before it plays, in milliseconds. */
export const CPU_DELAY_MS = 450;

/**
 * Plays the computer's move after `CPU_DELAY_MS` whenever it is the CPU's turn.
 * The timer is cleared when the board, mode or difficulty changes, or on
 * unmount, so an undo or a new round never gets a stale move.
 *
 * Returns `thinking`, derived during render rather than kept in state.
 */
export function useCpuTurn(
  view: GameView,
  mode: Mode,
  difficulty: Difficulty,
  play: (index: number) => void,
): boolean {
  const { squares, next, isOver } = view;
  const thinking = mode === "cpu" && !isOver && next === CPU;

  useEffect(() => {
    if (mode !== "cpu" || isOver || next !== CPU) return;
    const timer = setTimeout(() => {
      const index = pickMove(squares, CPU, difficulty);
      if (index !== -1) play(index);
    }, CPU_DELAY_MS);
    return () => clearTimeout(timer);
  }, [squares, next, isOver, mode, difficulty, play]);

  return thinking;
}

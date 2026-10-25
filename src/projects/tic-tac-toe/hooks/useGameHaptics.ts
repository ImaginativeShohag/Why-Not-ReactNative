import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { GameView } from "@/src/projects/tic-tac-toe/utils/game";

/** Haptics may be unavailable (simulator, low power): never let it throw. */
function fire(promise: Promise<void>) {
  promise.catch(() => {});
}

/**
 * Buzzes when the move count changes. One step forward is a move (a light tap,
 * success on a win, warning on a draw); anything else (undo, a timeline jump,
 * a new round, rehydration) is a selection tick. The first render is skipped
 * because the ref starts at the current count.
 */
export function useGameHaptics(
  enabled: boolean,
  moveCount: number,
  view: GameView,
): void {
  const previousRef = useRef(moveCount);
  const won = view.win !== null;
  const { isDraw } = view;

  useEffect(() => {
    const previous = previousRef.current;
    if (previous === moveCount) return;
    previousRef.current = moveCount;
    if (!enabled || Platform.OS === "web") return;

    if (moveCount - previous !== 1) {
      fire(Haptics.selectionAsync());
    } else if (won) {
      fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    } else if (isDraw) {
      fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    } else {
      fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
  }, [enabled, moveCount, won, isDraw]);
}

import { useEffect, useRef } from "react";

import { watchMovement } from "../sensors/motion";
import { initialAutoPause, stepAutoPause } from "../tracking/autoPause";

/**
 * Foreground refinement of auto-pause: device motion reacts faster than GPS
 * speed, especially for *resuming*. Emits pause/resume decisions only.
 */
export function useMotionAutoPause(
  enabled: boolean,
  isAutoPaused: boolean,
  onAction: (action: "pause" | "resume") => void,
) {
  const state = useRef(initialAutoPause);
  const paused = useRef(isAutoPaused);
  const callback = useRef(onAction);

  useEffect(() => {
    paused.current = isAutoPaused;
    callback.current = onAction;
  });

  useEffect(() => {
    if (!enabled) return;
    const sub = watchMovement((sample) => {
      const result = stepAutoPause(state.current, sample, paused.current);
      state.current = result.state;
      if (result.action) callback.current(result.action);
    });
    return () => sub.remove();
  }, [enabled]);
}

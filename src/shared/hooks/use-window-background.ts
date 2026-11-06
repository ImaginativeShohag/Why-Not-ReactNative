import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

/** Colours of every mounted caller, oldest first; the newest one wins. */
const stack: string[] = [];

function apply() {
  void SystemUI.setBackgroundColorAsync(stack.at(-1) ?? null);
}

/**
 * Paints the window behind the system bars while a project is mounted.
 *
 * Edge-to-edge Android draws the navigation bar over the window background,
 * not over the screen, so a dark or tinted project would show a white strip at
 * the bottom. A screen inside the project (the full player) can ask for its
 * own colour; closing it hands the project's colour back, and unmounting the
 * last caller restores the default for the launcher.
 */
export function useWindowBackground(color: string) {
  useEffect(() => {
    stack.push(color);
    apply();
    return () => {
      stack.splice(stack.lastIndexOf(color), 1);
      apply();
    };
  }, [color]);
}

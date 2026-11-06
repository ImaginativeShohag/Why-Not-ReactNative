import { createContext, useContext } from "react";

import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { useThemedStyles } from "@/src/shared/hooks/use-themed-styles";

/**
 * The podcast player's palette, in a light and a dark variant that follow the
 * device setting. The dark values are the original look. The artwork-driven
 * full player and mini-player are immersive and stay on `podcastPalettes.dark`
 * in both schemes. The project never touches `Appearance.setColorScheme`,
 * which is process-wide.
 */
export type PodcastColors = {
  /** Screen background. */
  background: string;
  /** Cards and rows sitting on `background`. */
  surface: string;
  /** A second surface level: inputs, chips, pressed rows. */
  surfaceRaised: string;
  border: string;
  /** Primary text. */
  text: string;
  textMuted: string;
  accent: string;
  /** Text and icons drawn on top of an `accent` fill. */
  onAccent: string;
  danger: string;
  success: string;
  /** Notices and cautions. */
  warning: string;
  /** Off state of a Switch track. */
  trackOff: string;
  /** Backdrop behind overlays. */
  scrim: string;
};

const dark: PodcastColors = {
  background: "#0B0B0F",
  surface: "#16161D",
  surfaceRaised: "#1F1F28",
  border: "#2A2A35",
  text: "#F5F5F7",
  textMuted: "#9A9AA8",
  accent: "#8B5CF6",
  onAccent: "#FFFFFF",
  danger: "#F43F5E",
  success: "#22C55E",
  warning: "#FACC15",
  trackOff: "#2A2A35",
  scrim: "rgba(0,0,0,0.6)",
};

const light: PodcastColors = {
  background: "#FFFFFF",
  surface: "#F4F4F8",
  surfaceRaised: "#E9E9F0",
  border: "#DEDEE7",
  text: "#111118",
  textMuted: "#6B6B7B",
  // A deeper purple than the dark theme's: #8B5CF6 is only 4:1 on white.
  accent: "#7C3AED",
  onAccent: "#FFFFFF",
  danger: "#E11D48",
  success: "#15803D",
  warning: "#A16207",
  trackOff: "#9A9AA8",
  scrim: "rgba(0,0,0,0.4)",
};

export const podcastPalettes = { light, dark } as const;

/**
 * Pins a subtree to one palette whatever the device setting is. The full
 * player is immersive and always dark, and everything inside it (chips,
 * chapters, badges) reads its colours through this.
 */
export const PodcastSchemeOverride = createContext<"light" | "dark" | null>(
  null,
);

/** The palette for the current device setting (or the pinned override). */
export function usePodcastColors(): PodcastColors {
  const override = useContext(PodcastSchemeOverride);
  const scheme = useColorScheme();
  return podcastPalettes[override ?? scheme];
}

/**
 * Builds a screen's styles from the palette. Pass a factory defined at module
 * scope so the result is shared per scheme:
 *
 *   const createStyles = (c: PodcastColors) => StyleSheet.create({ ... });
 *   const styles = usePodcastStyles(createStyles);
 */
export function usePodcastStyles<T>(factory: (colors: PodcastColors) => T): T {
  return useThemedStyles(usePodcastColors(), factory);
}

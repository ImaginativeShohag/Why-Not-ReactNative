import type { FontSize } from "../stores/settingsStore";

/**
 * Calm, paper-like palette with one accent. Journal-specific on purpose — the
 * shared theme only carries text/background/tint, and promoting these would
 * impose the journal's look on every other project.
 */
export const Palette = {
  light: {
    paper: "#FBF8F3",
    card: "#FFFFFF",
    border: "#E7E1D8",
    text: "#2B2622",
    muted: "#8A8175",
    accent: "#B4532A",
    accentText: "#FFFFFF",
    danger: "#C0392B",
    chip: "#F1ECE4",
    cover: "#FBF8F3",
  },
  dark: {
    paper: "#141312",
    card: "#1E1C1A",
    border: "#2E2B28",
    text: "#EDE7DF",
    muted: "#9A9187",
    accent: "#E08A5F",
    accentText: "#141312",
    danger: "#E5675A",
    chip: "#2A2724",
    cover: "#0F0E0D",
  },
} as const;

export type PaletteColors = { [K in keyof typeof Palette.light]: string };

/** Body text sizes for the "Font size" setting. Chrome stays fixed. */
export const BODY_SIZES: Record<
  FontSize,
  { fontSize: number; lineHeight: number }
> = {
  small: { fontSize: 15, lineHeight: 22 },
  medium: { fontSize: 17, lineHeight: 26 },
  large: { fontSize: 20, lineHeight: 30 },
};

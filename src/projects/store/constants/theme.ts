import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { useThemedStyles } from "@/src/shared/hooks/use-themed-styles";

/**
 * The store's palette (iOS system colours), in a light and a dark variant that
 * follow the device setting. Store-scoped on purpose so other projects keep
 * their own look; the store never touches `Appearance.setColorScheme`, which
 * is process-wide.
 */
export type StoreColors = {
  accent: string;
  /** Primary text. */
  label: string;
  secondaryText: string;
  muted: string;
  /** Chevrons, disabled icons, hairline borders. */
  tertiary: string;
  separator: string;
  danger: string;
  success: string;
  /** Success text on a tinted background (higher contrast than `success`). */
  successText: string;
  /** Error text on a tinted background (higher contrast than `danger`). */
  dangerText: string;
  /** Screen background (the grouped-list grey). */
  background: string;
  /** Cards, rows and sheets sitting on `background`. */
  card: string;
  /** A second surface level: skeletons, image wells, segmented tracks. */
  cardAlt: string;
  /** Translucent neutral fill for inputs, chips and pressed states. */
  fill: string;
  /** Text and icons drawn on top of `accent`/`danger` fills. */
  onAccent: string;
  /** Backdrop behind modals and overlays. */
  scrim: string;
  /** Tinted backgrounds for status chips. */
  accentSoft: string;
  successSoft: string;
  dangerSoft: string;
  warningSoft: string;
};

const light: StoreColors = {
  accent: "#007AFF",
  label: "#1C1C1E",
  secondaryText: "#3C3C43",
  muted: "#8E8E93",
  tertiary: "#C7C7CC",
  separator: "#E5E5EA",
  danger: "#FF3B30",
  success: "#34C759",
  successText: "#248A3D",
  dangerText: "#C4271C",
  background: "#F2F2F7",
  card: "#FFFFFF",
  cardAlt: "#F5F5F5",
  fill: "rgba(120,120,128,0.12)",
  onAccent: "#FFFFFF",
  scrim: "rgba(0,0,0,0.5)",
  accentSoft: "rgba(0,122,255,0.12)",
  successSoft: "rgba(52,199,89,0.12)",
  dangerSoft: "rgba(255,59,48,0.1)",
  warningSoft: "rgba(255,204,0,0.2)",
};

const dark: StoreColors = {
  accent: "#0A84FF",
  label: "#F2F2F7",
  secondaryText: "#C7C7CC",
  muted: "#8E8E93",
  tertiary: "#48484A",
  separator: "#38383A",
  danger: "#FF453A",
  success: "#30D158",
  successText: "#32D74B",
  dangerText: "#FF6961",
  background: "#000000",
  card: "#1C1C1E",
  cardAlt: "#2C2C2E",
  fill: "rgba(120,120,128,0.24)",
  onAccent: "#FFFFFF",
  scrim: "rgba(0,0,0,0.6)",
  accentSoft: "rgba(10,132,255,0.2)",
  successSoft: "rgba(48,209,88,0.2)",
  dangerSoft: "rgba(255,69,58,0.2)",
  warningSoft: "rgba(255,214,10,0.25)",
};

export const storePalettes = { light, dark } as const;

/** The palette for the current device setting. */
export function useStoreColors(): StoreColors {
  return storePalettes[useColorScheme()];
}

/**
 * Builds a screen's styles from the palette. Pass a factory defined at module
 * scope so the result is shared per scheme:
 *
 *   const createStyles = (c: StoreColors) => StyleSheet.create({ ... });
 *   const styles = useStoreStyles(createStyles);
 */
export function useStoreStyles<T>(factory: (colors: StoreColors) => T): T {
  return useThemedStyles(useStoreColors(), factory);
}

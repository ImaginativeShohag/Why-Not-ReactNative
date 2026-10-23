import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";

import { Palette, type PaletteColors } from "../constants/palette";
import { useSettingsStore } from "../stores/settingsStore";

export type JournalScheme = "light" | "dark";

/**
 * The journal's own light/dark choice. Deliberately not
 * `Appearance.setColorScheme`: that override is process-wide, and resetting it
 * to "unspecified" on the way out leaves RN's cached scheme stale, so the
 * launcher and every other project stayed in the journal's theme. Resolving
 * the setting here keeps it inside the journal by construction.
 */
export function useJournalScheme(): JournalScheme {
  const system = useColorScheme();
  const theme = useSettingsStore((state) => state.theme);
  return theme === "system" ? system : theme;
}

/** Theme-aware journal colours; follows the journal's Theme setting. */
export function usePalette(): PaletteColors {
  return Palette[useJournalScheme()];
}

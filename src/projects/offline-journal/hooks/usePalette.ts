import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";

import { Palette, type PaletteColors } from "../constants/palette";

/** Theme-aware journal colours; follows the (possibly overridden) scheme. */
export function usePalette(): PaletteColors {
  return Palette[useColorScheme()];
}

import { useEffect } from "react";
import { Appearance } from "react-native";

import type { ThemePreference } from "../stores/settingsStore";

/**
 * Applies the journal's system/light/dark override. `Appearance.setColorScheme`
 * is process-wide, so it is scoped to the journal's lifetime: leaving the
 * project restores "follow the system" for the launcher and other projects.
 */
export function useThemeOverride(theme: ThemePreference) {
  useEffect(() => {
    Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
    return () => Appearance.setColorScheme("unspecified");
  }, [theme]);
}

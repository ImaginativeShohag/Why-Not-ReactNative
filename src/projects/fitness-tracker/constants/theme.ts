import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";

/** High contrast, glanceable — readable at arm's length in sunlight. */
const palettes = {
  light: {
    bg: "#ffffff",
    card: "#f3f4f6",
    text: "#030712",
    muted: "#4b5563",
    border: "#e5e7eb",
    accent: "#16a34a",
    warn: "#ea580c",
    danger: "#dc2626",
    info: "#2563eb",
  },
  dark: {
    bg: "#000000",
    card: "#111827",
    text: "#f9fafb",
    muted: "#9ca3af",
    border: "#1f2937",
    accent: "#22c55e",
    warn: "#fb923c",
    danger: "#ef4444",
    info: "#60a5fa",
  },
};

export type Palette = (typeof palettes)["light"];

export function usePalette(): Palette {
  return palettes[useColorScheme()];
}

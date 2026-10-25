import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";

/**
 * Tic-tac-toe's own colours. The project themes itself from this palette and
 * never touches `Appearance.setColorScheme`, which is process-wide.
 */
export type TicTacToePalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  grid: string;
  text: string;
  muted: string;
  x: string;
  xSoft: string;
  o: string;
  oSoft: string;
  accent: string;
  onAccent: string;
  track: string;
  thumb: string;
  chip: string;
  chipText: string;
  chipSelected: string;
  chipSelectedText: string;
  danger: string;
  shadow: string;
};

const light: TicTacToePalette = {
  background: "#F6F1EA",
  surface: "#FFFFFF",
  surfaceAlt: "#FBF7F2",
  border: "#ECE4DA",
  grid: "#DCD0C1",
  text: "#2B2A33",
  muted: "#8A8494",
  x: "#FF6B5B",
  xSoft: "#FFE3DF",
  o: "#22B8A7",
  oSoft: "#D5F4EF",
  accent: "#6C5CE7",
  onAccent: "#FFFFFF",
  track: "#ECE4DA",
  thumb: "#FFFFFF",
  chip: "#FFFFFF",
  chipText: "#5D5868",
  chipSelected: "#2B2A33",
  chipSelectedText: "#FFFFFF",
  danger: "#E5484D",
  shadow: "#6B5B4B",
};

const dark: TicTacToePalette = {
  background: "#16151C",
  surface: "#211F2A",
  surfaceAlt: "#1B1A23",
  border: "#2F2C3A",
  grid: "#4A4659",
  text: "#F3F0F7",
  muted: "#9C97A8",
  x: "#FF7A6B",
  xSoft: "#43262A",
  o: "#2FD0BD",
  oSoft: "#173936",
  accent: "#8B7CFF",
  onAccent: "#FFFFFF",
  track: "#2A2834",
  thumb: "#3A3747",
  chip: "#2A2834",
  chipText: "#C9C4D4",
  chipSelected: "#F3F0F7",
  chipSelectedText: "#16151C",
  danger: "#FF6369",
  shadow: "#000000",
};

export function useTicTacToePalette(): TicTacToePalette {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? dark : light;
}

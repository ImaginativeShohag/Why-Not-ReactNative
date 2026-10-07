import { hashString } from "@/src/projects/podcast-player/utils/format";

/**
 * react-native-image-colors isn't installed, so the "artwork colour" is derived
 * deterministically from a seed (artwork URL or show id). Same artwork → same
 * colour on every launch, which is what makes the gradient feel intentional.
 */
const PALETTE = [
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#9333EA",
  "#E11D48",
  "#0D9488",
  "#4F46E5",
  "#B45309",
] as const;

export function accentFromSeed(seed: string | null | undefined): string {
  if (!seed) return PALETTE[6];
  return PALETTE[hashString(seed) % PALETTE.length];
}

/** Darkens a #RRGGBB colour by `amount` (0..1) toward black. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = Math.max(0, Math.min(1, 1 - amount));
  const r = Math.round(((n >> 16) & 0xff) * f);
  const g = Math.round(((n >> 8) & 0xff) * f);
  const b = Math.round((n & 0xff) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Design tokens for the dark, artwork-driven look. */
export const PodcastTheme = {
  background: "#0B0B0F",
  surface: "#16161D",
  surfaceRaised: "#1F1F28",
  border: "#2A2A35",
  text: "#F5F5F7",
  textMuted: "#9A9AA8",
  accent: "#8B5CF6",
  danger: "#F43F5E",
  success: "#22C55E",
} as const;

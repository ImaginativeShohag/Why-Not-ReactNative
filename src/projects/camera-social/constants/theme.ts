/**
 * Camera & Social is media-first and dark by default regardless of the system
 * theme: chrome floats over photos, and a white UI would fight the content.
 */
export const Palette = {
  background: "#000",
  surface: "#111214",
  surfaceRaised: "#1c1d20",
  border: "rgba(255,255,255,0.12)",
  text: "#fff",
  textMuted: "rgba(255,255,255,0.6)",
  textFaint: "rgba(255,255,255,0.38)",
  accent: "#ffd60a",
  danger: "#ff453a",
  record: "#ff3b30",
  success: "#30d158",
  scrim: "rgba(0,0,0,0.45)",
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

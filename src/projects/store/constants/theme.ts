/**
 * The store's palette (iOS system colours). One place for the literals that
 * were repeated across screens and components; store-scoped on purpose so
 * other projects keep their own look.
 */
export const storeColors = {
  accent: "#007AFF",
  label: "#1C1C1E",
  secondaryText: "#3C3C43",
  muted: "#8E8E93",
  /** Chevrons, disabled icons, hairline borders. */
  tertiary: "#C7C7CC",
  separator: "#E5E5EA",
  danger: "#FF3B30",
  success: "#34C759",
  /** Success text on a tinted background (higher contrast than `success`). */
  successText: "#248A3D",
} as const;

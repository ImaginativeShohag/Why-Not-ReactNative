/**
 * Shared geometry. The tab layout sets its bar to exactly TAB_BAR_HEIGHT
 * (+ bottom inset) so the mini-player — mounted in the project layout, not
 * inside the tabs — can dock precisely above it.
 */
export const TAB_BAR_HEIGHT = 52;
export const MINI_PLAYER_HEIGHT = 64;
export const MINI_PLAYER_GAP = 6;

/** Bottom padding for scroll content so the mini-player never covers rows. */
export const MINI_PLAYER_CONTENT_INSET =
  MINI_PLAYER_HEIGHT + MINI_PLAYER_GAP * 2;

/** Minimum touch target for transport controls (the doc asks for ≥56pt). */
export const CONTROL_SIZE = 56;

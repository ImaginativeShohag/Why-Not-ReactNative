/** Pure playback-rate rules, shared by the service and its tests. */

export const MIN_RATE = 0.5;
export const MAX_RATE = 3;

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 1;
  return Math.max(MIN_RATE, Math.min(MAX_RATE, rate));
}

/**
 * Rate for a newly loaded episode: an explicit one (a restored session) wins,
 * then a speed the user picked during this run, then the "Default speed"
 * setting. The store's status.rate is NOT an input: it always holds a number
 * (1 initially), so falling back from it would never reach the setting.
 */
export function resolveStartRate(input: {
  explicit?: number | null;
  userRate: number | null;
  defaultRate: number;
}): number {
  return clampRate(input.explicit || input.userRate || input.defaultRate);
}

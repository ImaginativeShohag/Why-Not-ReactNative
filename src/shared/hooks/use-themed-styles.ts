/** One style set per (factory, palette) for the whole app. */
const cache = new WeakMap<object, WeakMap<object, unknown>>();

/**
 * Builds styles from a palette once and shares them between every component
 * that asks for the same factory and palette, so list rows and skeleton
 * blocks do not each allocate their own `StyleSheet`. Pass a factory defined
 * at module scope and a palette object with a stable identity.
 */
export function useThemedStyles<C extends object, T>(
  colors: C,
  factory: (colors: C) => T,
): T {
  let byColors = cache.get(factory);
  if (!byColors) {
    byColors = new WeakMap();
    cache.set(factory, byColors);
  }
  if (!byColors.has(colors)) byColors.set(colors, factory(colors));
  return byColors.get(colors) as T;
}

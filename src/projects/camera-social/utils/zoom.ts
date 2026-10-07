/**
 * Camera zoom curve. expo-camera's `zoom` is linear 0..1 over the device's
 * zoom range, but perceived zoom is multiplicative — a linear pinch feels
 * sluggish at wide and twitchy at tele. Map through a log curve so each pinch
 * doubling feels the same everywhere.
 */

/** Zoom factor reached at camera `zoom = 1`. Devices vary; 10× is typical. */
export const MAX_ZOOM_FACTOR = 10;

export function factorToZoom(factor: number, max = MAX_ZOOM_FACTOR): number {
  "worklet";
  const f = Math.min(max, Math.max(1, factor));
  return Math.log(f) / Math.log(max);
}

export function zoomToFactor(zoom: number, max = MAX_ZOOM_FACTOR): number {
  "worklet";
  const z = Math.min(1, Math.max(0, zoom));
  return Math.pow(max, z);
}

/** New camera zoom for a pinch that started at `startZoom` and is now at `scale`. */
export function pinchToZoom(
  startZoom: number,
  scale: number,
  max = MAX_ZOOM_FACTOR,
): number {
  "worklet";
  return factorToZoom(zoomToFactor(startZoom, max) * scale, max);
}

/** "1×", "2.4×", ".5×" — the label style of the system camera. */
export function formatFactor(factor: number): string {
  "worklet";
  const rounded = Math.round(factor * 10) / 10;
  const text = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${text.startsWith("0.") ? text.slice(1) : text}×`;
}

export const ZOOM_PRESETS = [1, 2, 3] as const;

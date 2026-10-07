import type { NormRect, Size } from "@/src/projects/camera-social/models/Asset";

/**
 * Crop-overlay geometry. The overlay shows the whole (rotated) image at a
 * base "contain" size `display`, scaled by `scale` and offset by `tx, ty`
 * (image centre relative to frame centre), under a fixed frame.
 *
 * Everything the gesture code needs is here as small worklet-safe functions,
 * and the *only* thing that leaves this module is a normalized rect — the same
 * rect the export uses. Screen coordinates never reach the manipulator.
 */

export type CropTransform = { scale: number; tx: number; ty: number };

export const MAX_CROP_SCALE = 6;

/** Largest size with `aspect` (w/h) that fits in `bounds`. */
export function fitAspect(aspect: number, bounds: Size): Size {
  "worklet";
  if (bounds.width / bounds.height > aspect) {
    return { width: bounds.height * aspect, height: bounds.height };
  }
  return { width: bounds.width, height: bounds.width / aspect };
}

/** Smallest scale at which the image still covers the frame. */
export function minScale(display: Size, frame: Size): number {
  "worklet";
  return Math.max(frame.width / display.width, frame.height / display.height);
}

export function clampScale(scale: number, display: Size, frame: Size): number {
  "worklet";
  return Math.min(MAX_CROP_SCALE, Math.max(minScale(display, frame), scale));
}

/** Largest |tx| / |ty| that keeps the image covering the frame. */
export function maxTranslate(scale: number, display: Size, frame: Size) {
  "worklet";
  return {
    x: Math.max(0, (display.width * scale - frame.width) / 2),
    y: Math.max(0, (display.height * scale - frame.height) / 2),
  };
}

export function clampTranslate(
  tx: number,
  ty: number,
  scale: number,
  display: Size,
  frame: Size,
) {
  "worklet";
  const m = maxTranslate(scale, display, frame);
  return {
    tx: Math.min(m.x, Math.max(-m.x, tx)),
    ty: Math.min(m.y, Math.max(-m.y, ty)),
  };
}

/** The frame, expressed as a normalized rect of the image under it. */
export function cropRectFromTransform(
  t: CropTransform,
  display: Size,
  frame: Size,
): NormRect {
  "worklet";
  const w = display.width * t.scale;
  const h = display.height * t.scale;
  return {
    x: ((w - frame.width) / 2 - t.tx) / w,
    y: ((h - frame.height) / 2 - t.ty) / h,
    width: frame.width / w,
    height: frame.height / h,
  };
}

/**
 * Inverse of cropRectFromTransform: place the image so an existing crop rect
 * lines up with `frame`. `frame` must have the rect's pixel aspect.
 */
export function transformFromCropRect(
  rect: NormRect,
  display: Size,
  frame: Size,
): CropTransform {
  "worklet";
  const scale = frame.width / (rect.width * display.width);
  const w = display.width * scale;
  const h = display.height * scale;
  return {
    scale,
    tx: (w - frame.width) / 2 - rect.x * w,
    ty: (h - frame.height) / 2 - rect.y * h,
  };
}

/** Pixel aspect (w/h) of a normalized rect on an image of `size`. */
export function rectAspect(rect: NormRect, size: Size): number {
  "worklet";
  return (rect.width * size.width) / (rect.height * size.height);
}

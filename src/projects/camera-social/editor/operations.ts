import type {
  Adjustments,
  AspectPreset,
  NormRect,
  Op,
  ResolvedEdit,
  Size,
} from "@/src/projects/camera-social/models/Asset";

/**
 * Pure operation logic. No React, no native modules — this is the single
 * place both the live preview and the manipulator export read from, which is
 * what keeps "preview ≠ output" bugs out.
 */

export const FULL_RECT: NormRect = { x: 0, y: 0, width: 1, height: 1 };

export const NEUTRAL_ADJUST: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export const INITIAL_EDIT: ResolvedEdit = {
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: FULL_RECT,
  aspect: "free",
  filter: "none",
  intensity: 1,
  adjust: NEUTRAL_ADJUST,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Keep a rect inside the unit square with a non-degenerate size. */
export function normalizeRect(rect: NormRect): NormRect {
  const width = Math.min(1, Math.max(0.01, rect.width));
  const height = Math.min(1, Math.max(0.01, rect.height));
  return {
    x: Math.min(clamp01(rect.x), 1 - width),
    y: Math.min(clamp01(rect.y), 1 - height),
    width,
    height,
  };
}

/**
 * Where a normalized rect ends up after the image under it rotates 90° clockwise
 * (or counter-clockwise). Keeps a crop attached to the same pixels.
 */
export function rotateRect(rect: NormRect, degrees: 90 | -90): NormRect {
  if (degrees === 90) {
    return {
      x: 1 - rect.y - rect.height,
      y: rect.x,
      width: rect.height,
      height: rect.width,
    };
  }
  return {
    x: rect.y,
    y: 1 - rect.x - rect.width,
    width: rect.height,
    height: rect.width,
  };
}

export function flipRect(
  rect: NormRect,
  axis: "horizontal" | "vertical",
): NormRect {
  return axis === "horizontal"
    ? { ...rect, x: 1 - rect.x - rect.width }
    : { ...rect, y: 1 - rect.y - rect.height };
}

/** The preset a crop frame has after a quarter turn (16:9 ↔ 9:16, 4:5 ↔ 5:4). */
export function rotateAspect(preset: AspectPreset): AspectPreset {
  switch (preset) {
    case "4:5":
      return "5:4";
    case "5:4":
      return "4:5";
    case "16:9":
      return "9:16";
    case "9:16":
      return "16:9";
    default:
      return preset;
  }
}

/**
 * Reduce an operation list to its canonical form:
 * output = crop(flip(rotate(source))).
 *
 * The one non-obvious rule: rotating an already-flipped image by ±90° is the
 * same as rotating first and flipping on the *other* axis, so flips swap.
 */
export function resolveOperations(ops: readonly Op[]): ResolvedEdit {
  let state: ResolvedEdit = INITIAL_EDIT;
  for (const op of ops) {
    switch (op.type) {
      case "rotate": {
        const rotation = ((((state.rotation + op.degrees) % 360) + 360) %
          360) as ResolvedEdit["rotation"];
        state = {
          ...state,
          rotation,
          flipH: state.flipV,
          flipV: state.flipH,
          crop: rotateRect(state.crop, op.degrees),
          // The rect turns with the image, so its preset turns too.
          aspect: rotateAspect(state.aspect),
        };
        break;
      }
      case "flip":
        state = {
          ...state,
          flipH: op.axis === "horizontal" ? !state.flipH : state.flipH,
          flipV: op.axis === "vertical" ? !state.flipV : state.flipV,
          crop: flipRect(state.crop, op.axis),
        };
        break;
      case "crop":
        state = { ...state, crop: normalizeRect(op.rect), aspect: op.aspect };
        break;
      case "filter":
        state = {
          ...state,
          filter: op.name,
          intensity: clamp01(op.intensity),
        };
        break;
      case "adjust":
        state = { ...state, adjust: op.values };
        break;
    }
  }
  return state;
}

/** Size of the image after rotation, before crop. */
export function orientedSize(source: Size, rotation: number): Size {
  return rotation % 180 === 0
    ? source
    : { width: source.height, height: source.width };
}

/** Integer pixel rect the manipulator wants, clamped inside the image. */
export function cropToPixels(rect: NormRect, size: Size) {
  const originX = Math.max(0, Math.round(rect.x * size.width));
  const originY = Math.max(0, Math.round(rect.y * size.height));
  const width = Math.max(
    1,
    Math.min(size.width - originX, Math.round(rect.width * size.width)),
  );
  const height = Math.max(
    1,
    Math.min(size.height - originY, Math.round(rect.height * size.height)),
  );
  return { originX, originY, width, height };
}

/** Pixel size of the final output. */
export function outputSize(source: Size, edit: ResolvedEdit): Size {
  const oriented = orientedSize(source, edit.rotation);
  const px = cropToPixels(edit.crop, oriented);
  return { width: px.width, height: px.height };
}

export function sameRect(a: NormRect, b: NormRect, epsilon = 1e-4): boolean {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  );
}

export function isFullRect(rect: NormRect, epsilon = 1e-4): boolean {
  return sameRect(rect, FULL_RECT, epsilon);
}

/**
 * Whether two resolved edits produce the same output. The aspect preset is
 * only a crop-session hint, and intensity is moot without a filter.
 */
export function sameEdit(a: ResolvedEdit, b: ResolvedEdit): boolean {
  return (
    a.rotation === b.rotation &&
    a.flipH === b.flipH &&
    a.flipV === b.flipV &&
    sameRect(a.crop, b.crop) &&
    a.filter === b.filter &&
    (a.filter === "none" || Math.abs(a.intensity - b.intensity) < 1e-4) &&
    a.adjust.brightness === b.adjust.brightness &&
    a.adjust.contrast === b.adjust.contrast &&
    a.adjust.saturation === b.adjust.saturation
  );
}

/** Whether two operation lists render the same image (not just the same length). */
export function sameOutput(a: readonly Op[], b: readonly Op[]): boolean {
  return sameEdit(resolveOperations(a), resolveOperations(b));
}

export function hasGeometry(edit: ResolvedEdit): boolean {
  return (
    edit.rotation !== 0 || edit.flipH || edit.flipV || !isFullRect(edit.crop)
  );
}

/**
 * One step of the preview transform, outermost first (same convention as
 * React Native / Skia `transform` arrays).
 */
export type TransformStep =
  | { kind: "translate"; x: number; y: number }
  | { kind: "scale"; x: number; y: number }
  | { kind: "rotate"; degrees: number };

/**
 * Transform that draws the *source* image (at 0,0, natural size) so the
 * resolved edit fills a canvas of `canvasWidth` px wide. The canvas height
 * follows from the crop aspect. The manipulator export performs the same
 * rotate → flip → crop sequence on real pixels.
 */
export function previewSteps(
  source: Size,
  edit: ResolvedEdit,
  canvasWidth: number,
): TransformStep[] {
  const oriented = orientedSize(source, edit.rotation);
  const cropPxWidth = edit.crop.width * oriented.width;
  const k = canvasWidth / cropPxWidth;

  const steps: TransformStep[] = [
    { kind: "scale", x: k, y: k },
    {
      kind: "translate",
      x: -edit.crop.x * oriented.width,
      y: -edit.crop.y * oriented.height,
    },
  ];
  if (edit.flipH) {
    steps.push({ kind: "translate", x: oriented.width, y: 0 });
    steps.push({ kind: "scale", x: -1, y: 1 });
  }
  if (edit.flipV) {
    steps.push({ kind: "translate", x: 0, y: oriented.height });
    steps.push({ kind: "scale", x: 1, y: -1 });
  }
  switch (edit.rotation) {
    case 90:
      steps.push({ kind: "translate", x: source.height, y: 0 });
      break;
    case 180:
      steps.push({ kind: "translate", x: source.width, y: source.height });
      break;
    case 270:
      steps.push({ kind: "translate", x: 0, y: source.width });
      break;
  }
  if (edit.rotation !== 0) {
    steps.push({ kind: "rotate", degrees: edit.rotation });
  }
  return steps;
}

/** Map a point through transform steps (used by tests and hit-testing). */
export function applySteps(
  steps: readonly TransformStep[],
  point: { x: number; y: number },
) {
  let { x, y } = point;
  // Innermost step applies first.
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    if (s.kind === "translate") {
      x += s.x;
      y += s.y;
    } else if (s.kind === "scale") {
      x *= s.x;
      y *= s.y;
    } else {
      const r = (s.degrees * Math.PI) / 180;
      const cos = Math.round(Math.cos(r) * 1e9) / 1e9;
      const sin = Math.round(Math.sin(r) * 1e9) / 1e9;
      const nx = x * cos - y * sin;
      const ny = x * sin + y * cos;
      x = nx;
      y = ny;
    }
  }
  return { x, y };
}

/** Aspect ratio (w/h) for a preset, or null for free-form. */
export function aspectValue(preset: ResolvedEdit["aspect"]): number | null {
  switch (preset) {
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "5:4":
      return 5 / 4;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
    default:
      return null;
  }
}

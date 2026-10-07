import type {
  Adjustments,
  FilterName,
} from "@/src/projects/camera-social/models/Asset";

/**
 * 4×5 color matrices (row-major, translation column in 0..1), the format
 * Skia's ColorMatrix / ColorFilter.MakeMatrix take. Filters run on the GPU —
 * pixels never pass through JS.
 */
export type ColorMatrix = number[];

// prettier-ignore
export const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 };

function saturationMatrix(s: number): ColorMatrix {
  const { r, g, b } = LUMA;
  // prettier-ignore
  return [
    r * (1 - s) + s, g * (1 - s),     b * (1 - s),     0, 0,
    r * (1 - s),     g * (1 - s) + s, b * (1 - s),     0, 0,
    r * (1 - s),     g * (1 - s),     b * (1 - s) + s, 0, 0,
    0,               0,               0,               1, 0,
  ];
}

function brightnessMatrix(amount: number): ColorMatrix {
  const t = amount * 0.35;
  // prettier-ignore
  return [
    1, 0, 0, 0, t,
    0, 1, 0, 0, t,
    0, 0, 1, 0, t,
    0, 0, 0, 1, 0,
  ];
}

function contrastMatrix(amount: number): ColorMatrix {
  const c = 1 + amount * 0.6;
  const t = (1 - c) / 2;
  // prettier-ignore
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ];
}

// prettier-ignore
export const FILTERS: Record<FilterName, ColorMatrix> = {
  none: IDENTITY,
  mono: saturationMatrix(0),
  warm: [
    1.08, 0,    0,    0, 0.02,
    0,    1.0,  0,    0, 0.01,
    0,    0,    0.88, 0, 0,
    0,    0,    0,    1, 0,
  ],
  cool: [
    0.9, 0,    0,    0, 0,
    0,   1.0,  0,    0, 0.01,
    0,   0,    1.1,  0, 0.03,
    0,   0,    0,    1, 0,
  ],
  fade: [
    0.8, 0.1, 0.1, 0, 0.06,
    0.1, 0.8, 0.1, 0, 0.06,
    0.1, 0.1, 0.8, 0, 0.06,
    0,   0,   0,   1, 0,
  ],
  vivid: saturationMatrix(1.45),
};

export const FILTER_ORDER: FilterName[] = [
  "none",
  "mono",
  "warm",
  "cool",
  "fade",
  "vivid",
];

export const FILTER_LABELS: Record<FilterName, string> = {
  none: "None",
  mono: "Mono",
  warm: "Warm",
  cool: "Cool",
  fade: "Fade",
  vivid: "Vivid",
};

/** a ∘ b — apply `b` first, then `a`. Treats both as 5×5 affine. */
export function multiply(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out: number[] = new Array(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = col === 4 ? a[row * 5 + 4] : 0;
      for (let k = 0; k < 4; k++) {
        sum += a[row * 5 + k] * b[k * 5 + col];
      }
      out[row * 5 + col] = sum;
    }
  }
  return out;
}

function lerpMatrix(
  from: ColorMatrix,
  to: ColorMatrix,
  t: number,
): ColorMatrix {
  return from.map((v, i) => v + (to[i] - v) * t);
}

/** The single matrix the preview renders and the export bakes in. */
export function buildColorMatrix(
  filter: FilterName,
  intensity: number,
  adjust: Adjustments,
): ColorMatrix {
  const filterMatrix = lerpMatrix(IDENTITY, FILTERS[filter], intensity);
  const adjustMatrix = multiply(
    brightnessMatrix(adjust.brightness),
    multiply(
      contrastMatrix(adjust.contrast),
      saturationMatrix(1 + adjust.saturation),
    ),
  );
  return multiply(adjustMatrix, filterMatrix);
}

export function isIdentity(m: ColorMatrix, epsilon = 1e-6): boolean {
  return m.every((v, i) => Math.abs(v - IDENTITY[i]) < epsilon);
}

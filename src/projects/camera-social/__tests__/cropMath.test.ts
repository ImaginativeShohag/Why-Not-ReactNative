import {
  clampScale,
  clampTranslate,
  cropRectFromTransform,
  fitAspect,
  minScale,
  rectAspect,
  transformFromCropRect,
} from "@/src/projects/camera-social/editor/cropMath";

const display = { width: 300, height: 200 };

describe("crop math", () => {
  it("fits an aspect inside bounds", () => {
    expect(fitAspect(1, { width: 300, height: 200 })).toEqual({
      width: 200,
      height: 200,
    });
    expect(fitAspect(16 / 9, { width: 320, height: 400 })).toEqual({
      width: 320,
      height: 180,
    });
  });

  it("frame equal to the displayed image at scale 1 is the full rect", () => {
    const rect = cropRectFromTransform(
      { scale: 1, tx: 0, ty: 0 },
      display,
      display,
    );
    expect(rect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it("centred square frame crops the middle", () => {
    const frame = { width: 200, height: 200 };
    const rect = cropRectFromTransform(
      { scale: 1, tx: 0, ty: 0 },
      display,
      frame,
    );
    expect(rect.x).toBeCloseTo(50 / 300);
    expect(rect.y).toBeCloseTo(0);
    expect(rect.width).toBeCloseTo(200 / 300);
    expect(rect.height).toBeCloseTo(1);
  });

  it("panning the image right reveals its left side", () => {
    const frame = { width: 200, height: 200 };
    const rect = cropRectFromTransform(
      { scale: 1, tx: 50, ty: 0 },
      display,
      frame,
    );
    expect(rect.x).toBeCloseTo(0);
  });

  it("round-trips rect → transform → rect", () => {
    const rect = { x: 0.2, y: 0.15, width: 0.4, height: 0.5 };
    const aspect = rectAspect(rect, display);
    const frame = fitAspect(aspect, { width: 280, height: 280 });
    const t = transformFromCropRect(rect, display, frame);
    const back = cropRectFromTransform(t, display, frame);
    expect(back.x).toBeCloseTo(rect.x);
    expect(back.y).toBeCloseTo(rect.y);
    expect(back.width).toBeCloseTo(rect.width);
    expect(back.height).toBeCloseTo(rect.height);
  });

  it("clamps scale so the image always covers the frame", () => {
    const frame = { width: 200, height: 200 };
    expect(minScale(display, frame)).toBe(1);
    expect(clampScale(0.2, display, frame)).toBe(1);
    expect(clampScale(100, display, frame)).toBe(6);
  });

  it("clamps translation so no gap opens inside the frame", () => {
    const frame = { width: 200, height: 200 };
    expect(clampTranslate(500, 500, 1, display, frame)).toEqual({
      tx: 50,
      ty: 0,
    });
    const t = clampTranslate(500, 500, 2, display, frame);
    expect(t).toEqual({ tx: 200, ty: 100 });
    const rect = cropRectFromTransform({ scale: 2, ...t }, display, frame);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(0);
  });
});

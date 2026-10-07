import {
  applySteps,
  cropToPixels,
  flipRect,
  normalizeRect,
  outputSize,
  previewSteps,
  resolveOperations,
  rotateRect,
} from "@/src/projects/camera-social/editor/operations";
import type { NormRect, Op } from "@/src/projects/camera-social/models/Asset";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
const rectClose = (a: NormRect, b: NormRect) => {
  close(a.x, b.x);
  close(a.y, b.y);
  close(a.width, b.width);
  close(a.height, b.height);
};

describe("rect transforms", () => {
  const r = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

  it("rotating four times is the identity", () => {
    let out = r;
    for (let i = 0; i < 4; i++) out = rotateRect(out, 90);
    rectClose(out, r);
  });

  it("cw then ccw is the identity", () => {
    rectClose(rotateRect(rotateRect(r, 90), -90), r);
  });

  it("rotates cw into the expected place", () => {
    rectClose(rotateRect(r, 90), { x: 0.4, y: 0.1, width: 0.4, height: 0.3 });
  });

  it("flips", () => {
    rectClose(flipRect(r, "horizontal"), { ...r, x: 0.6 });
    rectClose(flipRect(r, "vertical"), { ...r, y: 0.4 });
  });

  it("normalizes out-of-range rects", () => {
    expect(normalizeRect({ x: -0.2, y: 0.9, width: 1.4, height: 0.5 })).toEqual(
      { x: 0, y: 0.5, width: 1, height: 0.5 },
    );
  });
});

describe("resolveOperations", () => {
  it("keeps a crop on the same pixels through a rotation", () => {
    const ops: Op[] = [
      {
        type: "crop",
        rect: { x: 0, y: 0, width: 0.5, height: 0.5 },
        aspect: "1:1",
      },
      { type: "rotate", degrees: 90 },
    ];
    const edit = resolveOperations(ops);
    expect(edit.rotation).toBe(90);
    // Top-left quadrant ends up top-right after a clockwise turn.
    rectClose(edit.crop, { x: 0.5, y: 0, width: 0.5, height: 0.5 });
  });

  it("swaps flip axes when rotating", () => {
    const edit = resolveOperations([
      { type: "flip", axis: "horizontal" },
      { type: "rotate", degrees: -90 },
    ]);
    expect(edit.rotation).toBe(270);
    expect(edit.flipH).toBe(false);
    expect(edit.flipV).toBe(true);
  });

  it("last filter / adjust wins", () => {
    const edit = resolveOperations([
      { type: "filter", name: "mono", intensity: 2 },
      { type: "filter", name: "warm", intensity: 0.5 },
    ]);
    expect(edit.filter).toBe("warm");
    expect(edit.intensity).toBe(0.5);
  });
});

describe("pixel crop", () => {
  it("rounds and clamps inside the image", () => {
    expect(
      cropToPixels(
        { x: 0.5, y: 0.5, width: 0.6, height: 0.6 },
        { width: 100, height: 50 },
      ),
    ).toEqual({ originX: 50, originY: 25, width: 50, height: 25 });
  });

  it("output size uses the rotated dimensions", () => {
    const edit = resolveOperations([
      { type: "rotate", degrees: 90 },
      {
        type: "crop",
        rect: { x: 0, y: 0, width: 1, height: 0.5 },
        aspect: "free",
      },
    ]);
    expect(outputSize({ width: 4000, height: 3000 }, edit)).toEqual({
      width: 3000,
      height: 2000,
    });
  });
});

/**
 * The preview transform must send the crop rect's corners (in source pixels)
 * to the canvas corners — that is the "preview matches output" guarantee.
 */
describe("previewSteps", () => {
  const source = { width: 400, height: 300 };

  function stepsFor(ops: Op[]) {
    const edit = resolveOperations(ops);
    const out = outputSize(source, edit);
    const steps = previewSteps(source, edit, out.width);
    return { steps, out };
  }

  it.each<[string, Op[]]>([
    ["identity", []],
    ["rotate cw", [{ type: "rotate", degrees: 90 }]],
    ["rotate ccw", [{ type: "rotate", degrees: -90 }]],
    [
      "rotate 180",
      [
        { type: "rotate", degrees: 90 },
        { type: "rotate", degrees: 90 },
      ],
    ],
    ["flip h", [{ type: "flip", axis: "horizontal" }]],
    [
      "crop + rotate + flip",
      [
        {
          type: "crop",
          rect: { x: 0.25, y: 0.1, width: 0.5, height: 0.6 },
          aspect: "free",
        },
        { type: "rotate", degrees: 90 },
        { type: "flip", axis: "vertical" },
      ],
    ],
  ])("maps the source onto the canvas exactly (%s)", (_, ops) => {
    const { steps, out } = stepsFor(ops);
    const corners = [
      { x: 0, y: 0 },
      { x: source.width, y: 0 },
      { x: 0, y: source.height },
      { x: source.width, y: source.height },
    ].map((p) => applySteps(steps, p));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const edit = resolveOperations(ops);
    // Full source spans the canvas scaled by 1/crop; for an uncropped edit
    // the bounding box is exactly the canvas.
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    close(spanX, out.width / edit.crop.width);
    close(spanY, out.height / edit.crop.height);
    close(Math.min(...xs), (-edit.crop.x * out.width) / edit.crop.width);
    close(Math.min(...ys), (-edit.crop.y * out.height) / edit.crop.height);
  });

  it("a clockwise rotation sends the source top-left to the canvas top-right", () => {
    const edit = resolveOperations([{ type: "rotate", degrees: 90 }]);
    const steps = previewSteps(source, edit, 300);
    const p = applySteps(steps, { x: 0, y: 0 });
    close(p.x, 300);
    close(p.y, 0);
  });

  it("horizontal flip mirrors x", () => {
    const edit = resolveOperations([{ type: "flip", axis: "horizontal" }]);
    const steps = previewSteps(source, edit, 400);
    const p = applySteps(steps, { x: 10, y: 20 });
    close(p.x, 390);
    close(p.y, 20);
  });
});

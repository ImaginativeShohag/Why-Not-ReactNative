import {
  applyOperations,
  type ApplyDeps,
  type ManipulatorContextLike,
} from "@/src/projects/camera-social/editor/applyOperations";
import { IDENTITY } from "@/src/projects/camera-social/editor/colorMatrix";
import type { Op } from "@/src/projects/camera-social/models/Asset";

function makeDeps() {
  const calls: unknown[][] = [];
  const ctx: ManipulatorContextLike = {
    rotate: (d) => (calls.push(["rotate", d]), ctx),
    flip: (a) => (calls.push(["flip", a]), ctx),
    crop: (r) => (calls.push(["crop", r]), ctx),
    renderAsync: async () => {
      calls.push(["render"]);
      return {
        saveAsync: async (o) => {
          calls.push(["save", o]);
          return { uri: "file:///out.jpg", width: 1, height: 1 };
        },
      };
    },
  };
  const deps: ApplyDeps = {
    manipulate: jest.fn((uri: string) => {
      calls.push(["manipulate", uri]);
      return ctx;
    }),
    applyColorMatrix: jest.fn(async (uri: string, m: number[]) => {
      calls.push(["color", uri, m.length]);
      return { uri: "file:///color.jpg", width: 1, height: 1 };
    }),
  };
  return { calls, deps };
}

const source = { uri: "file:///src.jpg", width: 4000, height: 3000 };

describe("applyOperations", () => {
  it("does nothing for an empty op list", async () => {
    const { calls, deps } = makeDeps();
    const out = await applyOperations(source, [], deps);
    expect(out).toEqual(source);
    expect(calls).toEqual([]);
  });

  it("runs rotate → flip → crop in canonical order, then one colour pass", async () => {
    const { calls, deps } = makeDeps();
    const ops: Op[] = [
      {
        type: "crop",
        rect: { x: 0, y: 0, width: 0.5, height: 0.5 },
        aspect: "free",
      },
      { type: "rotate", degrees: 90 },
      { type: "flip", axis: "horizontal" },
      { type: "filter", name: "mono", intensity: 1 },
    ];
    const out = await applyOperations(source, ops, deps);
    expect(calls).toEqual([
      ["manipulate", "file:///src.jpg"],
      ["rotate", 90],
      ["flip", "horizontal"],
      // Rotated image is 3000×4000; the top-left quadrant moved top-right,
      // then the horizontal flip brought it back to the left.
      ["crop", { originX: 0, originY: 0, width: 1500, height: 2000 }],
      ["render"],
      ["save", { format: "jpeg", compress: 0.92 }],
      ["color", "file:///out.jpg", 20],
    ]);
    expect(out.uri).toBe("file:///color.jpg");
  });

  it("undone ops are not applied", async () => {
    const { calls, deps } = makeDeps();
    await applyOperations(source, [{ type: "rotate", degrees: -90 }], deps);
    expect(calls.map((c) => c[0])).toEqual([
      "manipulate",
      "rotate",
      "render",
      "save",
    ]);
    expect(calls[1]).toEqual(["rotate", 270]);
  });

  it("skips the (size-capped) colour pass when the colour is neutral", async () => {
    const { calls, deps } = makeDeps();
    const out = await applyOperations(
      source,
      [
        { type: "rotate", degrees: 90 },
        { type: "filter", name: "none", intensity: 1 },
        {
          type: "adjust",
          values: { brightness: 0, contrast: 0, saturation: 0 },
        },
      ],
      deps,
    );
    expect(calls.map((c) => c[0])).not.toContain("color");
    expect(out.uri).toBe("file:///out.jpg");
  });

  it("skips geometry when only colour changed", async () => {
    const { calls, deps } = makeDeps();
    await applyOperations(
      source,
      [
        {
          type: "adjust",
          values: { brightness: 0.2, contrast: 0, saturation: 0 },
        },
      ],
      deps,
    );
    expect(calls.map((c) => c[0])).toEqual(["color"]);
    expect(IDENTITY).toHaveLength(20);
  });
});

import { pickEditBase } from "@/src/projects/camera-social/editor/editBase";
import type { Capture, Op } from "@/src/projects/camera-social/models/Asset";

const capture = (patch: Partial<Capture>): Capture => ({
  id: "c1",
  kind: "photo",
  origin: "camera",
  uri: "file:///doc/a.jpg",
  thumbUri: "file:///doc/a-thumb.jpg",
  width: 4000,
  height: 3000,
  bytes: 1,
  mime: "image/jpeg",
  durationMs: null,
  exif: null,
  caption: "",
  favorite: false,
  sourceId: null,
  operations: null,
  trimStartMs: null,
  trimEndMs: null,
  createdAt: 0,
  ...patch,
});

const ops: Op[] = [{ type: "rotate", degrees: 90 }];

describe("pickEditBase", () => {
  it("edits an original directly with an empty history", () => {
    const original = capture({});
    expect(pickEditBase(original, null)).toEqual({
      source: original,
      operations: [],
    });
  });

  it("re-edits a derivative from its original with the ops pre-loaded", () => {
    const original = capture({ id: "orig" });
    const edited = capture({
      id: "edit",
      origin: "edit",
      sourceId: "orig",
      operations: ops,
    });
    expect(pickEditBase(edited, original)).toEqual({
      source: original,
      operations: ops,
    });
  });

  it("falls back to the derivative when the original was deleted", () => {
    const edited = capture({ id: "edit", sourceId: "gone", operations: ops });
    expect(pickEditBase(edited, null)).toEqual({
      source: edited,
      operations: [],
    });
  });

  it("ignores an unrelated capture passed as the original", () => {
    const edited = capture({ id: "edit", sourceId: "orig", operations: ops });
    const other = capture({ id: "other" });
    expect(pickEditBase(edited, other).source).toBe(edited);
  });
});

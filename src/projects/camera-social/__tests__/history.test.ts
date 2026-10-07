import {
  appliedOperations,
  canRedo,
  canUndo,
  createEditorState,
  historyReducer,
} from "@/src/projects/camera-social/editor/history";
import type { Op } from "@/src/projects/camera-social/models/Asset";

const crop: Op = {
  type: "crop",
  rect: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
  aspect: "1:1",
};
const rotate: Op = { type: "rotate", degrees: 90 };
const filter: Op = { type: "filter", name: "mono", intensity: 0.7 };

describe("editor history", () => {
  it("pushes, undoes all, and redoes all", () => {
    let s = createEditorState("file:///a.jpg");
    s = historyReducer(s, { type: "push", op: crop });
    s = historyReducer(s, { type: "push", op: rotate });
    s = historyReducer(s, { type: "push", op: filter });
    expect(appliedOperations(s)).toEqual([crop, rotate, filter]);

    s = historyReducer(s, { type: "undo" });
    s = historyReducer(s, { type: "undo" });
    s = historyReducer(s, { type: "undo" });
    expect(appliedOperations(s)).toEqual([]);
    expect(canUndo(s)).toBe(false);
    expect(canRedo(s)).toBe(true);
    // Extra undo is a no-op, not a negative cursor.
    expect(historyReducer(s, { type: "undo" })).toBe(s);

    s = historyReducer(s, { type: "redo" });
    s = historyReducer(s, { type: "redo" });
    s = historyReducer(s, { type: "redo" });
    expect(appliedOperations(s)).toEqual([crop, rotate, filter]);
    expect(canRedo(s)).toBe(false);
    expect(historyReducer(s, { type: "redo" })).toBe(s);
  });

  it("truncates the redo tail on a new push", () => {
    let s = createEditorState("x");
    s = historyReducer(s, { type: "push", op: crop });
    s = historyReducer(s, { type: "push", op: rotate });
    s = historyReducer(s, { type: "undo" });
    s = historyReducer(s, { type: "push", op: filter });
    expect(s.operations).toEqual([crop, filter]);
    expect(canRedo(s)).toBe(false);
  });

  it("collapses consecutive tweaks of the same filter into one step", () => {
    let s = createEditorState("x");
    s = historyReducer(s, { type: "push", op: filter });
    s = historyReducer(s, {
      type: "push",
      op: { type: "filter", name: "mono", intensity: 0.3 },
    });
    expect(s.operations).toHaveLength(1);
    s = historyReducer(s, {
      type: "push",
      op: { type: "filter", name: "warm", intensity: 1 },
    });
    expect(s.operations).toHaveLength(2);
  });

  it("collapses repeated drags of one adjust slider into one step", () => {
    const adjust = (b: number, c = 0): Op => ({
      type: "adjust",
      values: { brightness: b, contrast: c, saturation: 0 },
    });
    let s = createEditorState("x");
    s = historyReducer(s, { type: "push", op: adjust(0.2) });
    s = historyReducer(s, { type: "push", op: adjust(0.4) });
    expect(s.operations).toEqual([adjust(0.4)]);
  });

  it("keeps different adjust sliders as separate undo steps", () => {
    const brightness: Op = {
      type: "adjust",
      values: { brightness: 0.4, contrast: 0, saturation: 0 },
    };
    const contrast: Op = {
      type: "adjust",
      values: { brightness: 0.4, contrast: 0.3, saturation: 0 },
    };
    let s = createEditorState("x");
    s = historyReducer(s, { type: "push", op: brightness });
    s = historyReducer(s, { type: "push", op: contrast });
    expect(s.operations).toEqual([brightness, contrast]);

    // One undo only reverts contrast.
    s = historyReducer(s, { type: "undo" });
    expect(appliedOperations(s)).toEqual([brightness]);

    // A further contrast drag merges with the contrast step, not brightness.
    s = historyReducer(s, { type: "redo" });
    const contrast2: Op = {
      type: "adjust",
      values: { brightness: 0.4, contrast: 0.5, saturation: 0 },
    };
    s = historyReducer(s, { type: "push", op: contrast2 });
    expect(s.operations).toEqual([brightness, contrast2]);
  });

  it("resets with existing operations and cursor at the end", () => {
    const s = historyReducer(createEditorState("a"), {
      type: "reset",
      sourceUri: "b",
      operations: [crop, rotate],
    });
    expect(s).toEqual({
      sourceUri: "b",
      operations: [crop, rotate],
      cursor: 2,
    });
  });
});

import { NEUTRAL_ADJUST } from "@/src/projects/camera-social/editor/operations";
import type {
  Adjustments,
  EditorState,
  Op,
} from "@/src/projects/camera-social/models/Asset";

/**
 * Undo/redo as a list + cursor. Undo moves the cursor back, redo forward, and
 * pushing a new op truncates anything past the cursor — the same model as
 * every text editor. Pure so it can be unit-tested and used with useReducer.
 */

export type HistoryAction =
  | { type: "push"; op: Op }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; sourceUri: string; operations?: Op[] };

export function createEditorState(
  sourceUri: string,
  operations: Op[] = [],
): EditorState {
  return { sourceUri, operations, cursor: operations.length };
}

/** Keys whose value differs between two adjustment sets. */
function changedKeys(a: Adjustments, b: Adjustments) {
  return (Object.keys(a) as (keyof Adjustments)[]).filter((k) => a[k] !== b[k]);
}

/**
 * Collapse consecutive tweaks of the same control into one undo step: the
 * same filter (intensity changes), or the same adjust slider. An adjust op
 * carries the full `values` snapshot, so "same slider" means the new op only
 * changes the one key the previous adjust op changed. Brightness then
 * Contrast stays two steps.
 */
export function mergesWithLast(kept: readonly Op[], op: Op): boolean {
  const last = kept[kept.length - 1];
  if (!last) return false;
  if (last.type === "filter" && op.type === "filter") {
    return last.name === op.name;
  }
  if (last.type !== "adjust" || op.type !== "adjust") return false;
  let before = NEUTRAL_ADJUST;
  for (let i = kept.length - 2; i >= 0; i--) {
    const prev = kept[i];
    if (prev.type === "adjust") {
      before = prev.values;
      break;
    }
  }
  const lastKeys = changedKeys(before, last.values);
  if (lastKeys.length !== 1) return false;
  return changedKeys(last.values, op.values).every((k) => k === lastKeys[0]);
}

export function historyReducer(
  state: EditorState,
  action: HistoryAction,
): EditorState {
  switch (action.type) {
    case "push": {
      const kept = state.operations.slice(0, state.cursor);
      if (mergesWithLast(kept, action.op)) {
        const operations = [...kept.slice(0, -1), action.op];
        return { ...state, operations, cursor: operations.length };
      }
      const operations = [...kept, action.op];
      return { ...state, operations, cursor: operations.length };
    }
    case "undo":
      return state.cursor > 0 ? { ...state, cursor: state.cursor - 1 } : state;
    case "redo":
      return state.cursor < state.operations.length
        ? { ...state, cursor: state.cursor + 1 }
        : state;
    case "reset":
      return createEditorState(action.sourceUri, action.operations);
  }
}

export function appliedOperations(state: EditorState): Op[] {
  return state.operations.slice(0, state.cursor);
}

export const canUndo = (state: EditorState) => state.cursor > 0;
export const canRedo = (state: EditorState) =>
  state.cursor < state.operations.length;

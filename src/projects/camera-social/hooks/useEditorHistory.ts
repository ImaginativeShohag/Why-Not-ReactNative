import { useReducer } from "react";

import {
  appliedOperations,
  canRedo,
  canUndo,
  createEditorState,
  historyReducer,
} from "@/src/projects/camera-social/editor/history";
import { resolveOperations } from "@/src/projects/camera-social/editor/operations";
import type { Op } from "@/src/projects/camera-social/models/Asset";

/** Undo/redo stack of editor operations, plus the resolved edit it implies. */
export function useEditorHistory(sourceUri: string, initial: Op[] = []) {
  const [state, dispatch] = useReducer(historyReducer, undefined, () =>
    createEditorState(sourceUri, initial),
  );

  // The React Compiler memoizes these; no effect depends on their identity.
  const operations = appliedOperations(state);
  const edit = resolveOperations(operations);

  const push = (op: Op) => dispatch({ type: "push", op });
  const undo = () => dispatch({ type: "undo" });
  const redo = () => dispatch({ type: "redo" });
  const reset = (uri: string, ops?: Op[]) =>
    dispatch({ type: "reset", sourceUri: uri, operations: ops });

  return {
    state,
    operations,
    edit,
    push,
    undo,
    redo,
    reset,
    canUndo: canUndo(state),
    canRedo: canRedo(state),
  };
}

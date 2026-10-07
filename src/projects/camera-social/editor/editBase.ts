import type { Capture, Op } from "@/src/projects/camera-social/models/Asset";

export type EditBase = {
  /** The capture whose pixels the editor starts from. */
  source: Capture;
  /** Operations to pre-load into the history (empty for a fresh edit). */
  operations: Op[];
};

/**
 * Non-destructive re-editing. An edited capture remembers its original
 * (`sourceId`) and the op list that produced it, so opening it again starts
 * from the untouched original with those ops on the undo stack — rather than
 * stacking a second lossy JPEG generation on top of the first.
 *
 * If the original has since been deleted, the edited file itself becomes the
 * new starting point.
 */
export function pickEditBase(
  capture: Capture,
  original: Capture | null,
): EditBase {
  if (capture.sourceId && original && original.id === capture.sourceId) {
    return { source: original, operations: capture.operations ?? [] };
  }
  return { source: capture, operations: [] };
}

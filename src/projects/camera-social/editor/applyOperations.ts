import type { Op, Size } from "@/src/projects/camera-social/models/Asset";
import {
  buildColorMatrix,
  isIdentity,
  type ColorMatrix,
} from "@/src/projects/camera-social/editor/colorMatrix";
import {
  cropToPixels,
  hasGeometry,
  isFullRect,
  orientedSize,
  resolveOperations,
} from "@/src/projects/camera-social/editor/operations";

/**
 * The slice of expo-image-manipulator's context API we use. Declared
 * structurally so tests can pass a recording mock and assert the exact call
 * sequence.
 */
export type ManipulatorContextLike = {
  rotate(degrees: number): ManipulatorContextLike;
  flip(axis: "horizontal" | "vertical"): ManipulatorContextLike;
  crop(rect: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  }): ManipulatorContextLike;
  renderAsync(): Promise<{
    saveAsync(options: {
      format: "jpeg";
      compress: number;
    }): Promise<{ uri: string; width: number; height: number }>;
  }>;
};

export type ApplyDeps = {
  manipulate(uri: string): ManipulatorContextLike;
  /** GPU colour pass: bake a matrix into a new JPEG and return it. */
  applyColorMatrix(
    uri: string,
    matrix: ColorMatrix,
  ): Promise<{ uri: string; width: number; height: number }>;
};

export type ApplyResult = { uri: string; width: number; height: number };

export const EXPORT_QUALITY = 0.92;

/**
 * Commit an operation list: geometry through the native manipulator
 * (rotate → flip → crop, matching the preview's canonical order), then colour
 * through a single Skia matrix pass. The original file is never touched.
 * The colour pass is capped at a 4096 px long edge (see nativeDeps.ts), so it
 * only runs when the matrix actually changes colour.
 */
export async function applyOperations(
  source: { uri: string } & Size,
  ops: readonly Op[],
  deps: ApplyDeps,
): Promise<ApplyResult> {
  const edit = resolveOperations(ops);
  let result: ApplyResult = {
    uri: source.uri,
    width: source.width,
    height: source.height,
  };

  if (hasGeometry(edit)) {
    let ctx = deps.manipulate(source.uri);
    if (edit.rotation !== 0) ctx = ctx.rotate(edit.rotation);
    if (edit.flipH) ctx = ctx.flip("horizontal");
    if (edit.flipV) ctx = ctx.flip("vertical");
    if (!isFullRect(edit.crop)) {
      ctx = ctx.crop(
        cropToPixels(edit.crop, orientedSize(source, edit.rotation)),
      );
    }
    const rendered = await ctx.renderAsync();
    result = await rendered.saveAsync({
      format: "jpeg",
      compress: EXPORT_QUALITY,
    });
  }

  const matrix = buildColorMatrix(edit.filter, edit.intensity, edit.adjust);
  if (!isIdentity(matrix)) {
    result = await deps.applyColorMatrix(result.uri, matrix);
  }

  return result;
}

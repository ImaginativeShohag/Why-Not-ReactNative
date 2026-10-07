import { ImageFormat, Skia } from "@shopify/react-native-skia";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import type {
  ApplyDeps,
  ManipulatorContextLike,
} from "@/src/projects/camera-social/editor/applyOperations";
import type { ColorMatrix } from "@/src/projects/camera-social/editor/colorMatrix";
import { scratchFile } from "@/src/projects/camera-social/media/storage";

/**
 * Long-edge cap for the colour pass, and a deliberate trade-off.
 * `MakeOffscreen` allocates a GPU render target, which can't exceed the
 * device's max texture size: 16384 on current iPhones, but as low as 4096 on
 * older and low-end Android GPUs, where a larger surface can't be created. A
 * 48 MP frame is also ~190 MB per RGBA copy, and this pass holds the decoded
 * image, the surface and the snapshot at once. So colour-filtered exports of
 * images above 4096 px are downscaled to it; the returned width/height are
 * the real ones, so the stored row stays truthful. Geometry-only and
 * unedited-colour saves never reach this pass (`isIdentity` in
 * applyOperations), so they keep the full manipulator resolution.
 */
const MAX_SURFACE_EDGE = 4096;

/** Adapt the real manipulator context to the structural type the pure code uses. */
function wrap(
  ctx: ReturnType<typeof ImageManipulator.manipulate>,
): ManipulatorContextLike {
  return {
    rotate: (d) => wrap(ctx.rotate(d)),
    flip: (axis) => wrap(ctx.flip(axis)),
    crop: (rect) => wrap(ctx.crop(rect)),
    async renderAsync() {
      const image = await ctx.renderAsync();
      return {
        async saveAsync(options) {
          const saved = await image.saveAsync({
            format: SaveFormat.JPEG,
            compress: options.compress,
          });
          image.release();
          ctx.release();
          return saved;
        },
      };
    },
  };
}

/**
 * Bake a colour matrix with Skia on the GPU. The only bytes that cross into
 * JS are the *encoded* JPEG on its way to disk — never raw pixels.
 */
async function applyColorMatrix(uri: string, matrix: ColorMatrix) {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error("Could not decode image for the filter pass");

  const srcW = image.width();
  const srcH = image.height();
  const k = Math.min(1, MAX_SURFACE_EDGE / Math.max(srcW, srcH));
  const width = Math.round(srcW * k);
  const height = Math.round(srcH * k);

  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error("Could not allocate an offscreen surface");
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
  surface
    .getCanvas()
    .drawImageRect(
      image,
      Skia.XYWHRect(0, 0, srcW, srcH),
      Skia.XYWHRect(0, 0, width, height),
      paint,
    );
  surface.flush();

  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 92);
  const out = scratchFile("jpg");
  out.create({ overwrite: true });
  out.write(bytes);
  return { uri: out.uri, width, height };
}

export const nativeApplyDeps: ApplyDeps = {
  manipulate: (uri) => wrap(ImageManipulator.manipulate(uri)),
  applyColorMatrix,
};

/**
 * A downscaled working copy for the live preview. Crop is normalized, so the
 * preview can use any resolution and still map 1:1 onto the full-res export.
 */
export async function makePreviewProxy(
  uri: string,
  width: number,
  height: number,
) {
  const maxEdge = 1600;
  if (Math.max(width, height) <= maxEdge) return { uri, width, height };
  const ctx = ImageManipulator.manipulate(uri).resize(
    width >= height ? { width: maxEdge } : { height: maxEdge },
  );
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.85,
  });
  image.release();
  ctx.release();
  return saved;
}

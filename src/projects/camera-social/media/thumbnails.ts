import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";

import { moveIntoMedia } from "@/src/projects/camera-social/media/storage";

/**
 * Thumbnails keep the grid off full-resolution originals — ten 48MP decodes
 * in a list is an OOM. Short edge ~400px, JPEG q0.7.
 */
export const THUMB_SHORT_EDGE = 400;

async function resizeToThumb(uri: string, width: number, height: number) {
  let ctx = ImageManipulator.manipulate(uri);
  if (Math.min(width, height) > THUMB_SHORT_EDGE) {
    ctx = ctx.resize(
      width < height
        ? { width: THUMB_SHORT_EDGE }
        : { height: THUMB_SHORT_EDGE },
    );
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
  });
  ctx.release();
  image.release();
  return saved;
}

/** Returns the thumbnail's path relative to Documents. */
export async function createPhotoThumbnail(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const saved = await resizeToThumb(uri, width, height);
  return moveIntoMedia(saved.uri, "jpg", "thumbs");
}

export async function createVideoThumbnail(
  uri: string,
  timeMs = 0,
): Promise<{ path: string; width: number; height: number }> {
  const frame = await VideoThumbnails.getThumbnailAsync(uri, {
    time: timeMs,
    quality: 0.8,
  });
  const saved = await resizeToThumb(frame.uri, frame.width, frame.height);
  return {
    path: moveIntoMedia(saved.uri, "jpg", "thumbs"),
    // The poster frame is the most reliable source of video dimensions.
    width: frame.width,
    height: frame.height,
  };
}

/** Evenly spaced frames for the trim filmstrip (cache only, not persisted). */
export async function createFilmstrip(
  uri: string,
  durationMs: number,
  count: number,
): Promise<string[]> {
  const times = Array.from({ length: count }, (_, i) =>
    Math.round(((i + 0.5) / count) * durationMs),
  );
  const frames = await Promise.all(
    times.map((time) =>
      VideoThumbnails.getThumbnailAsync(uri, { time, quality: 0.4 })
        .then((f) => f.uri)
        .catch(() => null),
    ),
  );
  return frames.filter((f): f is string => f !== null);
}

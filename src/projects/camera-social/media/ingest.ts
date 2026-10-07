import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  deleteAllCaptureRows,
  deleteCaptureRow,
  getCapturePaths,
  insertCapture,
  type NewCapture,
} from "@/src/projects/camera-social/db/captures";
import type {
  CaptureOrigin,
  Op,
} from "@/src/projects/camera-social/models/Asset";
import {
  summarizeExif,
  withUprightOrientation,
} from "@/src/projects/camera-social/media/exif";
import {
  extensionForMime,
  extensionOf,
  mimeForExtension,
} from "@/src/projects/camera-social/media/paths";
import {
  absoluteUri,
  clearAllMedia,
  copyIntoMedia,
  deleteMedia,
  fileSize,
  moveIntoMedia,
} from "@/src/projects/camera-social/media/storage";
import {
  createPhotoThumbnail,
  createVideoThumbnail,
} from "@/src/projects/camera-social/media/thumbnails";
import { newId } from "@/src/projects/camera-social/utils/id";

/**
 * INGEST stage of the pipeline: temp file → Documents → thumbnail → DB row.
 * Nothing downstream ever sees a cache-dir URI.
 */

export type PhotoInput = {
  uri: string;
  width: number;
  height: number;
  exif?: Record<string, unknown> | null;
  mime?: string;
  origin: CaptureOrigin;
  sourceId?: string | null;
  operations?: Op[] | null;
  /** The file is ours to move (manipulator/Skia output) rather than copy. */
  ownsFile?: boolean;
};

export type VideoInput = {
  uri: string;
  durationMs?: number | null;
  mime?: string;
  origin: CaptureOrigin;
};

/**
 * Bake EXIF orientation into pixels. Strip orientation without rotating and a
 * landscape shot shows sideways after the first manipulation.
 */
async function normalizeOrientation(input: PhotoInput) {
  const { orientation } = summarizeExif(input.exif);
  if (orientation === 1) return null;
  const ctx = ImageManipulator.manipulate(input.uri);
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.95,
  });
  image.release();
  ctx.release();
  return saved;
}

export async function ingestPhoto(
  db: SQLiteDatabase,
  input: PhotoInput,
): Promise<string> {
  const normalized = await normalizeOrientation(input);
  let path: string;
  let width = input.width;
  let height = input.height;
  let mime: string;

  if (normalized) {
    path = moveIntoMedia(normalized.uri, "jpg");
    width = normalized.width;
    height = normalized.height;
    mime = "image/jpeg";
  } else {
    const ext = input.mime
      ? extensionForMime(input.mime, extensionOf(input.uri))
      : extensionOf(input.uri);
    path = input.ownsFile
      ? moveIntoMedia(input.uri, ext)
      : await copyIntoMedia(input.uri, ext);
    mime = input.mime ?? mimeForExtension(ext);
  }

  const abs = absoluteUri(path);
  if (!width || !height) {
    // Shared/imported files may arrive without dimensions — measure once.
    const ctx = ImageManipulator.manipulate(abs);
    const ref = await ctx.renderAsync();
    width = ref.width;
    height = ref.height;
    ref.release();
    ctx.release();
  }
  let thumbPath: string;
  try {
    thumbPath = await createPhotoThumbnail(abs, width, height);
  } catch (e) {
    deleteMedia(path);
    throw e;
  }

  const id = newId();
  const row: NewCapture = {
    id,
    kind: "photo",
    origin: input.origin,
    path,
    thumbPath,
    width,
    height,
    bytes: fileSize(abs),
    mime,
    exif: normalized
      ? withUprightOrientation(input.exif)
      : (input.exif ?? null),
    sourceId: input.sourceId ?? null,
    operations: input.operations ?? null,
    createdAt: Date.now(),
  };
  await insertCapture(db, row);
  return id;
}

export async function ingestVideo(
  db: SQLiteDatabase,
  input: VideoInput,
): Promise<string> {
  const ext = input.mime
    ? extensionForMime(input.mime, extensionOf(input.uri, "mov"))
    : extensionOf(input.uri, "mov");
  const path = await copyIntoMedia(input.uri, ext);
  const abs = absoluteUri(path);

  let thumb: Awaited<ReturnType<typeof createVideoThumbnail>>;
  try {
    thumb = await createVideoThumbnail(abs, 0);
  } catch (e) {
    deleteMedia(path);
    throw e;
  }

  const id = newId();
  await insertCapture(db, {
    id,
    kind: "video",
    origin: input.origin,
    path,
    thumbPath: thumb.path,
    width: thumb.width,
    height: thumb.height,
    bytes: fileSize(abs),
    mime: input.mime ?? mimeForExtension(ext),
    durationMs: input.durationMs ?? null,
    createdAt: Date.now(),
  });
  return id;
}

/** Delete a capture's row and both files. */
export async function removeCapture(db: SQLiteDatabase, id: string) {
  const paths = await getCapturePaths(db, id);
  await deleteCaptureRow(db, id);
  deleteMedia(paths?.path);
  deleteMedia(paths?.thumb_path);
}

export async function removeAllCaptures(db: SQLiteDatabase) {
  await deleteAllCaptureRows(db);
  clearAllMedia();
}

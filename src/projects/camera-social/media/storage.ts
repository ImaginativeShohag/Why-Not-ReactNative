import { Directory, File, Paths } from "expo-file-system";

import {
  resolveRelativePath,
  toRelativePath,
} from "@/src/projects/camera-social/media/paths";
import { newId } from "@/src/projects/camera-social/utils/id";

/**
 * App-owned media directory. Captures land in the cache dir first (camera,
 * manipulator, share extension); the OS may evict that at any time, so ingest
 * always *copies* into Documents and the DB only ever points there.
 */

const ROOT = "camera-social";
export type MediaFolder = "originals" | "thumbs";

function folder(name: MediaFolder): Directory {
  const dir = new Directory(Paths.document, ROOT, name);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function documentBaseUri(): string {
  return Paths.document.uri;
}

export function absoluteUri(relative: string): string {
  return resolveRelativePath(relative, documentBaseUri());
}

function relativeUri(absolute: string): string {
  return toRelativePath(absolute, documentBaseUri());
}

/** Copy a (possibly cache/temporary) file into our folder; returns the relative path. */
export async function copyIntoMedia(
  sourceUri: string,
  ext: string,
  into: MediaFolder = "originals",
): Promise<string> {
  const dest = new File(folder(into), `${newId()}.${ext}`);
  await new File(sourceUri).copy(dest);
  return relativeUri(dest.uri);
}

/** Move instead of copy when we own the temp file (manipulator outputs). */
export function moveIntoMedia(
  sourceUri: string,
  ext: string,
  into: MediaFolder = "originals",
): string {
  const src = new File(sourceUri);
  const dest = new File(folder(into), `${newId()}.${ext}`);
  src.moveSync(dest);
  return relativeUri(dest.uri);
}

export function fileSize(uri: string): number {
  try {
    const f = new File(uri);
    return f.exists ? f.size : 0;
  } catch {
    return 0;
  }
}

export function deleteMedia(relative: string | null | undefined) {
  if (!relative) return;
  try {
    const f = new File(absoluteUri(relative));
    if (f.exists) f.delete();
  } catch {
    // Already gone — nothing to reclaim.
  }
}

/** A fresh file in the cache dir for intermediate renders. */
export function scratchFile(ext: string): File {
  return new File(Paths.cache, `camera-social-${newId()}.${ext}`);
}

export function storageUsage(): { originals: number; thumbs: number } {
  const size = (name: MediaFolder) => {
    try {
      return folder(name).size ?? 0;
    } catch {
      return 0;
    }
  };
  return { originals: size("originals"), thumbs: size("thumbs") };
}

export function clearAllMedia() {
  const dir = new Directory(Paths.document, ROOT);
  if (dir.exists) dir.delete();
}

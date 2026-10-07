import { Directory, File, Paths } from "expo-file-system";

import {
  DOWNLOAD_ROOT,
  resolveRelativePath,
  safeSegment,
} from "@/src/projects/podcast-player/downloads/paths";

/**
 * Runtime storage helpers on top of the new expo-file-system File/Directory
 * API. Every function takes a RELATIVE path and resolves it against the
 * current Paths.document at call time.
 */

export {
  DOWNLOAD_ROOT,
  relativePathFor,
  resolveRelativePath,
  toRelativePath,
} from "@/src/projects/podcast-player/downloads/paths";

export function documentDirUri(): string {
  return Paths.document.uri;
}

export function resolveUri(relativePath: string): string {
  return resolveRelativePath(relativePath, documentDirUri());
}

export function fileFor(relativePath: string): File {
  return new File(resolveUri(relativePath));
}

export function ensureShowDirectory(podcastId: string): void {
  const dir = new Directory(
    Paths.document,
    DOWNLOAD_ROOT,
    safeSegment(podcastId),
  );
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
}

export function fileExists(relativePath: string): boolean {
  try {
    return fileFor(relativePath).exists;
  } catch {
    return false;
  }
}

export function fileSize(relativePath: string): number {
  try {
    const f = fileFor(relativePath);
    return f.exists ? (f.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

export function deleteFile(relativePath: string): void {
  try {
    const f = fileFor(relativePath);
    if (f.exists) f.delete();
  } catch {
    // Already gone is fine.
  }
}

/** Local URI if the download is complete and on disk, else null. */
export function localUriIfPresent(
  relativePath: string | null | undefined,
): string | null {
  if (!relativePath) return null;
  return fileExists(relativePath) ? resolveUri(relativePath) : null;
}

export function deviceFreeBytes(): number {
  try {
    return Paths.availableDiskSpace;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

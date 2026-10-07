/**
 * Pure path logic for downloads — no expo imports so it's unit-testable.
 *
 * THE RULE: the DB stores paths relative to the documents directory, e.g.
 * "podcasts/itunes-123/ep_abc.mp3". The absolute container path on iOS
 * (/var/mobile/Containers/Data/Application/<UUID>/Documents/…) changes on
 * reinstall and some updates, so it is resolved at read time, never stored.
 */

export const DOWNLOAD_ROOT = "podcasts";

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "opus",
  "wav",
  "flac",
  "mp4",
]);

export function safeSegment(input: string): string {
  const cleaned = input
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 80) || "x";
}

export function extensionFromUrl(url: string): string {
  const path = url.split(/[?#]/)[0];
  const m = path.match(/\.([A-Za-z0-9]{2,5})$/);
  const ext = m?.[1]?.toLowerCase();
  return ext && AUDIO_EXTENSIONS.has(ext) ? ext : "mp3";
}

/** documents/podcasts/<showId>/<episodeId>.<ext> — as a RELATIVE path. */
export function relativePathFor(
  podcastId: string,
  episodeId: string,
  audioUrl: string,
): string {
  return `${DOWNLOAD_ROOT}/${safeSegment(podcastId)}/${safeSegment(episodeId)}.${extensionFromUrl(audioUrl)}`;
}

export function isRelativePath(path: string): boolean {
  return (
    !!path &&
    !/^[a-z][a-z0-9+.-]*:/i.test(path) && // no scheme (file://, content://)
    !path.startsWith("/") &&
    !path.split("/").includes("..")
  );
}

/** Joins the CURRENT documents directory URI with a stored relative path. */
export function resolveRelativePath(
  relativePath: string,
  documentDirUri: string,
): string {
  if (!isRelativePath(relativePath)) {
    throw new Error(
      `Refusing to resolve non-relative download path: ${relativePath}`,
    );
  }
  const base = documentDirUri.endsWith("/")
    ? documentDirUri
    : `${documentDirUri}/`;
  return base + relativePath.replace(/^\/+/, "");
}

/**
 * Converts an absolute URI back to a relative path. Works even when the
 * absolute path came from a PREVIOUS container (different UUID): we anchor
 * on our own "podcasts/" root rather than on the documents prefix.
 */
export function toRelativePath(
  absoluteUri: string,
  documentDirUri: string,
): string | null {
  const normalize = (u: string) => decodeURI(u.replace(/^file:\/\//, ""));
  const abs = normalize(absoluteUri);
  const doc = normalize(documentDirUri).replace(/\/?$/, "/");
  if (abs.startsWith(doc)) {
    const rel = abs.slice(doc.length);
    return isRelativePath(rel) ? rel : null;
  }
  const marker = `/${DOWNLOAD_ROOT}/`;
  const idx = abs.lastIndexOf(marker);
  if (idx >= 0) {
    const rel = abs.slice(idx + 1);
    return isRelativePath(rel) ? rel : null;
  }
  return null;
}

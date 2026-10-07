/**
 * Pure path helpers. The DB stores paths *relative* to the app's document
 * directory because the absolute container path (…/Application/<UUID>/…)
 * changes across installs, restores and some updates on iOS. Resolve at read
 * time, never persist the absolute form.
 */

const ensureTrailingSlash = (uri: string) =>
  uri.endsWith("/") ? uri : `${uri}/`;

/** "file:///…/Documents/camera-social/a.jpg" → "camera-social/a.jpg". */
export function toRelativePath(absoluteUri: string, baseUri: string): string {
  const base = ensureTrailingSlash(baseUri);
  if (absoluteUri.startsWith(base)) return absoluteUri.slice(base.length);
  // `file:/` vs `file:///` spellings differ between native APIs; compare paths.
  const strip = (u: string) => u.replace(/^file:\/*/, "/");
  const basePath = ensureTrailingSlash(strip(base));
  const path = strip(absoluteUri);
  if (path.startsWith(basePath)) return path.slice(basePath.length);
  throw new Error(`Path ${absoluteUri} is not inside ${baseUri}`);
}

/** Inverse of toRelativePath. Absolute URIs pass through untouched. */
export function resolveRelativePath(relative: string, baseUri: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(relative)) return relative;
  return ensureTrailingSlash(baseUri) + relative.replace(/^\/+/, "");
}

/** Lower-case extension without the dot, or `fallback`. */
export function extensionOf(uri: string, fallback = "jpg"): string {
  const clean = uri.split(/[?#]/)[0];
  const name = clean.slice(clean.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return fallback;
  return name.slice(dot + 1).toLowerCase();
}

export function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "heic":
    case "heif":
      return "image/heic";
    case "webp":
      return "image/webp";
    case "mov":
      return "video/quicktime";
    case "mp4":
    case "m4v":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

export function extensionForMime(mime: string, fallback = "jpg"): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/heic": "heic",
    "image/heif": "heic",
    "image/webp": "webp",
    "video/quicktime": "mov",
    "video/mp4": "mp4",
  };
  return map[mime.toLowerCase()] ?? fallback;
}

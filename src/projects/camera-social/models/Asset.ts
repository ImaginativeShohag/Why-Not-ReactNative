/**
 * Domain types for Camera & Social. Everything here is plain data so it can
 * cross the SQLite boundary, route params, and unit tests unchanged.
 */

export type CaptureKind = "photo" | "video";

/** Where a capture entered the app — useful for the profile stats. */
export type CaptureOrigin = "camera" | "library" | "share" | "edit";

/**
 * A row in the local `captures` table, with file paths already resolved to
 * absolute URIs. The DB itself stores *relative* paths (see media/paths.ts):
 * the iOS container path changes between installs and app updates.
 */
export type Capture = {
  id: string;
  kind: CaptureKind;
  origin: CaptureOrigin;
  uri: string;
  thumbUri: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  durationMs: number | null;
  exif: Record<string, unknown> | null;
  caption: string;
  favorite: boolean;
  sourceId: string | null;
  operations: Op[] | null;
  trimStartMs: number | null;
  trimEndMs: number | null;
  createdAt: number;
};

/** A rectangle in 0..1 space relative to the image it describes. */
export type NormRect = { x: number; y: number; width: number; height: number };

export type Size = { width: number; height: number };

/** `9:16` and `5:4` only arise from rotating a `16:9` / `4:5` crop. */
export type AspectPreset = "free" | "1:1" | "4:5" | "5:4" | "16:9" | "9:16";

export type FilterName = "none" | "mono" | "warm" | "cool" | "fade" | "vivid";

export type Adjustments = {
  /** -1..1, 0 = unchanged */
  brightness: number;
  /** -1..1, 0 = unchanged */
  contrast: number;
  /** -1..1, 0 = unchanged */
  saturation: number;
};

/**
 * Editor operations. The editor never mutates pixels while you work — it
 * appends one of these, and both the live preview and the final export are
 * derived from the same list (see editor/operations.ts).
 *
 * `crop.rect` is expressed in the space of the image *as displayed at that
 * point* (i.e. after preceding rotations/flips), which is what the crop
 * overlay shows the user.
 */
export type Op =
  | { type: "crop"; rect: NormRect; aspect: AspectPreset }
  | { type: "rotate"; degrees: 90 | -90 }
  | { type: "flip"; axis: "horizontal" | "vertical" }
  | { type: "filter"; name: FilterName; intensity: number }
  | { type: "adjust"; values: Adjustments };

export type EditorState = {
  sourceUri: string;
  operations: Op[];
  /** Number of operations currently applied; ops past the cursor are redo-able. */
  cursor: number;
};

/**
 * The canonical form an operation list reduces to. Output is defined as
 * `crop(flip(rotate(source)))` — every consumer (Skia preview, manipulator
 * export) applies it in that order.
 */
export type ResolvedEdit = {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  crop: NormRect;
  aspect: AspectPreset;
  filter: FilterName;
  intensity: number;
  adjust: Adjustments;
};

/** A device media-library asset as the library grid needs it. */
export type LibraryAsset = {
  id: string;
  uri: string;
  mediaType: "photo" | "video";
  width: number;
  height: number;
  durationSec: number | null;
  creationTime: number | null;
  filename: string;
};

export type LibraryAlbum = { id: string; title: string };

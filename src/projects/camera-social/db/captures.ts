import type { SQLiteDatabase } from "expo-sqlite";

import type {
  Capture,
  CaptureKind,
  CaptureOrigin,
  Op,
} from "@/src/projects/camera-social/models/Asset";
import { absoluteUri } from "@/src/projects/camera-social/media/storage";

type CaptureRow = {
  id: string;
  kind: CaptureKind;
  origin: CaptureOrigin;
  path: string;
  thumb_path: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  duration_ms: number | null;
  exif: string | null;
  caption: string;
  favorite: number;
  source_id: string | null;
  operations: string | null;
  trim_start_ms: number | null;
  trim_end_ms: number | null;
  created_at: number;
};

export type NewCapture = {
  id: string;
  kind: CaptureKind;
  origin: CaptureOrigin;
  /** Relative paths — see media/paths.ts. */
  path: string;
  thumbPath: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  durationMs?: number | null;
  exif?: Record<string, unknown> | null;
  caption?: string;
  sourceId?: string | null;
  operations?: Op[] | null;
  createdAt: number;
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

function rowToCapture(
  row: CaptureRow,
  resolve: (relative: string) => string = absoluteUri,
): Capture {
  return {
    ...rowToPage(row, resolve),
    sourceId: row.source_id,
    operations: parseJson(row.operations),
  };
}

/** Feed grid: only what a cell renders — no JSON columns, no full-size path. */
export type CaptureGridItem = Pick<
  Capture,
  | "id"
  | "kind"
  | "origin"
  | "thumbUri"
  | "width"
  | "height"
  | "durationMs"
  | "caption"
  | "favorite"
>;

type GridRow = Pick<
  CaptureRow,
  | "id"
  | "kind"
  | "origin"
  | "thumb_path"
  | "width"
  | "height"
  | "duration_ms"
  | "caption"
  | "favorite"
>;

export async function listCaptureGrid(
  db: SQLiteDatabase,
): Promise<CaptureGridItem[]> {
  const rows = await db.getAllAsync<GridRow>(
    `SELECT id, kind, origin, thumb_path, width, height, duration_ms, caption, favorite
     FROM captures ORDER BY created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    origin: row.origin,
    thumbUri: absoluteUri(row.thumb_path),
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms,
    caption: row.caption,
    favorite: row.favorite === 1,
  }));
}

/**
 * Post pager: everything the viewer and its info panel read. Edit lineage
 * (`source_id`, `operations`) is only needed by the editor — see getCapture.
 */
export type CapturePage = Omit<Capture, "sourceId" | "operations">;

type PageRow = Omit<CaptureRow, "source_id" | "operations">;

function rowToPage(
  row: PageRow,
  resolve: (relative: string) => string = absoluteUri,
): CapturePage {
  return {
    id: row.id,
    kind: row.kind,
    origin: row.origin,
    uri: resolve(row.path),
    thumbUri: resolve(row.thumb_path),
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    mime: row.mime,
    durationMs: row.duration_ms,
    exif: parseJson(row.exif),
    caption: row.caption,
    favorite: row.favorite === 1,
    trimStartMs: row.trim_start_ms,
    trimEndMs: row.trim_end_ms,
    createdAt: row.created_at,
  };
}

export async function listCapturePages(
  db: SQLiteDatabase,
): Promise<CapturePage[]> {
  const rows = await db.getAllAsync<PageRow>(
    `SELECT id, kind, origin, path, thumb_path, width, height, bytes, mime,
            duration_ms, exif, caption, favorite, trim_start_ms, trim_end_ms,
            created_at
     FROM captures ORDER BY created_at DESC`,
  );
  return rows.map((r) => rowToPage(r));
}

export async function getCapture(
  db: SQLiteDatabase,
  id: string,
): Promise<Capture | null> {
  const row = await db.getFirstAsync<CaptureRow>(
    "SELECT * FROM captures WHERE id = ?",
    id,
  );
  return row ? rowToCapture(row) : null;
}

/** Raw relative paths, for deletes. */
export async function getCapturePaths(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<{ path: string; thumb_path: string }>(
    "SELECT path, thumb_path FROM captures WHERE id = ?",
    id,
  );
}

export async function insertCapture(db: SQLiteDatabase, c: NewCapture) {
  await db.runAsync(
    `INSERT INTO captures
      (id, kind, origin, path, thumb_path, width, height, bytes, mime,
       duration_ms, exif, caption, source_id, operations, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.id,
    c.kind,
    c.origin,
    c.path,
    c.thumbPath,
    c.width,
    c.height,
    c.bytes,
    c.mime,
    c.durationMs ?? null,
    c.exif ? JSON.stringify(c.exif) : null,
    c.caption ?? "",
    c.sourceId ?? null,
    c.operations ? JSON.stringify(c.operations) : null,
    c.createdAt,
  );
}

export async function setCaption(
  db: SQLiteDatabase,
  id: string,
  caption: string,
) {
  await db.runAsync(
    "UPDATE captures SET caption = ? WHERE id = ?",
    caption,
    id,
  );
}

export async function setFavorite(
  db: SQLiteDatabase,
  id: string,
  favorite: boolean,
) {
  await db.runAsync(
    "UPDATE captures SET favorite = ? WHERE id = ?",
    favorite ? 1 : 0,
    id,
  );
}

export async function setTrim(
  db: SQLiteDatabase,
  id: string,
  startMs: number | null,
  endMs: number | null,
) {
  await db.runAsync(
    "UPDATE captures SET trim_start_ms = ?, trim_end_ms = ? WHERE id = ?",
    startMs,
    endMs,
    id,
  );
}

export async function deleteCaptureRow(db: SQLiteDatabase, id: string) {
  await db.runAsync("DELETE FROM captures WHERE id = ?", id);
}

export async function deleteAllCaptureRows(db: SQLiteDatabase) {
  await db.runAsync("DELETE FROM captures");
}

export type CaptureStats = {
  photos: number;
  videos: number;
  edits: number;
  favorites: number;
  bytes: number;
};

export async function captureStats(db: SQLiteDatabase): Promise<CaptureStats> {
  const row = await db.getFirstAsync<CaptureStats>(
    `SELECT
       COALESCE(SUM(kind = 'photo'), 0) AS photos,
       COALESCE(SUM(kind = 'video'), 0) AS videos,
       COALESCE(SUM(origin = 'edit'), 0) AS edits,
       COALESCE(SUM(favorite), 0)       AS favorites,
       COALESCE(SUM(bytes), 0)          AS bytes
     FROM captures`,
  );
  return row ?? { photos: 0, videos: 0, edits: 0, favorites: 0, bytes: 0 };
}

export async function getSetting(
  db: SQLiteDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string,
) {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

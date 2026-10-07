import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Attachment rows. The blobs live on disk (see utils/attachments.ts); these
 * rows hold only paths RELATIVE to the document directory — the absolute
 * container path changes across iOS app updates and reinstalls.
 */

export type AttachmentRow = {
  id: string;
  entry_id: string;
  file_uri: string;
  thumb_uri: string | null;
  blurhash: string | null;
  mime: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

export type NewAttachment = Omit<AttachmentRow, "entry_id"> & {
  entryId: string;
};

export async function insertAttachment(db: SQLiteDatabase, a: NewAttachment) {
  await db.runAsync(
    `INSERT INTO attachments
       (id, entry_id, file_uri, thumb_uri, blurhash, mime, width, height, bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    a.id,
    a.entryId,
    a.file_uri,
    a.thumb_uri,
    a.blurhash,
    a.mime,
    a.width,
    a.height,
    a.bytes,
    Date.now(),
  );
}

export async function listAttachmentRows(db: SQLiteDatabase, entryId: string) {
  return db.getAllAsync<AttachmentRow>(
    "SELECT * FROM attachments WHERE entry_id = ? ORDER BY created_at, id",
    entryId,
  );
}

/** Deletes the row and returns the paths it pointed at, for the caller to unlink. */
export async function deleteAttachmentRow(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<AttachmentRow>(
    "SELECT * FROM attachments WHERE id = ?",
    id,
  );
  if (!row) return [];
  await db.runAsync("DELETE FROM attachments WHERE id = ?", id);
  return [row.file_uri, row.thumb_uri].filter((uri): uri is string => !!uri);
}

/** Every path the database still references — the sweeper keeps exactly these. */
export async function referencedPaths(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{
    file_uri: string;
    thumb_uri: string | null;
  }>("SELECT file_uri, thumb_uri FROM attachments");
  const paths = new Set<string>();
  for (const row of rows) {
    paths.add(row.file_uri);
    if (row.thumb_uri) paths.add(row.thumb_uri);
  }
  return paths;
}

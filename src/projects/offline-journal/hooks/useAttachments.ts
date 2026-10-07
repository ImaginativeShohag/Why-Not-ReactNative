import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { useCallback } from "react";

import { listAttachmentRows } from "../db/queries/attachments";
import type { Attachment } from "../models/Entry";
import {
  attachImage,
  removeAttachment,
  resolveAttachmentUri,
  type AttachSource,
} from "../utils/attachments";
import { useLiveQuery } from "./useLiveQuery";

const TABLES = ["attachments"] as const;
const NONE: Attachment[] = [];

export function useAttachments(entryId: string | undefined) {
  const select = useCallback(
    async (db: SQLiteDatabase): Promise<Attachment[]> => {
      if (!entryId) return NONE;
      const rows = await listAttachmentRows(db, entryId);
      return rows.map((row) => ({
        id: row.id,
        entryId: row.entry_id,
        uri: resolveAttachmentUri(row.file_uri),
        thumbUri: row.thumb_uri ? resolveAttachmentUri(row.thumb_uri) : null,
        blurhash: row.blurhash,
        mime: row.mime,
        width: row.width,
        height: row.height,
      }));
    },
    [entryId],
  );
  return useLiveQuery(TABLES, select, NONE);
}

export function useAttachmentActions() {
  const db = useSQLiteContext();
  const attach = useCallback(
    (entryId: string, source: AttachSource) => attachImage(db, entryId, source),
    [db],
  );
  const remove = useCallback((id: string) => removeAttachment(db, id), [db]);
  return { attach, remove };
}

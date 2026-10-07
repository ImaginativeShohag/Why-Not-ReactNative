import { useShareIntentContext, type ShareIntentFile } from "expo-share-intent";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";

import {
  ingestPhoto,
  ingestVideo,
} from "@/src/projects/camera-social/media/ingest";

export type InboundFile = {
  key: string;
  uri: string;
  kind: "photo" | "video";
  mimeType: string;
  fileName: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  size: number | null;
};

function toInbound(file: ShareIntentFile, index: number): InboundFile | null {
  const kind = file.mimeType.startsWith("video/")
    ? "video"
    : file.mimeType.startsWith("image/")
      ? "photo"
      : null;
  if (!kind) return null;
  const uri = /^[a-z]+:\/\//i.test(file.path)
    ? file.path
    : `file://${file.path}`;
  return {
    key: `${index}-${file.fileName}`,
    uri,
    kind,
    mimeType: file.mimeType,
    fileName: file.fileName,
    width: file.width,
    height: file.height,
    durationMs: file.duration,
    size: file.size,
  };
}

/**
 * Content shared *into* the app (iOS share extension / Android SEND intent,
 * both provided by expo-share-intent). The extension hands us files in a
 * shared container that may be cleaned up, so importing copies them into
 * our own media directory like any other ingest.
 */
export function useInboundShare() {
  const db = useSQLiteContext();
  const { hasShareIntent, shareIntent, resetShareIntent, error, isReady } =
    useShareIntentContext();
  const [importing, setImporting] = useState(false);

  const files = useMemo(
    () =>
      (shareIntent.files ?? [])
        .map(toInbound)
        .filter((f): f is InboundFile => f !== null),
    [shareIntent.files],
  );

  const importFile = useCallback(
    async (file: InboundFile): Promise<string> => {
      if (file.kind === "video") {
        return ingestVideo(db, {
          uri: file.uri,
          durationMs: file.durationMs,
          mime: file.mimeType,
          origin: "share",
        });
      }
      return ingestPhoto(db, {
        uri: file.uri,
        width: file.width ?? 0,
        height: file.height ?? 0,
        mime: file.mimeType,
        origin: "share",
      });
    },
    [db],
  );

  /** Import everything; returns the new capture ids in share order. */
  const importAll = useCallback(async () => {
    setImporting(true);
    try {
      const ids: string[] = [];
      for (const f of files) ids.push(await importFile(f));
      return ids;
    } finally {
      setImporting(false);
    }
  }, [files, importFile]);

  return {
    isReady,
    hasShareIntent,
    files,
    text: shareIntent.text ?? shareIntent.webUrl ?? null,
    error,
    importing,
    importFile,
    importAll,
    reset: resetShareIntent,
  };
}

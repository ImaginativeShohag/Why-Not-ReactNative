import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";
import type { LiveDownload } from "@/src/projects/podcast-player/stores/downloadStore";

export type DownloadView = {
  state: DownloadState;
  /** 0..1 */
  progress: number;
  bytesWritten: number;
  totalBytes: number;
};

/**
 * Merges the persisted state (from a query row) with live progress, so every
 * list shows the same badge without re-querying on each progress tick.
 * Screens call this and pass the result to dumb rows.
 */
export function mergeDownload(
  live: LiveDownload | undefined,
  fallback: { state: DownloadState; bytes: number | null },
): DownloadView {
  const state = live?.state ?? fallback.state;
  const bytesWritten = live?.bytesWritten ?? fallback.bytes ?? 0;
  const totalBytes = live?.totalBytes ?? 0;
  const progress =
    state === "done"
      ? 1
      : totalBytes > 0
        ? Math.min(1, bytesWritten / totalBytes)
        : 0;
  return { state, progress, bytesWritten, totalBytes };
}

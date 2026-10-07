import { create } from "zustand";

import type { NetworkDecision } from "@/src/projects/podcast-player/downloads/policy";
import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";

/**
 * Live transfer progress for the UI. Progress events arrive many times a
 * second; writing each to SQLite would be wasteful, so the DB gets
 * checkpoints and this store gets every tick.
 */
export type LiveDownload = {
  state: DownloadState;
  bytesWritten: number;
  totalBytes: number;
};

type DownloadStoreState = {
  live: Record<string, LiveDownload>;
  /** Why queued downloads aren't starting, if the network rule blocks them. */
  network: NetworkDecision;
};

export const useDownloadStore = create<DownloadStoreState>()(() => ({
  live: {},
  network: "ok",
}));

export function setLiveDownload(
  episodeId: string,
  patch: Partial<LiveDownload>,
): void {
  useDownloadStore.setState((s) => {
    const prev = s.live[episodeId] ?? {
      state: "idle",
      bytesWritten: 0,
      totalBytes: 0,
    };
    return { live: { ...s.live, [episodeId]: { ...prev, ...patch } } };
  });
}

export function clearLiveDownloads(episodeIds: string[]): void {
  if (episodeIds.length === 0) return;
  useDownloadStore.setState((s) => {
    const live = { ...s.live };
    for (const id of episodeIds) delete live[id];
    return { live };
  });
}

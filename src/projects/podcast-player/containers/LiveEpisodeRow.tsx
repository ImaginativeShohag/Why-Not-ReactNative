import type { ComponentProps } from "react";

import { EpisodeRow } from "@/src/projects/podcast-player/components/episode/EpisodeRow";
import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";
import { useDownloadStore } from "@/src/projects/podcast-player/stores/downloadStore";
import { mergeDownload } from "@/src/projects/podcast-player/utils/downloadView";

type Props = Omit<
  ComponentProps<typeof EpisodeRow>,
  "downloadState" | "downloadProgress" | "onDownload"
> & {
  episodeId: string;
  /** Persisted download state from the query row. */
  fallback: { state: DownloadState; bytes: number | null };
  onDownload: (state: DownloadState) => void;
};

/**
 * Connected wrapper around the dumb EpisodeRow: it adds the row's own
 * live-progress subscription, so a progress tick re-renders only the row
 * that's downloading, not the whole list. It reads a store, so it lives in
 * containers/; EpisodeRow in components/ still takes plain props only.
 */
export function LiveEpisodeRow({
  episodeId,
  fallback,
  onDownload,
  ...rest
}: Props) {
  const live = useDownloadStore((s) => s.live[episodeId]);
  const dl = mergeDownload(live, fallback);
  return (
    <EpisodeRow
      {...rest}
      downloadState={dl.state}
      downloadProgress={dl.progress}
      onDownload={() => onDownload(dl.state)}
    />
  );
}

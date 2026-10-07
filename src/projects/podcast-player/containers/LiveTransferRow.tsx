import type { ComponentProps } from "react";

import { TransferRow } from "@/src/projects/podcast-player/components/episode/TransferRow";
import type { DownloadState } from "@/src/projects/podcast-player/models/Episode";
import { useDownloadStore } from "@/src/projects/podcast-player/stores/downloadStore";
import { mergeDownload } from "@/src/projects/podcast-player/utils/downloadView";

type Props = Omit<
  ComponentProps<typeof TransferRow>,
  "view" | "onBadgePress"
> & {
  episodeId: string;
  /** Persisted download state from the query row. */
  fallback: { state: DownloadState; bytes: number | null };
  onBadgePress: (state: DownloadState) => void;
};

/**
 * Connected wrapper around the dumb TransferRow (like LiveEpisodeRow): its own
 * live-progress subscription means a progress tick re-renders only the row
 * that's downloading. TransferRow in components/ takes plain props only.
 */
export function LiveTransferRow({
  episodeId,
  fallback,
  onBadgePress,
  ...rest
}: Props) {
  const live = useDownloadStore((s) => s.live[episodeId]);
  const view = mergeDownload(live, fallback);
  return (
    <TransferRow
      {...rest}
      view={view}
      onBadgePress={() => onBadgePress(view.state)}
    />
  );
}

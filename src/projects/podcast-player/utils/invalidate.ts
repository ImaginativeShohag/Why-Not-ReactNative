import { podcastKeys } from "@/src/projects/podcast-player/utils/queryKeys";
import { queryClient } from "@/src/shared/providers/QueryProvider";

/**
 * The singletons (playback, downloads) live outside React but change data
 * that queries display. They poke the shared QueryClient through here, always
 * scoped to this project's "podcast" prefix.
 */

/** A download started, finished, failed or was deleted. */
export function invalidateDownloads(): void {
  void queryClient.invalidateQueries({ queryKey: podcastKeys.downloads() });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.storage() });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.shows() });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.episodes() });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.newEpisodes() });
}

/** Playback position or played state changed. */
export function invalidateProgress(): void {
  void queryClient.invalidateQueries({
    queryKey: podcastKeys.continueListening(),
  });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.newEpisodes() });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.shows() });
  void queryClient.invalidateQueries({ queryKey: podcastKeys.episodes() });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getEpisode,
  getEpisodes,
  getPodcast,
  listContinueListening,
  listDownloads,
  listEpisodesForPodcast,
  listNewEpisodes,
  listSubscriptions,
  setAutoDownload,
  setSubscribed,
} from "@/src/projects/podcast-player/db/queries";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import {
  searchPodcasts,
  topPodcasts,
} from "@/src/projects/podcast-player/feeds/index-api";
import {
  ensureChapters,
  refreshSubscriptions,
  syncFeed,
} from "@/src/projects/podcast-player/feeds/sync";
import type {
  QueueItem,
  SearchResult,
} from "@/src/projects/podcast-player/models/Episode";
import { getSettings } from "@/src/projects/podcast-player/stores/settingsStore";
import { podcastKeys } from "@/src/projects/podcast-player/utils/queryKeys";

/**
 * React Query hooks. SQLite is the source of truth for everything we've
 * stored; queries just cache reads of it and get invalidated by the
 * singletons (see utils/invalidate.ts).
 */

export function usePodcastSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: podcastKeys.search(trimmed),
    queryFn: () => searchPodcasts(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useTopPodcasts(genreId: number | null) {
  return useQuery({
    queryKey: podcastKeys.top(genreId),
    queryFn: () => topPodcasts(genreId),
    staleTime: 60 * 60_000,
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: podcastKeys.subscriptions(),
    queryFn: listSubscriptions,
  });
}

export function useNewEpisodes() {
  return useQuery({
    queryKey: podcastKeys.newEpisodes(),
    queryFn: () => listNewEpisodes(30),
  });
}

export function useContinueListening() {
  return useQuery({
    queryKey: podcastKeys.continueListening(),
    queryFn: () => listContinueListening(10),
  });
}

/**
 * A show: loaded from SQLite, and (re)synced from its feed when first opened
 * or stale. `feedUrl`/`artworkUrl` come from a search result when previewing
 * a show we have never stored.
 */
export function usePodcast(
  id: string,
  preview?: { feedUrl?: string; artworkUrl?: string | null },
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: podcastKeys.show(id),
    queryFn: async () => {
      let podcast = await getPodcast(id);
      const stale =
        !podcast?.lastRefreshedAt ||
        Date.now() - podcast.lastRefreshedAt > 30 * 60_000;
      const feedUrl = podcast?.feedUrl ?? preview?.feedUrl;
      if (feedUrl && (stale || !podcast)) {
        try {
          const res = await syncFeed(feedUrl, {
            id,
            artworkUrl: preview?.artworkUrl,
          });
          podcast = await getPodcast(res.podcastId);
          void queryClient.invalidateQueries({
            queryKey: podcastKeys.showEpisodes(id),
          });
        } catch (e) {
          // Offline: show what we have; only fail if we have nothing.
          if (!podcast) throw e;
        }
      }
      if (!podcast) throw new Error("Podcast not found");
      return podcast;
    },
  });
}

export function usePodcastEpisodes(id: string, enabled = true) {
  return useQuery({
    queryKey: podcastKeys.showEpisodes(id),
    queryFn: () => listEpisodesForPodcast(id),
    enabled,
  });
}

export function useEpisode(id: string) {
  return useQuery({
    queryKey: podcastKeys.episode(id),
    enabled: !!id,
    queryFn: async () => {
      const episode = await getEpisode(id);
      if (!episode) throw new Error("Episode not found");
      if (episode.chapters.length === 0 && episode.chaptersUrl) {
        return { ...episode, chapters: await ensureChapters(episode) };
      }
      return episode;
    },
  });
}

export function useQueueEpisodes(queue: QueueItem[]) {
  const ids = queue.map((q) => q.episodeId);
  return useQuery({
    queryKey: podcastKeys.queue(ids),
    queryFn: () => getEpisodes(ids),
    placeholderData: (prev) => prev,
  });
}

export function useDownloads() {
  return useQuery({
    queryKey: podcastKeys.downloads(),
    queryFn: async () => {
      const records = await listDownloads();
      const episodes = await getEpisodes(records.map((r) => r.episodeId));
      const byId = new Map(episodes.map((e) => [e.id, e]));
      return records
        .map((r) => ({ record: r, episode: byId.get(r.episodeId) }))
        .filter(
          (
            x,
          ): x is {
            record: typeof x.record;
            episode: NonNullable<typeof x.episode>;
          } => !!x.episode,
        );
    },
  });
}

export function useStorageUsage() {
  return useQuery({
    queryKey: podcastKeys.storage(),
    queryFn: () => downloadManager.storageUsage(),
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      subscribe: boolean;
      feedUrl?: string;
      result?: SearchResult;
    }) => {
      const existing = await getPodcast(input.id);
      if (!existing && input.feedUrl) {
        await syncFeed(input.feedUrl, {
          id: input.id,
          artworkUrl: input.result?.artworkUrl,
          subscribe: input.subscribe,
        });
      } else {
        await setSubscribed(input.id, input.subscribe);
      }
      if (input.subscribe && getSettings().autoDownloadNewForNewSubscriptions) {
        await setAutoDownload(input.id, true);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: podcastKeys.all });
    },
  });
}

export function useRefreshSubscriptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshSubscriptions(),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: podcastKeys.all }),
  });
}

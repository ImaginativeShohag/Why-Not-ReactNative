import {
  fetchChaptersJson,
  fetchFeedXml,
} from "@/src/projects/podcast-player/api/index.api";
import {
  getAutoDownload,
  getFeedValidators,
  getPodcastByFeed,
  listSubscriptions,
  markRefreshed,
  setChapters,
  setSubscribed,
  upsertEpisodes,
  upsertPodcast,
} from "@/src/projects/podcast-player/db/queries";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import {
  episodeIdFor,
  parseChaptersJson,
  parseFeed,
  podcastIdForFeed,
} from "@/src/projects/podcast-player/feeds/parse";
import type {
  Chapter,
  Episode,
} from "@/src/projects/podcast-player/models/Episode";

/**
 * Incremental refresh. Two layers keep it cheap:
 *  1. HTTP: conditional GET (ETag / Last-Modified) → most refreshes are a 304.
 *  2. DB: upsert keyed on (podcast_id, guid) with a content hash, so unchanged
 *     episodes cost nothing and nothing is ever re-inserted.
 */

export type SyncResult = {
  podcastId: string;
  inserted: string[];
  notModified: boolean;
};

/** Max episodes auto-downloaded per show per refresh — the "unbounded storage" guard. */
const AUTO_DOWNLOAD_PER_SHOW = 2;

export async function syncFeed(
  feedUrl: string,
  options: {
    id?: string;
    artworkUrl?: string | null;
    subscribe?: boolean;
    force?: boolean;
  } = {},
): Promise<SyncResult> {
  const existing = await getPodcastByFeed(feedUrl);
  // Reuse the stored id if the feed is already known under a different one.
  const podcastId = existing?.id ?? options.id ?? podcastIdForFeed(feedUrl);

  const validators =
    existing && !options.force ? await getFeedValidators(podcastId) : undefined;
  const res = await fetchFeedXml(feedUrl, validators);

  if (res.notModified) {
    if (options.subscribe !== undefined) {
      await setSubscribed(podcastId, options.subscribe);
    }
    await markRefreshed(podcastId, null);
    return { podcastId, inserted: [], notModified: true };
  }

  const parsed = parseFeed(res.xml, feedUrl);
  await upsertPodcast({
    id: podcastId,
    ...parsed.podcast,
    artworkUrl:
      parsed.podcast.artworkUrl ??
      options.artworkUrl ??
      existing?.artworkUrl ??
      null,
    subscribed: options.subscribe,
  });
  const { inserted } = await upsertEpisodes(
    podcastId,
    parsed.episodes.map((e) => ({ ...e, id: episodeIdFor(podcastId, e.guid) })),
  );
  await markRefreshed(podcastId, {
    etag: res.etag,
    lastModified: res.lastModified,
  });

  // A first-time load inserts the whole back catalogue; that's not "new".
  const isFirstLoad = !existing;
  if (
    !isFirstLoad &&
    inserted.length > 0 &&
    (await getAutoDownload(podcastId))
  ) {
    for (const id of inserted.slice(0, AUTO_DOWNLOAD_PER_SHOW)) {
      downloadManager.enqueue(id).catch(() => {});
    }
  }
  return {
    podcastId,
    inserted: isFirstLoad ? [] : inserted,
    notModified: false,
  };
}

/** Refresh every subscription with a small concurrency limit. */
export async function refreshSubscriptions(
  concurrency = 3,
): Promise<SyncResult[]> {
  const subs = await listSubscriptions();
  const results: SyncResult[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < subs.length) {
      const sub = subs[cursor++];
      try {
        results.push(await syncFeed(sub.feedUrl, { id: sub.id }));
      } catch {
        // One broken feed must not stop the others.
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, subs.length) }, worker),
  );
  return results;
}

/**
 * Lazily resolves podcast:chapters JSON and caches it on the episode row.
 * Takes the already-loaded episode so callers don't re-query it.
 */
export async function ensureChapters(
  episode: Pick<Episode, "id" | "chapters" | "chaptersUrl">,
): Promise<Chapter[]> {
  if (episode.chapters.length > 0 || !episode.chaptersUrl)
    return episode.chapters;
  try {
    const chapters = parseChaptersJson(
      await fetchChaptersJson(episode.chaptersUrl),
    );
    if (chapters.length > 0) await setChapters(episode.id, chapters);
    return chapters;
  } catch {
    return [];
  }
}

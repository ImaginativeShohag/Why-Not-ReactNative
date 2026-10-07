import axiosInstance from "@/src/shared/api/axios";
import { env } from "@/src/shared/constants/env";

/**
 * Raw HTTP calls, on podcast-owned instances derived from the shared
 * (project-agnostic) defaults:
 *
 * - `itunesApi` — the iTunes search / lookup / top-chart endpoints.
 * - `feedApi`   — no base URL; feeds and chapter files are absolute URLs.
 */
const itunesApi = axiosInstance.create({ baseURL: env.podcastIndexUrl });
const feedApi = axiosInstance.create();

export type ItunesPodcastDto = {
  collectionId: number;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  feedUrl?: string;
  primaryGenreName?: string;
  trackCount?: number;
};

type ItunesSearchResponse = {
  resultCount: number;
  results: ItunesPodcastDto[];
};

type ItunesTopResponse = {
  feed?: { entry?: { id?: { attributes?: { "im:id"?: string } } }[] | object };
};

export async function fetchPodcastSearch(
  term: string,
): Promise<ItunesPodcastDto[]> {
  const { data } = await itunesApi.get<ItunesSearchResponse>("/search", {
    params: { term, media: "podcast", entity: "podcast", limit: 30 },
  });
  return data.results ?? [];
}

export async function fetchPodcastLookup(
  ids: string[],
): Promise<ItunesPodcastDto[]> {
  if (ids.length === 0) return [];
  const { data } = await itunesApi.get<ItunesSearchResponse>("/lookup", {
    params: { id: ids.join(","), entity: "podcast" },
  });
  return data.results ?? [];
}

/** Top-chart ids for a genre (legacy iTunes RSS). Needs a lookup for feed URLs. */
export async function fetchTopPodcastIds(
  genreId: number | null,
): Promise<string[]> {
  const genre = genreId ? `/genre=${genreId}` : "";
  const { data } = await itunesApi.get<ItunesTopResponse>(
    `/us/rss/toppodcasts/limit=25${genre}/json`,
  );
  const entries = data.feed?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  return list
    .map(
      (e) =>
        (e as { id?: { attributes?: { "im:id"?: string } } }).id?.attributes?.[
          "im:id"
        ],
    )
    .filter((id): id is string => !!id);
}

export type FeedResponse =
  | { notModified: true }
  | {
      notModified: false;
      xml: string;
      etag: string | null;
      lastModified: string | null;
    };

/** Conditional GET so an unchanged feed costs a 304, not a multi-MB download. */
export async function fetchFeedXml(
  feedUrl: string,
  validators?: { etag?: string | null; lastModified?: string | null },
): Promise<FeedResponse> {
  const headers: Record<string, string> = {
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  };
  if (validators?.etag) headers["If-None-Match"] = validators.etag;
  if (validators?.lastModified)
    headers["If-Modified-Since"] = validators.lastModified;

  const res = await feedApi.get<string>(feedUrl, {
    headers,
    timeout: 20000,
    responseType: "text",
    // Keep the raw XML; axios would otherwise try JSON.parse on it.
    transformResponse: (d) => d,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });
  if (res.status === 304) return { notModified: true };
  const header = (name: string) => {
    const v = res.headers?.[name];
    return typeof v === "string" ? v : null;
  };
  return {
    notModified: false,
    xml: typeof res.data === "string" ? res.data : String(res.data ?? ""),
    etag: header("etag"),
    lastModified: header("last-modified"),
  };
}

export async function fetchChaptersJson(url: string): Promise<unknown> {
  const { data } = await feedApi.get<unknown>(url, {
    timeout: 15000,
  });
  return data;
}

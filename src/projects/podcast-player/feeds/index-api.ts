import {
  fetchPodcastLookup,
  fetchPodcastSearch,
  fetchTopPodcastIds,
  type ItunesPodcastDto,
} from "@/src/projects/podcast-player/api/index.api";
import type { SearchResult } from "@/src/projects/podcast-player/models/Episode";

/**
 * Podcast index client: maps the iTunes Search API into our SearchResult model.
 * Swapping to Podcast Index later means changing only this file + index.api.ts.
 */

export const GENRES: { id: number | null; name: string }[] = [
  { id: null, name: "Top" },
  { id: 1318, name: "Technology" },
  { id: 1489, name: "News" },
  { id: 1303, name: "Comedy" },
  { id: 1321, name: "Business" },
  { id: 1304, name: "Education" },
  { id: 1533, name: "Science" },
  { id: 1488, name: "True Crime" },
  { id: 1545, name: "Sports" },
  { id: 1512, name: "Health" },
];

export function mapItunesPodcast(dto: ItunesPodcastDto): SearchResult | null {
  // Entries without a feed URL (Apple-exclusive shows) are unplayable for us.
  if (!dto.feedUrl) return null;
  return {
    id: `itunes-${dto.collectionId}`,
    title: dto.collectionName ?? dto.trackName ?? "Untitled",
    author: dto.artistName ?? "",
    artworkUrl: dto.artworkUrl600 ?? dto.artworkUrl100 ?? null,
    feedUrl: dto.feedUrl,
    genre: dto.primaryGenreName ?? null,
    episodeCount: dto.trackCount ?? null,
  };
}

export async function searchPodcasts(term: string): Promise<SearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];
  const results = await fetchPodcastSearch(trimmed);
  return results
    .map(mapItunesPodcast)
    .filter((r): r is SearchResult => r !== null);
}

export async function topPodcasts(
  genreId: number | null,
): Promise<SearchResult[]> {
  const ids = await fetchTopPodcastIds(genreId);
  const results = await fetchPodcastLookup(ids.slice(0, 25));
  // Lookup does not preserve order; restore chart order.
  const rank = new Map(ids.map((id, i) => [id, i]));
  return results
    .map(mapItunesPodcast)
    .filter((r): r is SearchResult => r !== null)
    .sort(
      (a, b) =>
        (rank.get(a.id.replace("itunes-", "")) ?? 99) -
        (rank.get(b.id.replace("itunes-", "")) ?? 99),
    );
}

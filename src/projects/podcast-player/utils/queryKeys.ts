/**
 * This project's React Query keys. Everything lives under "podcast" so a
 * blanket invalidate never touches another project's cache (one QueryClient
 * is shared app-wide).
 */
export const podcastKeys = {
  all: ["podcast"] as const,
  search: (term: string) => ["podcast", "search", term] as const,
  top: (genreId: number | null) => ["podcast", "top", genreId] as const,
  subscriptions: () => ["podcast", "subscriptions"] as const,
  shows: () => ["podcast", "show"] as const,
  show: (id: string) => ["podcast", "show", id] as const,
  showEpisodes: (id: string) => ["podcast", "show", id, "episodes"] as const,
  showAutoDownload: (id: string) =>
    ["podcast", "show", id, "auto-download"] as const,
  episodes: () => ["podcast", "episode"] as const,
  episode: (id: string) => ["podcast", "episode", id] as const,
  newEpisodes: () => ["podcast", "new-episodes"] as const,
  continueListening: () => ["podcast", "continue"] as const,
  downloads: () => ["podcast", "downloads"] as const,
  queue: (ids: string[]) => ["podcast", "queue", ids] as const,
  storage: () => ["podcast", "storage"] as const,
};

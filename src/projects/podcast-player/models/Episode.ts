/**
 * Domain types for the podcast slice. Everything here is plain data so it can
 * cross the service/store/UI boundaries and be persisted without mapping.
 */

export type Chapter = {
  /** Seconds from the start of the episode. */
  start: number;
  title: string;
  url?: string;
};

export type Podcast = {
  /** Stable id: the index's collection id when known, else a hash of the feed URL. */
  id: string;
  feedUrl: string;
  title: string;
  author: string;
  description: string;
  artworkUrl: string | null;
  link: string | null;
  categories: string[];
  subscribed: boolean;
  lastRefreshedAt: number | null;
};

export type Episode = {
  /** Namespaced as `<podcastId>:<guid>` so two feeds reusing a guid never collide. */
  id: string;
  podcastId: string;
  guid: string;
  title: string;
  /** Show notes as sanitized plain text; links are extracted separately. */
  notes: string;
  /** Raw HTML kept for the WebView renderer (sanitized at render time). */
  notesHtml: string;
  audioUrl: string;
  mimeType: string | null;
  /** Bytes as declared by the enclosure; frequently 0 or wrong in real feeds. */
  enclosureLength: number | null;
  /** Seconds, or null when the feed does not declare it (common). */
  duration: number | null;
  publishedAt: number | null;
  artworkUrl: string | null;
  season: number | null;
  episodeNumber: number | null;
  chapters: Chapter[];
  /** URL of a podcast:chapters JSON document, fetched lazily. */
  chaptersUrl: string | null;
};

/** Columns too heavy for list queries; only the detail query loads them. */
type EpisodeHeavyField = "notes" | "notesHtml" | "chapters";

/** Episode joined with its show and the listener's state, for list rows. */
export type EpisodeListItem = Omit<Episode, EpisodeHeavyField> & {
  podcastTitle: string;
  podcastArtworkUrl: string | null;
  position: number;
  played: boolean;
  downloadState: DownloadState;
  downloadedBytes: number | null;
};

/** A list item plus show notes and chapters (episode screen, playback). */
export type EpisodeDetail = EpisodeListItem & Pick<Episode, EpisodeHeavyField>;

export type Progress = {
  episodeId: string;
  /** Seconds. */
  position: number;
  duration: number | null;
  played: boolean;
  updatedAt: number;
};

export type QueueItem = {
  episodeId: string;
  /** When it was enqueued; used only for display/debugging. */
  addedAt: number;
};

export type DownloadState =
  "idle" | "queued" | "downloading" | "paused" | "done" | "failed";

export type DownloadRecord = {
  episodeId: string;
  podcastId: string;
  url: string;
  state: DownloadState;
  /** Relative to the documents directory — never an absolute container path. */
  relativePath: string;
  bytesWritten: number;
  totalBytes: number;
  attempts: number;
  /** Epoch ms; the manager will not retry before this. */
  nextAttemptAt: number;
  /** JSON of the DownloadPauseState snapshot (with a relative fileUri). */
  snapshot: string | null;
  priority: number;
  createdAt: number;
  completedAt: number | null;
  error: string | null;
};

export type SearchResult = {
  id: string;
  title: string;
  author: string;
  artworkUrl: string | null;
  feedUrl: string;
  genre: string | null;
  episodeCount: number | null;
};

export type SleepTimerOption =
  | { kind: "off" }
  | { kind: "minutes"; minutes: number }
  | { kind: "endOfEpisode" };

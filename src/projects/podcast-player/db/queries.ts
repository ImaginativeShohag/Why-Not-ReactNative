import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "@/src/projects/podcast-player/db/client";
import type {
  Chapter,
  DownloadRecord,
  DownloadState,
  Episode,
  EpisodeDetail,
  EpisodeListItem,
  Podcast,
  Progress,
  QueueItem,
} from "@/src/projects/podcast-player/models/Episode";
import { hashString } from "@/src/projects/podcast-player/utils/format";

// ---------------------------------------------------------------- row types

type PodcastRow = {
  id: string;
  feed_url: string;
  title: string;
  author: string;
  description: string;
  artwork_url: string | null;
  link: string | null;
  categories: string;
  subscribed: number;
  auto_download: number;
  last_refreshed_at: number | null;
  etag: string | null;
  last_modified: string | null;
};

type EpisodeListRow = {
  id: string;
  podcast_id: string;
  guid: string;
  title: string;
  audio_url: string;
  mime_type: string | null;
  enclosure_length: number | null;
  duration: number | null;
  published_at: number | null;
  artwork_url: string | null;
  season: number | null;
  episode_number: number | null;
  chapters_url: string | null;
  podcast_title: string;
  podcast_artwork_url: string | null;
  position: number;
  played: number;
  download_state: DownloadState;
  downloaded_bytes: number | null;
};

type EpisodeDetailRow = EpisodeListRow & {
  notes: string;
  notes_html: string;
  chapters: string;
};

type DownloadRow = {
  episode_id: string;
  podcast_id: string;
  url: string;
  state: DownloadState;
  relative_path: string;
  bytes_written: number;
  total_bytes: number;
  attempts: number;
  next_attempt_at: number;
  snapshot: string | null;
  priority: number;
  created_at: number;
  completed_at: number | null;
  error: string | null;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toPodcast(row: PodcastRow): Podcast {
  return {
    id: row.id,
    feedUrl: row.feed_url,
    title: row.title,
    author: row.author,
    description: row.description,
    artworkUrl: row.artwork_url,
    link: row.link,
    categories: parseJson<string[]>(row.categories, []),
    subscribed: row.subscribed === 1,
    lastRefreshedAt: row.last_refreshed_at,
  };
}

function toListItem(row: EpisodeListRow): EpisodeListItem {
  return {
    id: row.id,
    podcastId: row.podcast_id,
    guid: row.guid,
    title: row.title,
    audioUrl: row.audio_url,
    mimeType: row.mime_type,
    enclosureLength: row.enclosure_length,
    duration: row.duration,
    publishedAt: row.published_at,
    artworkUrl: row.artwork_url,
    season: row.season,
    episodeNumber: row.episode_number,
    chaptersUrl: row.chapters_url,
    podcastTitle: row.podcast_title,
    podcastArtworkUrl: row.podcast_artwork_url,
    position: row.position ?? 0,
    played: row.played === 1,
    downloadState: row.download_state ?? "idle",
    downloadedBytes: row.downloaded_bytes,
  };
}

function toDetail(row: EpisodeDetailRow): EpisodeDetail {
  return {
    ...toListItem(row),
    notes: row.notes,
    notesHtml: row.notes_html,
    chapters: parseJson<Chapter[]>(row.chapters, []),
  };
}

function toDownload(row: DownloadRow): DownloadRecord {
  return {
    episodeId: row.episode_id,
    podcastId: row.podcast_id,
    url: row.url,
    state: row.state,
    relativePath: row.relative_path,
    bytesWritten: row.bytes_written,
    totalBytes: row.total_bytes,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    snapshot: row.snapshot,
    priority: row.priority,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    error: row.error,
  };
}

// List queries skip the heavy columns (notes, notes_html, chapters JSON);
// only DETAIL_SELECT loads them.
const LIST_COLUMNS = `
         e.id, e.podcast_id, e.guid, e.title, e.audio_url, e.mime_type,
         e.enclosure_length, e.duration, e.published_at, e.artwork_url,
         e.season, e.episode_number, e.chapters_url,
         p.title        AS podcast_title,
         p.artwork_url  AS podcast_artwork_url,
         COALESCE(pr.position, 0)  AS position,
         COALESCE(pr.played, 0)    AS played,
         COALESCE(d.state, 'idle') AS download_state,
         CASE WHEN d.state = 'done' THEN d.total_bytes ELSE d.bytes_written END AS downloaded_bytes`;

const LIST_JOINS = `
    FROM episodes e
    JOIN podcasts p       ON p.id = e.podcast_id
    LEFT JOIN progress pr ON pr.episode_id = e.id
    LEFT JOIN downloads d ON d.episode_id = e.id
`;

const LIST_SELECT = `SELECT ${LIST_COLUMNS} ${LIST_JOINS}`;
const DETAIL_SELECT = `SELECT ${LIST_COLUMNS}, e.notes, e.notes_html, e.chapters ${LIST_JOINS}`;

// ---------------------------------------------------------------- podcasts

export type PodcastUpsert = Omit<Podcast, "subscribed" | "lastRefreshedAt"> & {
  subscribed?: boolean;
};

export async function upsertPodcast(p: PodcastUpsert): Promise<void> {
  const db = await getDb();
  // Subscription state is only overwritten when explicitly provided, so a
  // background refresh can never silently unsubscribe someone.
  await db.runAsync(
    `INSERT INTO podcasts (id, feed_url, title, author, description, artwork_url, link, categories, subscribed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       feed_url = excluded.feed_url,
       title = excluded.title,
       author = excluded.author,
       description = excluded.description,
       artwork_url = COALESCE(excluded.artwork_url, podcasts.artwork_url),
       link = excluded.link,
       categories = excluded.categories,
       subscribed = CASE WHEN ? IS NULL THEN podcasts.subscribed ELSE excluded.subscribed END`,
    p.id,
    p.feedUrl,
    p.title,
    p.author,
    p.description,
    p.artworkUrl,
    p.link,
    JSON.stringify(p.categories),
    p.subscribed ? 1 : 0,
    Date.now(),
    p.subscribed === undefined ? null : 1,
  );
}

export async function getPodcast(id: string): Promise<Podcast | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PodcastRow>(
    "SELECT * FROM podcasts WHERE id = ?",
    id,
  );
  return row ? toPodcast(row) : null;
}

export async function getPodcastByFeed(
  feedUrl: string,
): Promise<Podcast | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PodcastRow>(
    "SELECT * FROM podcasts WHERE feed_url = ?",
    feedUrl,
  );
  return row ? toPodcast(row) : null;
}

export async function getFeedValidators(
  id: string,
): Promise<{ etag: string | null; lastModified: string | null }> {
  const db = await getDb();
  const row = await db.getFirstAsync<
    Pick<PodcastRow, "etag" | "last_modified">
  >("SELECT etag, last_modified FROM podcasts WHERE id = ?", id);
  return { etag: row?.etag ?? null, lastModified: row?.last_modified ?? null };
}

export async function markRefreshed(
  id: string,
  validators: { etag: string | null; lastModified: string | null } | null,
): Promise<void> {
  const db = await getDb();
  if (validators) {
    await db.runAsync(
      "UPDATE podcasts SET last_refreshed_at = ?, etag = ?, last_modified = ? WHERE id = ?",
      Date.now(),
      validators.etag,
      validators.lastModified,
      id,
    );
  } else {
    await db.runAsync(
      "UPDATE podcasts SET last_refreshed_at = ? WHERE id = ?",
      Date.now(),
      id,
    );
  }
}

export async function setSubscribed(
  id: string,
  subscribed: boolean,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE podcasts SET subscribed = ? WHERE id = ?",
    subscribed ? 1 : 0,
    id,
  );
}

export async function setAutoDownload(
  id: string,
  enabled: boolean,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE podcasts SET auto_download = ? WHERE id = ?",
    enabled ? 1 : 0,
    id,
  );
}

export async function getAutoDownload(id: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ auto_download: number }>(
    "SELECT auto_download FROM podcasts WHERE id = ?",
    id,
  );
  return row?.auto_download === 1;
}

export async function listSubscriptions(): Promise<Podcast[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PodcastRow>(
    "SELECT * FROM podcasts WHERE subscribed = 1 ORDER BY title COLLATE NOCASE",
  );
  return rows.map(toPodcast);
}

// ---------------------------------------------------------------- episodes

type EpisodeInput = Omit<Episode, "id" | "podcastId"> & { id: string };

function contentHash(e: EpisodeInput): string {
  return hashString(
    [
      e.title,
      e.audioUrl,
      e.duration ?? "",
      e.publishedAt ?? "",
      e.notesHtml.length,
      e.chaptersUrl ?? "",
      e.chapters.length,
      e.artworkUrl ?? "",
    ].join("|"),
  ).toString(36);
}

/**
 * Incremental upsert: new guids are inserted, changed episodes are updated,
 * and unchanged ones are skipped entirely (the WHERE on the conflict clause).
 * Returns the ids that were genuinely new — the auto-download trigger.
 */
export async function upsertEpisodes(
  podcastId: string,
  episodes: EpisodeInput[],
): Promise<{ inserted: string[]; total: number }> {
  const db = await getDb();
  const existing = new Set(
    (
      await db.getAllAsync<{ id: string }>(
        "SELECT id FROM episodes WHERE podcast_id = ?",
        podcastId,
      )
    ).map((r) => r.id),
  );
  const inserted: string[] = [];
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `INSERT INTO episodes (id, podcast_id, guid, title, notes, notes_html, audio_url, mime_type,
         enclosure_length, duration, published_at, artwork_url, season, episode_number, chapters,
         chapters_url, content_hash, first_seen_at)
       VALUES ($id, $podcastId, $guid, $title, $notes, $notesHtml, $audioUrl, $mimeType,
         $length, $duration, $publishedAt, $artworkUrl, $season, $episodeNumber, $chapters,
         $chaptersUrl, $hash, $now)
       ON CONFLICT(podcast_id, guid) DO UPDATE SET
         title = excluded.title,
         notes = excluded.notes,
         notes_html = excluded.notes_html,
         audio_url = excluded.audio_url,
         mime_type = excluded.mime_type,
         enclosure_length = excluded.enclosure_length,
         duration = COALESCE(excluded.duration, episodes.duration),
         published_at = excluded.published_at,
         artwork_url = excluded.artwork_url,
         season = excluded.season,
         episode_number = excluded.episode_number,
         chapters = CASE WHEN excluded.chapters = '[]' THEN episodes.chapters ELSE excluded.chapters END,
         chapters_url = excluded.chapters_url,
         content_hash = excluded.content_hash
       WHERE episodes.content_hash != excluded.content_hash`,
    );
    try {
      for (const e of episodes) {
        if (!existing.has(e.id)) inserted.push(e.id);
        await stmt.executeAsync({
          $id: e.id,
          $podcastId: podcastId,
          $guid: e.guid,
          $title: e.title,
          $notes: e.notes,
          $notesHtml: e.notesHtml,
          $audioUrl: e.audioUrl,
          $mimeType: e.mimeType,
          $length: e.enclosureLength,
          $duration: e.duration,
          $publishedAt: e.publishedAt,
          $artworkUrl: e.artworkUrl,
          $season: e.season,
          $episodeNumber: e.episodeNumber,
          $chapters: JSON.stringify(e.chapters),
          $chaptersUrl: e.chaptersUrl,
          $hash: contentHash(e),
          $now: now,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
  return { inserted, total: episodes.length };
}

export async function listEpisodesForPodcast(
  podcastId: string,
): Promise<EpisodeListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EpisodeListRow>(
    `${LIST_SELECT} WHERE e.podcast_id = ? ORDER BY e.published_at DESC LIMIT 500`,
    podcastId,
  );
  return rows.map(toListItem);
}

export async function getEpisode(id: string): Promise<EpisodeDetail | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EpisodeDetailRow>(
    `${DETAIL_SELECT} WHERE e.id = ?`,
    id,
  );
  return row ? toDetail(row) : null;
}

export async function getEpisodes(ids: string[]): Promise<EpisodeListItem[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = await db.getAllAsync<EpisodeListRow>(
    `${LIST_SELECT} WHERE e.id IN (${placeholders})`,
    ...ids,
  );
  const byId = new Map(rows.map((r) => [r.id, toListItem(r)]));
  return ids.map((id) => byId.get(id)).filter((e): e is EpisodeListItem => !!e);
}

export async function listNewEpisodes(limit = 30): Promise<EpisodeListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EpisodeListRow>(
    `${LIST_SELECT} WHERE p.subscribed = 1 AND COALESCE(pr.played, 0) = 0
     ORDER BY e.published_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(toListItem);
}

export async function listContinueListening(
  limit = 10,
): Promise<EpisodeListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EpisodeListRow>(
    `${LIST_SELECT} WHERE pr.position > 30 AND pr.played = 0
     ORDER BY pr.updated_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(toListItem);
}

export async function setChapters(
  episodeId: string,
  chapters: Chapter[],
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE episodes SET chapters = ? WHERE id = ?",
    JSON.stringify(chapters),
    episodeId,
  );
}

export async function setEpisodeDuration(
  episodeId: string,
  duration: number,
): Promise<void> {
  const db = await getDb();
  // Feeds often omit it; learn it from the player once and keep it.
  await db.runAsync(
    "UPDATE episodes SET duration = ? WHERE id = ? AND (duration IS NULL OR duration = 0)",
    Math.round(duration),
    episodeId,
  );
}

// ---------------------------------------------------------------- progress

export async function saveProgress(
  p: Omit<Progress, "updatedAt">,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO progress (episode_id, position, duration, played, played_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(episode_id) DO UPDATE SET
       position = excluded.position,
       duration = COALESCE(excluded.duration, progress.duration),
       played = excluded.played,
       played_at = CASE WHEN excluded.played = 1 THEN COALESCE(progress.played_at, excluded.played_at) ELSE NULL END,
       updated_at = excluded.updated_at`,
    p.episodeId,
    p.position,
    p.duration,
    p.played ? 1 : 0,
    p.played ? Date.now() : null,
    Date.now(),
  );
}

export async function getProgress(episodeId: string): Promise<Progress | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    episode_id: string;
    position: number;
    duration: number | null;
    played: number;
    updated_at: number;
  }>("SELECT * FROM progress WHERE episode_id = ?", episodeId);
  if (!row) return null;
  return {
    episodeId: row.episode_id,
    position: row.position,
    duration: row.duration,
    played: row.played === 1,
    updatedAt: row.updated_at,
  };
}

export async function setPlayed(
  episodeId: string,
  played: boolean,
): Promise<void> {
  const existing = await getProgress(episodeId);
  await saveProgress({
    episodeId,
    position: played ? (existing?.duration ?? existing?.position ?? 0) : 0,
    duration: existing?.duration ?? null,
    played,
  });
}

/** Played-at timestamps for eviction/auto-delete decisions. */
export async function listPlayedAt(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    episode_id: string;
    played_at: number | null;
  }>("SELECT episode_id, played_at FROM progress WHERE played = 1");
  return new Map(rows.map((r) => [r.episode_id, r.played_at ?? 0]));
}

// ---------------------------------------------------------------- queue

export async function loadQueue(): Promise<QueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ episode_id: string; added_at: number }>(
    "SELECT episode_id, added_at FROM queue ORDER BY sort",
  );
  return rows.map((r) => ({ episodeId: r.episode_id, addedAt: r.added_at }));
}

export async function saveQueue(items: QueueItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM queue");
    for (let i = 0; i < items.length; i++) {
      await db.runAsync(
        "INSERT INTO queue (episode_id, sort, added_at) VALUES (?, ?, ?)",
        items[i].episodeId,
        i,
        items[i].addedAt,
      );
    }
  });
}

// ---------------------------------------------------------------- downloads

export async function getDownload(
  episodeId: string,
): Promise<DownloadRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DownloadRow>(
    "SELECT * FROM downloads WHERE episode_id = ?",
    episodeId,
  );
  return row ? toDownload(row) : null;
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DownloadRow>(
    "SELECT * FROM downloads ORDER BY priority DESC, created_at ASC",
  );
  return rows.map(toDownload);
}

export async function insertDownload(r: DownloadRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO downloads (episode_id, podcast_id, url, state, relative_path, bytes_written,
       total_bytes, attempts, next_attempt_at, snapshot, priority, created_at, completed_at, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.episodeId,
    r.podcastId,
    r.url,
    r.state,
    r.relativePath,
    r.bytesWritten,
    r.totalBytes,
    r.attempts,
    r.nextAttemptAt,
    r.snapshot,
    r.priority,
    r.createdAt,
    r.completedAt,
    r.error,
  );
}

const DOWNLOAD_COLUMNS: Record<
  keyof Omit<DownloadRecord, "episodeId">,
  string
> = {
  podcastId: "podcast_id",
  url: "url",
  state: "state",
  relativePath: "relative_path",
  bytesWritten: "bytes_written",
  totalBytes: "total_bytes",
  attempts: "attempts",
  nextAttemptAt: "next_attempt_at",
  snapshot: "snapshot",
  priority: "priority",
  createdAt: "created_at",
  completedAt: "completed_at",
  error: "error",
};

export type DownloadPatch = Partial<Omit<DownloadRecord, "episodeId">>;

async function runDownloadUpdate(
  db: SQLiteDatabase,
  episodeId: string,
  patch: DownloadPatch,
): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof DOWNLOAD_COLUMNS)[];
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${DOWNLOAD_COLUMNS[k]} = ?`).join(", ");
  const values = keys.map((k) => patch[k] ?? null) as (
    string | number | null
  )[];
  await db.runAsync(
    `UPDATE downloads SET ${sets} WHERE episode_id = ?`,
    ...values,
    episodeId,
  );
}

export async function updateDownload(
  episodeId: string,
  patch: DownloadPatch,
): Promise<void> {
  await runDownloadUpdate(await getDb(), episodeId, patch);
}

/** Several row patches in one transaction (e.g. relaunch repairs). */
export async function updateDownloads(
  updates: { episodeId: string; patch: DownloadPatch }[],
): Promise<void> {
  if (updates.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const u of updates) await runDownloadUpdate(db, u.episodeId, u.patch);
  });
}

/** Deletes the rows in one statement; returns the removed files' relative paths. */
export async function deleteDownloadRows(
  episodeIds: string[],
): Promise<string[]> {
  if (episodeIds.length === 0) return [];
  const db = await getDb();
  const placeholders = episodeIds.map(() => "?").join(",");
  const rows = await db.getAllAsync<{ relative_path: string }>(
    `SELECT relative_path FROM downloads WHERE episode_id IN (${placeholders})`,
    ...episodeIds,
  );
  await db.runAsync(
    `DELETE FROM downloads WHERE episode_id IN (${placeholders})`,
    ...episodeIds,
  );
  return rows.map((r) => r.relative_path);
}

// ---------------------------------------------------------------- kv

export async function kvGet<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM kv WHERE key = ?",
    key,
  );
  return row ? parseJson<T | null>(row.value, null) : null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    JSON.stringify(value),
  );
}

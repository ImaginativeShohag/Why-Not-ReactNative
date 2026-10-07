import type { DownloadRecord } from "@/src/projects/podcast-player/models/Episode";

/**
 * Pure download policy: scheduling, retry backoff, network rule, storage cap
 * eviction and auto-delete. The manager does I/O; every decision is here.
 */

export const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 5 * 60_000;

/**
 * Exponential backoff with "equal jitter": half fixed, half random, so a
 * burst of failures (e.g. the network dropped) doesn't retry in lockstep.
 * attempt is 1-based (the attempt that just failed).
 */
export function backoffDelayMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const exp = Math.min(
    MAX_BACKOFF_MS,
    BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1),
  );
  const half = exp / 2;
  return Math.round(half + random() * half);
}

export function shouldRetry(attempts: number): boolean {
  return attempts < MAX_ATTEMPTS;
}

export type NetworkLike = {
  type?: string | null;
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
};

export type NetworkDecision = "ok" | "offline" | "waitingForWifi";

export function networkDecision(
  wifiOnly: boolean,
  net: NetworkLike,
): NetworkDecision {
  if (net.isConnected === false || net.isInternetReachable === false)
    return "offline";
  if (!wifiOnly) return "ok";
  // Ethernet counts as unmetered too (tablets, emulators, Android TV).
  return net.type === "WIFI" || net.type === "ETHERNET"
    ? "ok"
    : "waitingForWifi";
}

/** Which queued downloads to start now: priority first, then FIFO. */
export function pickDownloadsToStart(
  records: readonly DownloadRecord[],
  activeCount: number,
  maxConcurrent: number,
  now: number,
): DownloadRecord[] {
  const slots = Math.max(0, maxConcurrent - activeCount);
  if (slots === 0) return [];
  return records
    .filter((r) => r.state === "queued" && r.nextAttemptAt <= now)
    .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
    .slice(0, slots);
}

export type StoredFile = {
  episodeId: string;
  bytes: number;
  played: boolean;
  /** Epoch ms the episode was marked played (0 if unknown). */
  playedAt: number;
  completedAt: number;
};

/**
 * Picks files to delete so that `incomingBytes` fits under `capBytes`.
 * Only PLAYED episodes are evictable (oldest played first) — silently
 * deleting something the user hasn't listened to yet is worse than
 * refusing a new download. `fits` tells the caller whether that was enough.
 */
export function chooseEvictions(
  files: readonly StoredFile[],
  capBytes: number,
  incomingBytes: number,
  protectedIds: ReadonlySet<string> = new Set(),
): { evict: string[]; fits: boolean } {
  const used = files.reduce((sum, f) => sum + f.bytes, 0);
  let over = used + incomingBytes - capBytes;
  if (over <= 0) return { evict: [], fits: true };

  const candidates = files
    .filter((f) => f.played && !protectedIds.has(f.episodeId))
    .sort((a, b) => a.playedAt - b.playedAt || a.completedAt - b.completedAt);

  const evict: string[] = [];
  for (const f of candidates) {
    if (over <= 0) break;
    evict.push(f.episodeId);
    over -= f.bytes;
  }
  return { evict, fits: over <= 0 };
}

/** Played downloads past their retention (or immediately if deleteWhenPlayed). */
export function autoDeleteCandidates(
  files: readonly StoredFile[],
  rules: { autoDeleteDays: number; deleteWhenPlayed: boolean },
  now: number,
  protectedIds: ReadonlySet<string> = new Set(),
): string[] {
  const dayMs = 24 * 60 * 60 * 1000;
  return files
    .filter((f) => f.played && !protectedIds.has(f.episodeId))
    .filter(
      (f) =>
        rules.deleteWhenPlayed ||
        (rules.autoDeleteDays > 0 &&
          now - f.playedAt >= rules.autoDeleteDays * dayMs),
    )
    .map((f) => f.episodeId);
}

/** Size to budget for before a download starts (enclosure length is often 0/wrong). */
export function estimateBytes(
  enclosureLength: number | null,
  durationSec: number | null,
): number {
  if (enclosureLength && enclosureLength > 100_000) return enclosureLength;
  // ~128 kbps fallback, or 60 MB if we know nothing.
  if (durationSec && durationSec > 0) return Math.round(durationSec * 16_000);
  return 60 * 1024 * 1024;
}

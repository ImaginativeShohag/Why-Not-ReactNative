import {
  DownloadTask,
  File,
  type DownloadPauseState,
  type DownloadTaskState,
} from "expo-file-system";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { AppState } from "react-native";

import {
  deleteDownloadRows,
  getDownload,
  getEpisode,
  insertDownload,
  listDownloads,
  listPlayedAt,
  updateDownload,
  updateDownloads,
  type DownloadPatch,
} from "@/src/projects/podcast-player/db/queries";
import {
  autoDeleteCandidates,
  backoffDelayMs,
  chooseEvictions,
  estimateBytes,
  networkDecision,
  pickDownloadsToStart,
  shouldRetry,
  type NetworkDecision,
  type StoredFile,
} from "@/src/projects/podcast-player/downloads/policy";
import {
  deleteFile,
  deviceFreeBytes,
  documentDirUri,
  ensureShowDirectory,
  fileExists,
  fileSize,
  localUriIfPresent,
  relativePathFor,
  resolveUri,
  toRelativePath,
} from "@/src/projects/podcast-player/downloads/storage";
import type { DownloadRecord } from "@/src/projects/podcast-player/models/Episode";
import {
  clearLiveDownloads,
  setLiveDownload,
  useDownloadStore,
} from "@/src/projects/podcast-player/stores/downloadStore";
import { usePlayerStore } from "@/src/projects/podcast-player/stores/playerStore";
import { getSettings } from "@/src/projects/podcast-player/stores/settingsStore";
import { invalidateDownloads } from "@/src/projects/podcast-player/utils/invalidate";

/**
 * Download manager singleton.
 *
 *  - Queue: FIFO with a priority bump, max N concurrent (settings, 2–3).
 *  - Resumable: DownloadTask snapshots are persisted (with a RELATIVE fileUri)
 *    whenever the app backgrounds, when the user pauses, and when the network
 *    rule forces a pause. On relaunch they're rehydrated and resumed.
 *  - Retries: exponential backoff with jitter, capped attempts, then "failed".
 *  - Policy: Wi-Fi-only, storage cap with played-first eviction, auto-delete.
 */

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (v: T | Promise<T>) => void;
};
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T | Promise<T>) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

type ActiveTransfer = {
  task: DownloadTask;
  record: DownloadRecord;
  /** Set while we pause only to take a snapshot; resolves with the resumed op. */
  checkpoint?: Deferred<File | null>;
  /** Why the op ended with null: user pause vs network rule. */
  stopReason?: "user" | "network";
  lastDbWrite: number;
  /** Last progress step pushed to the live store (see progressStep). */
  lastLiveStep: number;
};

/** Serialized snapshot: the pause state with fileUri made relative. */
type StoredSnapshot = Omit<DownloadPauseState, "fileUri"> & {
  relativePath: string;
};

class DownloadManager {
  private active = new Map<string, ActiveTransfer>();
  private initialized: Promise<void> | null = null;
  private pumpScheduled = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private network: NetworkDecision = "ok";

  init(): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.rehydrate().catch((e) => {
        this.initialized = null;
        throw e;
      });
    }
    return this.initialized;
  }

  private async rehydrate(): Promise<void> {
    // Read once; repairs are applied to these in-memory records as well, so
    // auto-delete and the live-store sync below can reuse them.
    const records = await listDownloads();
    const repairs: { episodeId: string; patch: DownloadPatch }[] = [];
    for (const r of records) {
      let patch: DownloadPatch | null = null;
      if (r.state === "downloading") {
        // The process died mid-transfer. With a snapshot we resume; without
        // one we restart from byte 0 (still better than losing the item).
        patch = { state: "queued", nextAttemptAt: 0 };
      } else if (r.state === "done" && !fileExists(r.relativePath)) {
        // File vanished (user cleared storage, or an old absolute-path bug).
        patch = {
          state: "queued",
          bytesWritten: 0,
          snapshot: null,
          completedAt: null,
        };
      }
      if (patch) {
        Object.assign(r, patch);
        repairs.push({ episodeId: r.episodeId, patch });
      }
    }
    await updateDownloads(repairs);

    const net = await getNetworkStateAsync().catch(() => ({}));
    this.setNetwork(networkDecision(getSettings().wifiOnly, net));
    addNetworkStateListener((state) => {
      this.setNetwork(networkDecision(getSettings().wifiOnly, state));
    });

    AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        void this.checkpointAll();
      } else if (next === "active") {
        this.schedulePump();
      }
    });

    const removed = new Set(await this.runAutoDelete(records));
    this.syncLive(records.filter((r) => !removed.has(r.episodeId)));
    this.schedulePump();
  }

  // ------------------------------------------------------------ public API

  async enqueue(
    episodeId: string,
    options: { priority?: boolean } = {},
  ): Promise<void> {
    await this.init();
    const existing = await getDownload(episodeId);
    if (existing && existing.state !== "failed" && existing.state !== "idle") {
      if (options.priority) await this.prioritize(episodeId);
      return;
    }
    const episode = await getEpisode(episodeId);
    if (!episode) throw new Error(`Unknown episode ${episodeId}`);

    const record: DownloadRecord = {
      episodeId,
      podcastId: episode.podcastId,
      url: episode.audioUrl,
      state: "queued",
      relativePath: relativePathFor(
        episode.podcastId,
        episodeId,
        episode.audioUrl,
      ),
      bytesWritten: 0,
      totalBytes: episode.enclosureLength ?? 0,
      attempts: 0,
      nextAttemptAt: 0,
      snapshot: null,
      priority: options.priority ? Date.now() : 0,
      createdAt: Date.now(),
      completedAt: null,
      error: null,
    };
    await insertDownload(record);
    setLiveDownload(episodeId, {
      state: "queued",
      bytesWritten: 0,
      totalBytes: record.totalBytes,
    });
    invalidateDownloads();
    this.schedulePump();
  }

  async prioritize(episodeId: string): Promise<void> {
    await updateDownload(episodeId, { priority: Date.now() });
    this.schedulePump();
  }

  async pause(episodeId: string): Promise<void> {
    const t = this.active.get(episodeId);
    if (t) {
      t.stopReason = "user";
      await this.pauseAndSnapshot(t);
    }
    await updateDownload(episodeId, { state: "paused" });
    setLiveDownload(episodeId, { state: "paused" });
    invalidateDownloads();
  }

  async resume(episodeId: string): Promise<void> {
    await updateDownload(episodeId, { state: "queued", nextAttemptAt: 0 });
    setLiveDownload(episodeId, { state: "queued" });
    invalidateDownloads();
    this.schedulePump();
  }

  async retry(episodeId: string): Promise<void> {
    await updateDownload(episodeId, {
      state: "queued",
      attempts: 0,
      nextAttemptAt: 0,
      error: null,
    });
    setLiveDownload(episodeId, { state: "queued" });
    invalidateDownloads();
    this.schedulePump();
  }

  /** Cancels an in-flight/queued download, or deletes a finished one. */
  async remove(episodeId: string): Promise<void> {
    await this.removeMany([episodeId]);
  }

  /** remove() for several ids: one DELETE, one invalidate, one pump. */
  async removeMany(episodeIds: string[]): Promise<void> {
    if (episodeIds.length === 0) return;
    for (const id of episodeIds) {
      const t = this.active.get(id);
      if (t) {
        t.stopReason = "user";
        t.task.cancel();
        this.active.delete(id);
      }
    }
    const paths = await deleteDownloadRows(episodeIds);
    for (const path of paths) deleteFile(path);
    clearLiveDownloads(episodeIds);
    invalidateDownloads();
    this.schedulePump();
  }

  async deleteAllPlayed(): Promise<number> {
    const playedAt = await listPlayedAt();
    const records = await listDownloads();
    const current = usePlayerStore.getState().nowPlaying?.episodeId;
    const targets = records.filter(
      (r) =>
        r.state === "done" &&
        playedAt.has(r.episodeId) &&
        r.episodeId !== current,
    );
    await this.removeMany(targets.map((r) => r.episodeId));
    return targets.length;
  }

  /** Local file URI when downloaded and present on disk (playback prefers it). */
  async localUriFor(episodeId: string): Promise<string | null> {
    const r = await getDownload(episodeId);
    if (!r || r.state !== "done") return null;
    return localUriIfPresent(r.relativePath);
  }

  /** Called by the playback service when an episode finishes. */
  async onEpisodePlayed(): Promise<void> {
    await this.runAutoDelete(await listDownloads());
  }

  /** Re-evaluates the network rule (e.g. after the Wi-Fi-only setting changes). */
  async refreshNetworkRule(): Promise<void> {
    const net = await getNetworkStateAsync().catch(() => ({}));
    this.setNetwork(networkDecision(getSettings().wifiOnly, net));
  }

  async storageUsage(): Promise<{
    usedBytes: number;
    capBytes: number;
    freeBytes: number;
  }> {
    const records = await listDownloads();
    const usedBytes = records
      .filter((r) => r.state === "done")
      .reduce((sum, r) => sum + (r.totalBytes || fileSize(r.relativePath)), 0);
    return {
      usedBytes,
      capBytes: getSettings().storageCapBytes,
      freeBytes: deviceFreeBytes(),
    };
  }

  /** Nudged by the background task: resume anything that stalled. */
  async kick(): Promise<void> {
    await this.init();
    await this.pump();
  }

  // ------------------------------------------------------------ scheduling

  private setNetwork(decision: NetworkDecision) {
    const changed = decision !== this.network;
    this.network = decision;
    useDownloadStore.setState({ network: decision });
    if (!changed) return;
    if (decision === "ok") {
      this.schedulePump();
    } else {
      // Wi-Fi dropped to cellular (or offline): park transfers with snapshots
      // so they continue from the same byte when the rule allows again.
      for (const t of this.active.values()) {
        t.stopReason = "network";
        void this.pauseAndSnapshot(t);
      }
    }
  }

  private schedulePump() {
    if (this.pumpScheduled) return;
    this.pumpScheduled = true;
    setTimeout(() => {
      this.pumpScheduled = false;
      void this.pump();
    }, 0);
  }

  private async pump(): Promise<void> {
    if (this.network !== "ok") return;
    const records = await listDownloads();
    const now = Date.now();
    const toStart = pickDownloadsToStart(
      records.filter((r) => !this.active.has(r.episodeId)),
      this.active.size,
      getSettings().maxConcurrentDownloads,
      now,
    );
    if (toStart.length > 0) {
      // One played-state read for the whole batch, not one per start.
      const playedAt = await listPlayedAt();
      for (const r of toStart) void this.start(r, records, playedAt);
    }

    // Wake up for the earliest backoff gate.
    const nextGate = records
      .filter((r) => r.state === "queued" && r.nextAttemptAt > now)
      .reduce(
        (min, r) => Math.min(min, r.nextAttemptAt),
        Number.POSITIVE_INFINITY,
      );
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = Number.isFinite(nextGate)
      ? setTimeout(() => this.schedulePump(), Math.max(250, nextGate - now))
      : null;
  }

  private async ensureCapacity(
    record: DownloadRecord,
    all: DownloadRecord[],
    playedAt: Map<string, number>,
  ): Promise<string | null> {
    const episode = await getEpisode(record.episodeId);
    const incoming = estimateBytes(
      record.totalBytes || null,
      episode?.duration ?? null,
    );
    if (incoming > deviceFreeBytes())
      return "Not enough free space on this device";

    const files: StoredFile[] = all
      .filter((r) => r.state === "done")
      .map((r) => ({
        episodeId: r.episodeId,
        bytes: r.totalBytes || fileSize(r.relativePath),
        played: playedAt.has(r.episodeId),
        playedAt: playedAt.get(r.episodeId) ?? 0,
        completedAt: r.completedAt ?? 0,
      }));
    const current = usePlayerStore.getState().nowPlaying?.episodeId;
    const { evict, fits } = chooseEvictions(
      files,
      getSettings().storageCapBytes,
      incoming,
      new Set(current ? [current] : []),
    );
    await this.removeMany(evict);
    return fits
      ? null
      : "Storage cap reached — delete played episodes or raise the cap";
  }

  private async start(
    record: DownloadRecord,
    all: DownloadRecord[],
    playedAt: Map<string, number>,
  ): Promise<void> {
    if (this.active.has(record.episodeId)) return;

    const capacityError = await this.ensureCapacity(record, all, playedAt);
    if (capacityError) {
      await updateDownload(record.episodeId, {
        state: "failed",
        error: capacityError,
      });
      setLiveDownload(record.episodeId, { state: "failed" });
      invalidateDownloads();
      return;
    }

    ensureShowDirectory(record.podcastId);
    const onProgress = (p: { bytesWritten: number; totalBytes: number }) =>
      this.onProgress(record.episodeId, p.bytesWritten, p.totalBytes);

    let task: DownloadTask;
    let firstOp: Promise<File | null>;
    const snapshot = parseSnapshot(record.snapshot);
    try {
      if (snapshot) {
        task = DownloadTask.fromSavable(
          { ...snapshot, fileUri: resolveUri(snapshot.relativePath) },
          { onProgress },
        );
        firstOp = task.resumeAsync();
      } else {
        task = new DownloadTask(
          record.url,
          new File(resolveUri(record.relativePath)),
          {
            onProgress,
          },
        );
        firstOp = task.downloadAsync();
      }
    } catch {
      // Unusable snapshot (e.g. resumeData from an older container): start over.
      await updateDownload(record.episodeId, {
        snapshot: null,
        bytesWritten: 0,
      });
      task = new DownloadTask(
        record.url,
        new File(resolveUri(record.relativePath)),
        {
          onProgress,
        },
      );
      firstOp = task.downloadAsync();
    }

    const transfer: ActiveTransfer = {
      task,
      record,
      lastDbWrite: 0,
      lastLiveStep: Number.NaN,
    };
    this.active.set(record.episodeId, transfer);
    await updateDownload(record.episodeId, {
      state: "downloading",
      error: null,
    });
    setLiveDownload(record.episodeId, { state: "downloading" });
    invalidateDownloads();

    try {
      let op = firstOp;
      let file: File | null = null;
      for (;;) {
        file = await op;
        if (file) break;
        const cp = transfer.checkpoint;
        if (cp) {
          op = cp.promise; // snapshot taken, transfer resumed — keep waiting
          continue;
        }
        break; // paused for real (user or network rule)
      }

      if (file) {
        const size = file.size ?? 0;
        await updateDownload(record.episodeId, {
          state: "done",
          bytesWritten: size,
          totalBytes: size,
          snapshot: null,
          completedAt: Date.now(),
          error: null,
        });
        setLiveDownload(record.episodeId, {
          state: "done",
          bytesWritten: size,
          totalBytes: size,
        });
      } else if (transfer.stopReason === "network") {
        await updateDownload(record.episodeId, {
          state: "queued",
          nextAttemptAt: 0,
        });
        setLiveDownload(record.episodeId, { state: "queued" });
      }
    } catch (e) {
      if (transfer.stopReason === "user") {
        // Cancelled via remove(); the row is already gone.
      } else {
        await this.onFailure(record.episodeId, e);
      }
    } finally {
      this.active.delete(record.episodeId);
      try {
        task.release();
      } catch {
        // already released
      }
      invalidateDownloads();
      this.schedulePump();
    }
  }

  private async onFailure(episodeId: string, error: unknown) {
    const current = await getDownload(episodeId);
    if (!current) return;
    const attempts = current.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);
    if (shouldRetry(attempts)) {
      await updateDownload(episodeId, {
        state: "queued",
        attempts,
        nextAttemptAt: Date.now() + backoffDelayMs(attempts),
        // A failed resume usually means the snapshot is stale; retry clean.
        snapshot: null,
        error: message,
      });
      setLiveDownload(episodeId, { state: "queued" });
    } else {
      await updateDownload(episodeId, {
        state: "failed",
        attempts,
        error: message,
        snapshot: null,
      });
      setLiveDownload(episodeId, { state: "failed" });
    }
  }

  private onProgress(
    episodeId: string,
    bytesWritten: number,
    totalBytes: number,
  ) {
    const t = this.active.get(episodeId);
    // Native progress fires many times a second; only push to the live store
    // when the visible value (whole percent) changes.
    const step = progressStep(bytesWritten, totalBytes);
    if (!t || step !== t.lastLiveStep) {
      if (t) t.lastLiveStep = step;
      setLiveDownload(episodeId, {
        bytesWritten,
        totalBytes: Math.max(0, totalBytes),
      });
    }
    const now = Date.now();
    if (t && now - t.lastDbWrite > 3000) {
      t.lastDbWrite = now;
      void updateDownload(episodeId, {
        bytesWritten,
        totalBytes: Math.max(0, totalBytes),
      });
    }
  }

  // ------------------------------------------------------------ snapshots

  /** Pause → persist snapshot. The caller decides whether to resume. */
  private async pauseAndSnapshot(t: ActiveTransfer): Promise<void> {
    if (t.task.state !== "active") return;
    try {
      await t.task.pauseAsync();
      await this.persistSnapshot(t);
    } catch {
      // Finished or failed in the meantime — the runner handles it.
    }
  }

  private async persistSnapshot(t: ActiveTransfer) {
    if (t.task.state !== "paused") return;
    const saved = t.task.savable();
    const relativePath =
      toRelativePath(saved.fileUri, documentDirUri()) ?? t.record.relativePath;
    const snapshot: StoredSnapshot = {
      url: saved.url,
      isDirectory: saved.isDirectory,
      headers: saved.headers,
      resumeData: saved.resumeData,
      relativePath,
    };
    await updateDownload(t.record.episodeId, {
      snapshot: JSON.stringify(snapshot),
    });
  }

  /**
   * Snapshot every active transfer, then let it continue. Runs when the app
   * backgrounds so a later kill can resume from here on relaunch.
   */
  private async checkpointAll(): Promise<void> {
    await Promise.all(
      [...this.active.values()].map(async (t) => {
        if (t.task.state !== "active" || t.checkpoint) return;
        const cp = deferred<File | null>();
        t.checkpoint = cp;
        try {
          await t.task.pauseAsync();
          await this.persistSnapshot(t);
        } catch {
          // ignore; see pauseAndSnapshot
        } finally {
          t.checkpoint = undefined;
          // Re-read: TS narrowed `state` before the awaits above.
          const state = t.task.state as DownloadTaskState;
          cp.resolve(
            state === "paused" ? t.task.resumeAsync() : Promise.resolve(null),
          );
        }
      }),
    );
  }

  /** Deletes played downloads past the auto-delete window; returns their ids. */
  private async runAutoDelete(records: DownloadRecord[]): Promise<string[]> {
    const settings = getSettings();
    const playedAt = await listPlayedAt();
    const files: StoredFile[] = records
      .filter((r) => r.state === "done" && playedAt.has(r.episodeId))
      .map((r) => ({
        episodeId: r.episodeId,
        bytes: r.totalBytes,
        played: true,
        playedAt: playedAt.get(r.episodeId) ?? 0,
        completedAt: r.completedAt ?? 0,
      }));
    const current = usePlayerStore.getState().nowPlaying?.episodeId;
    const ids = autoDeleteCandidates(
      files,
      settings,
      Date.now(),
      new Set(current ? [current] : []),
    );
    await this.removeMany(ids);
    return ids;
  }

  private syncLive(records: DownloadRecord[]) {
    useDownloadStore.setState((s) => {
      const live = { ...s.live };
      for (const r of records) {
        live[r.episodeId] = {
          state: r.state,
          bytesWritten: r.bytesWritten,
          totalBytes: r.totalBytes,
        };
      }
      return { live };
    });
  }
}

const MIB = 1024 * 1024;

/**
 * Coarse progress bucket for throttling live-store updates: the whole
 * percent, or (negative, so it never collides) each MiB when the size is
 * unknown.
 */
function progressStep(bytesWritten: number, totalBytes: number): number {
  return totalBytes > 0
    ? Math.floor((bytesWritten / totalBytes) * 100)
    : -1 - Math.floor(bytesWritten / MIB);
}

function parseSnapshot(raw: string | null): StoredSnapshot | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as StoredSnapshot;
    return s.resumeData && s.relativePath ? s : null;
  } catch {
    return null;
  }
}

export const downloadManager = new DownloadManager();

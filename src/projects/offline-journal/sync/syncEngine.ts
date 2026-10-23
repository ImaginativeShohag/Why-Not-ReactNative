import * as Network from "expo-network";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDb } from "../db/client";
import {
  claimBatch,
  completeItem,
  deleteMeta,
  failItem,
  getMeta,
  setMeta,
} from "../db/queries/outbox";
import { writeTags } from "../db/queries/tags";
import type { OutboxItem } from "../models/Entry";
import {
  ensureSettingsHydrated,
  type SyncSettings,
} from "../stores/settingsStore";
import { useSyncStore, type SyncResult } from "../stores/syncStore";
import { request } from "./http";
import { classifyStatus, parsePullResponse, sanitizeMood } from "./policy";

/**
 * Server contract (any mock that honours it works — json-server, a Worker…):
 *
 *   GET    /entries?since=<cursor>  -> { entries: RemoteEntry[], serverTime }
 *   PUT    /entries/:id             upsert on the client ULID; body = payload
 *   DELETE /entries/:id             idempotent tombstone
 *
 * Conflict rule, stated explicitly: last-write-wins by `updated_at`, and a row
 * with unsent local edits (dirty = 1) is never overwritten by a pull. The
 * client ULID is the idempotency key, so replaying any request is harmless.
 */

const CURSOR_KEY = "last_pulled_at";
export const LAST_SYNCED_KEY = "last_synced_at";
export const LAST_ERROR_KEY = "last_error";

export type { SyncResult };

let inFlight: Promise<SyncResult> | null = null;
let again = false;
let localWriteTimer: ReturnType<typeof setTimeout> | null = null;

/** How long local writes are coalesced before they trigger a sync. */
const LOCAL_WRITE_DELAY_MS = 10_000;

/**
 * Run-lock. Foreground, network-regained, manual button, local writes and the
 * background task all call this; without the lock two runs push the same outbox
 * row twice. A kick that lands mid-run schedules exactly one follow-up run, so
 * an edit made during a sync is not left waiting for the next trigger.
 */
export function kick(): Promise<SyncResult> {
  // Any run ships the outbox, so a pending local-write kick is now redundant.
  if (localWriteTimer) {
    clearTimeout(localWriteTimer);
    localWriteTimer = null;
  }
  if (inFlight) {
    again = true;
    return inFlight;
  }
  // `run` records failures it expects, but the hydration or the db open can
  // still throw. Settle those as an error result too, so the fire-and-forget
  // callers (`void kick()`) can never produce an unhandled rejection.
  inFlight = run()
    .catch((cause) =>
      finish({ pulled: 0, pushed: 0, failed: 0, error: errorText(cause) }),
    )
    .finally(() => {
      inFlight = null;
      if (again) {
        again = false;
        void kick();
      }
    });
  return inFlight;
}

/**
 * Trailing debounce for kicks caused by local writes. Autosave writes every
 * typing pause; syncing each one would be a full pull + push per pause. The
 * outbox already holds every change durably, so waiting costs nothing. Manual
 * and lifecycle triggers keep calling `kick()` and run immediately.
 */
export function kickSoon() {
  if (localWriteTimer) clearTimeout(localWriteTimer);
  localWriteTimer = setTimeout(() => {
    localWriteTimer = null;
    void kick();
  }, LOCAL_WRITE_DELAY_MS);
}

async function run(): Promise<SyncResult> {
  const { sync } = await ensureSettingsHydrated();
  if (!sync.enabled || !sync.baseUrl) {
    return finish({ pulled: 0, pushed: 0, failed: 0, skipped: "disabled" });
  }

  // Cheap pre-check: don't burn a backoff step on every item when we already
  // know there is no route. `false` only — `undefined` means "unknown", so try.
  const network = await Network.getNetworkStateAsync().catch(() => null);
  if (
    network?.isInternetReachable === false ||
    network?.isConnected === false
  ) {
    return finish({ pulled: 0, pushed: 0, failed: 0, skipped: "offline" });
  }

  // The background task can wake the app headless, before any screen (and so
  // before SQLiteProvider's onInit) has run. getDb() opens and migrates once.
  const db = await getDb();

  useSyncStore.getState().setPhase("syncing");
  try {
    const pulled = await pull(db, sync); // remote first, so unsent local edits win
    const { pushed, failed } = await push(db, sync);
    await setMeta(db, LAST_SYNCED_KEY, String(Date.now()));
    await deleteMeta(db, LAST_ERROR_KEY);
    return finish({ pulled, pushed, failed });
  } catch (cause) {
    const error = errorText(cause);
    await setMeta(db, LAST_ERROR_KEY, error).catch(() => undefined);
    // Offline is not an emergency: the outbox still holds every change.
    return finish({ pulled: 0, pushed: 0, failed: 0, error });
  }
}

const errorText = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

function finish(result: SyncResult) {
  useSyncStore.getState().finish(result);
  return result;
}

async function pull(db: SQLiteDatabase, settings: SyncSettings) {
  const cursor = (await getMeta(db, CURSOR_KEY)) ?? "0";
  const response = await request(
    settings,
    `/entries?since=${encodeURIComponent(cursor)}`,
  );
  if (!response.ok) throw new Error(`pull failed: HTTP ${response.status}`);

  const { entries, serverTime } = parsePullResponse(await response.json());

  await db.withTransactionAsync(async () => {
    for (const remote of entries) {
      // Last-write-wins by updated_at, and never clobber a row with unsent local
      // edits — that WHERE clause is the entire conflict policy.
      const result = await db.runAsync(
        `INSERT INTO entries (id, title, body, mood, created_at, updated_at, deleted_at, remote_id, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT (id) DO UPDATE SET
           title      = excluded.title,
           body       = excluded.body,
           mood       = excluded.mood,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           remote_id  = excluded.remote_id
         WHERE entries.dirty = 0 AND entries.updated_at < excluded.updated_at`,
        remote.id,
        remote.title,
        remote.body,
        sanitizeMood(remote.mood),
        remote.created_at,
        remote.updated_at,
        remote.deleted_at,
        remote.id,
      );
      // `changes` is 0 when the WHERE above rejected the update, so tags only
      // follow a remote row that actually won.
      if (result.changes > 0 && remote.tags) {
        await writeTags(db, remote.id, remote.tags);
      }
    }
    await setMeta(db, CURSOR_KEY, String(serverTime));
  });

  return entries.length;
}

async function push(db: SQLiteDatabase, settings: SyncSettings) {
  const batch = await claimBatch(db, 25);
  let pushed = 0;
  let failed = 0;

  for (const item of batch) {
    let status: number;
    try {
      // PUT on the client-generated ULID: replaying it is a no-op, so a lost
      // response costs nothing. That is what makes retries safe.
      const response = await request(
        settings,
        `/entries/${encodeURIComponent(item.entity_id)}`,
        {
          method: item.op === "delete" ? "DELETE" : "PUT",
          headers: {
            "content-type": "application/json",
            "idempotency-key": `${item.entity_id}:${item.id}`,
          },
          body: item.op === "delete" ? undefined : item.payload,
        },
      );
      status = response.status;
    } catch (cause) {
      await failItem(db, item, String(cause)); // offline: stay queued, no drama
      failed++;
      continue;
    }

    const verdict = classifyStatus(status);
    if (verdict === "ok") {
      // The server has it. A local write failing now is not a server failure,
      // so it must not burn an attempt: the row just stays queued, and the
      // idempotent replay next run clears it.
      await markDone(db, item).catch(() => undefined);
      pushed++;
    } else if (verdict === "dead") {
      // The server will never accept this. Dead-letter it and surface it.
      await failItem(db, item, `HTTP ${status}`, { permanent: true });
      failed++;
    } else {
      await failItem(db, item, `HTTP ${status}`); // retry with backoff
      failed++;
    }
  }

  return { pushed, failed };
}

async function markDone(db: SQLiteDatabase, item: OutboxItem) {
  await db.withTransactionAsync(async () => {
    await completeItem(db, item);
    // Only clear `dirty` if no newer edit is still queued for this row.
    await db.runAsync(
      `UPDATE entries SET dirty = 0, remote_id = COALESCE(remote_id, id)
       WHERE id = ? AND NOT EXISTS (SELECT 1 FROM outbox WHERE entity_id = ?)`,
      item.entity_id,
      item.entity_id,
    );
  });
}

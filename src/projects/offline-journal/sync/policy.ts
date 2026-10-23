import type { OutboxOp } from "../models/Entry";

/**
 * The sync engine's decisions, as pure functions. None of this touches the
 * database or the network, so every rule is unit-tested in isolation.
 */

/** After this many failed attempts an outbox item is dead-lettered. */
export const MAX_ATTEMPTS = 6;

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 300_000;

/**
 * Exponential backoff with jitter, capped at five minutes. The jitter matters
 * more than it looks: without it every device that went offline together
 * retries together, in lockstep, forever.
 */
export function backoffDelay(
  attempts: number,
  random: () => number = Math.random,
) {
  const exponential = Math.min(2 ** attempts * BASE_DELAY_MS, MAX_DELAY_MS);
  return exponential + Math.floor(random() * 1000);
}

export type ResponseClass = "ok" | "retry" | "dead";

/**
 * 2xx: done. 5xx, 408 (timeout) and 429 (rate limit): transient, back off.
 * Every other 4xx: the server will never accept this payload — dead-letter it
 * and surface it instead of retrying a request that cannot succeed.
 */
export function classifyStatus(status: number): ResponseClass {
  if (status >= 200 && status < 300) return "ok";
  if (status === 408 || status === 429) return "retry";
  if (status >= 400 && status < 500) return "dead";
  return "retry";
}

/**
 * Outbox compaction. Autosave writes every ~800 ms, and shipping each keystroke
 * as its own request is waste — so a new op folds into the not-yet-sent item
 * for the same entity. The rule is "what does the server need to end up
 * correct?":
 *   create + update -> create (server never saw it; send the latest body)
 *   update + update -> update
 *   any    + delete -> delete
 *   delete + create/update -> the new op (an undo that re-saved the row)
 */
export function mergeOutboxOp(previous: OutboxOp, next: OutboxOp): OutboxOp {
  if (next === "delete") return "delete";
  if (previous === "create") return "create";
  return next;
}

export type RemoteEntry = {
  id: string;
  title: string;
  body: string;
  mood: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  tags?: string[];
};

export type PullResponse = { entries: RemoteEntry[]; serverTime: number };

const isNumberOrNull = (value: unknown) =>
  value === null || typeof value === "number";

/**
 * Never trust the wire. A malformed row is dropped rather than written; one bad
 * record must not poison the whole pull or the local database.
 */
export function parsePullResponse(json: unknown): PullResponse {
  if (typeof json !== "object" || json === null)
    throw new Error("pull: response is not an object");

  const { entries, serverTime } = json as Record<string, unknown>;
  if (typeof serverTime !== "number")
    throw new Error("pull: missing serverTime");
  if (!Array.isArray(entries)) throw new Error("pull: missing entries");

  const valid = entries.filter((raw): raw is RemoteEntry => {
    if (typeof raw !== "object" || raw === null) return false;
    const row = raw as Record<string, unknown>;
    return (
      typeof row.id === "string" &&
      typeof row.title === "string" &&
      typeof row.body === "string" &&
      isNumberOrNull(row.mood) &&
      typeof row.created_at === "number" &&
      typeof row.updated_at === "number" &&
      isNumberOrNull(row.deleted_at ?? null) &&
      (row.tags === undefined ||
        (Array.isArray(row.tags) &&
          row.tags.every((tag) => typeof tag === "string")))
    );
  });

  return {
    entries: valid.map((row) => ({
      ...row,
      deleted_at: row.deleted_at ?? null,
    })),
    serverTime,
  };
}

/** Clamp a remote mood into the 1..5 range the schema expects. */
export function sanitizeMood(mood: number | null): 1 | 2 | 3 | 4 | 5 | null {
  if (mood === null || !Number.isInteger(mood) || mood < 1 || mood > 5)
    return null;
  return mood as 1 | 2 | 3 | 4 | 5;
}

/**
 * The stored sync error is the raw message (a native fetch error can carry a
 * Swift file and line). Settings shows this instead: what happened, in words.
 */
export function describeSyncError(raw: string): string {
  const status = /HTTP (\d{3})/.exec(raw)?.[1];
  if (status) {
    const code = Number(status);
    if (code >= 500) return `The server had a problem (HTTP ${code})`;
    if (code === 401 || code === 403)
      return `The server refused access (HTTP ${code})`;
    return `The server rejected the request (HTTP ${code})`;
  }
  if (/^pull: /.test(raw)) return "The server sent an unexpected response";
  if (/fetch|network|connect|abort|timed? ?out|offline|host/i.test(raw))
    return "Couldn't reach the server";
  return "Sync failed. Your changes are safe on this device";
}

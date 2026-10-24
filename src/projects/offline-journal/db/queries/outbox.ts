import type { SQLiteDatabase } from "expo-sqlite";

import type { OutboxItem, OutboxOp } from "../../models/Entry";
import { backoffDelay, MAX_ATTEMPTS, mergeOutboxOp } from "../../sync/policy";

export { MAX_ATTEMPTS };

/**
 * Must be called inside the same transaction as the row change it describes.
 *
 * Compaction: if an item for this entity is still queued, fold the new op into
 * it instead of queueing another request — even if it has been attempted (or
 * dead-lettered). Every payload is the entry's full latest state and every
 * request is idempotent, so resending the folded row is always correct. A
 * second row is what broke ordering: a retry backing off behind a newer row let
 * the newer one land first, and the old retry then overwrote it (or revived a
 * delete). The folded row is a new request, so it is re-inserted: a fresh id
 * gives it a fresh idempotency key (`id` is AUTOINCREMENT, never reused) and a
 * fresh retry state. Reusing the old id would replay the old key with a new
 * body, and a server that caches responses by key would drop the edit.
 */
export async function enqueue(
  db: SQLiteDatabase,
  op: OutboxOp,
  entityId: string,
  payload: unknown,
) {
  const waiting = await db.getFirstAsync<{ id: number; op: OutboxOp }>(
    `SELECT id, op FROM outbox
     WHERE entity_id = ?
     ORDER BY id DESC LIMIT 1`,
    entityId,
  );

  if (waiting) {
    await db.runAsync("DELETE FROM outbox WHERE id = ?", waiting.id);
  }

  await db.runAsync(
    `INSERT INTO outbox (op, entity, entity_id, payload, created_at)
     VALUES (?, 'entry', ?, ?, ?)`,
    waiting ? mergeOutboxOp(waiting.op, op) : op,
    entityId,
    JSON.stringify(payload),
    Date.now(),
  );
}

/**
 * Oldest-first, skipping items still inside their backoff window. Only the
 * oldest live item per entity is eligible: rows queued before compaction
 * folded attempted items could hold two for one entry, and the newer one must
 * not overtake an older one that is backing off.
 */
export async function claimBatch(db: SQLiteDatabase, limit = 25) {
  return db.getAllAsync<OutboxItem>(
    `SELECT id, op, entity, entity_id, payload, attempts
     FROM outbox
     WHERE next_attempt_at <= ? AND attempts < ?
       AND NOT EXISTS (
         SELECT 1 FROM outbox earlier
         WHERE earlier.entity_id = outbox.entity_id
           AND earlier.id < outbox.id
           AND earlier.attempts < ?
       )
     ORDER BY id
     LIMIT ?`,
    Date.now(),
    MAX_ATTEMPTS,
    MAX_ATTEMPTS,
    limit,
  );
}

/**
 * Deletes the item only if it is still the request we sent. Compaction may
 * have folded a newer edit in while the request was in flight — that replaces
 * the row under a new id, so deleting by id alone already spares it; the
 * payload check also covers an outbox written before folding re-inserted.
 */
export async function completeItem(db: SQLiteDatabase, item: OutboxItem) {
  const result = await db.runAsync(
    "DELETE FROM outbox WHERE id = ? AND payload = ?",
    item.id,
    item.payload,
  );
  return result.changes > 0;
}

/**
 * Same payload guard as `completeItem`: if a newer edit was folded in while
 * the request was in flight, the failure belongs to the old payload, and the
 * fresh one keeps its clean retry state.
 */
export async function failItem(
  db: SQLiteDatabase,
  item: OutboxItem,
  message: string,
  options: { permanent?: boolean } = {},
) {
  const attempts = options.permanent ? MAX_ATTEMPTS : item.attempts + 1;

  await db.runAsync(
    `UPDATE outbox SET attempts = ?, next_attempt_at = ?, last_error = ?
     WHERE id = ? AND payload = ?`,
    attempts,
    Date.now() + backoffDelay(attempts),
    message,
    item.id,
    item.payload,
  );
}

export async function outboxStats(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ pending: number; dead: number }>(
    `SELECT SUM(attempts <  ?) AS pending,
            SUM(attempts >= ?) AS dead
     FROM outbox`,
    MAX_ATTEMPTS,
    MAX_ATTEMPTS,
  );
  return { pending: row?.pending ?? 0, dead: row?.dead ?? 0 };
}

/** Dead letters back into the queue — for after the server-side bug is fixed. */
export async function retryDeadLetters(db: SQLiteDatabase) {
  await db.runAsync(
    "UPDATE outbox SET attempts = 0, next_attempt_at = 0, last_error = NULL WHERE attempts >= ?",
    MAX_ATTEMPTS,
  );
}

/**
 * Gives up on the dead letters. Their entries are no longer waiting on
 * anything, so `dirty` is cleared too (unless another change is still queued):
 * a row left dirty would be skipped by every pull, forever.
 */
export async function discardDeadLetters(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE entries SET dirty = 0
       WHERE id IN (SELECT entity_id FROM outbox WHERE attempts >= ?)
         AND NOT EXISTS (
           SELECT 1 FROM outbox o WHERE o.entity_id = entries.id AND o.attempts < ?
         )`,
      MAX_ATTEMPTS,
      MAX_ATTEMPTS,
    );
    await db.runAsync("DELETE FROM outbox WHERE attempts >= ?", MAX_ATTEMPTS);
  });
}

export async function getMeta(db: SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function deleteMeta(db: SQLiteDatabase, key: string) {
  await db.runAsync("DELETE FROM sync_meta WHERE key = ?", key);
}

import type { SQLiteDatabase } from "expo-sqlite";

import type { OutboxItem, OutboxOp } from "../../models/Entry";
import { backoffDelay, MAX_ATTEMPTS, mergeOutboxOp } from "../../sync/policy";

export { MAX_ATTEMPTS };

/**
 * Must be called inside the same transaction as the row change it describes.
 *
 * Compaction: if an item for this entity is still waiting and has never been
 * attempted, fold the new op into it instead of queueing another request. An
 * item that has been attempted is left alone — the server may already have
 * seen it, so the new op must follow it in order.
 */
export async function enqueue(
  db: SQLiteDatabase,
  op: OutboxOp,
  entityId: string,
  payload: unknown,
) {
  const waiting = await db.getFirstAsync<{ id: number; op: OutboxOp }>(
    `SELECT id, op FROM outbox
     WHERE entity_id = ? AND attempts = 0
     ORDER BY id DESC LIMIT 1`,
    entityId,
  );

  if (waiting) {
    await db.runAsync(
      "UPDATE outbox SET op = ?, payload = ?, next_attempt_at = 0 WHERE id = ?",
      mergeOutboxOp(waiting.op, op),
      JSON.stringify(payload),
      waiting.id,
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO outbox (op, entity, entity_id, payload, created_at)
     VALUES (?, 'entry', ?, ?, ?)`,
    op,
    entityId,
    JSON.stringify(payload),
    Date.now(),
  );
}

/** Oldest-first, skipping items still inside their backoff window. */
export async function claimBatch(db: SQLiteDatabase, limit = 25) {
  return db.getAllAsync<OutboxItem>(
    `SELECT id, op, entity, entity_id, payload, attempts
     FROM outbox
     WHERE next_attempt_at <= ? AND attempts < ?
     ORDER BY id
     LIMIT ?`,
    Date.now(),
    MAX_ATTEMPTS,
    limit,
  );
}

/**
 * Deletes the item only if its payload is still the one we sent. Compaction
 * may have folded a newer edit into this row while the request was in flight —
 * deleting it then would silently drop that edit.
 */
export async function completeItem(db: SQLiteDatabase, item: OutboxItem) {
  const result = await db.runAsync(
    "DELETE FROM outbox WHERE id = ? AND payload = ?",
    item.id,
    item.payload,
  );
  return result.changes > 0;
}

export async function failItem(
  db: SQLiteDatabase,
  item: OutboxItem,
  message: string,
  options: { permanent?: boolean } = {},
) {
  const attempts = options.permanent ? MAX_ATTEMPTS : item.attempts + 1;

  await db.runAsync(
    "UPDATE outbox SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?",
    attempts,
    Date.now() + backoffDelay(attempts),
    message,
    item.id,
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

export async function discardDeadLetters(db: SQLiteDatabase) {
  await db.runAsync("DELETE FROM outbox WHERE attempts >= ?", MAX_ATTEMPTS);
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

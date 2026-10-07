import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { migrate } from "./migrations";

export const DATABASE_NAME = "journal.db";

let migrated: Promise<void> | null = null;
let dbPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Runs the schema migrations at most once per process, whichever path gets
 * there first: SQLiteProvider's `onInit` or `getDb()` from a headless sync.
 * Both handles share one native connection (same name, same options), so two
 * overlapping `migrate` calls would collide on BEGIN. A failure clears the
 * memo so the next caller retries.
 */
export function migrateOnce(db: SQLiteDatabase): Promise<void> {
  migrated ??= migrate(db).catch((error) => {
    migrated = null;
    throw error;
  });
  return migrated;
}

/**
 * A lazy handle for the callers that have no React tree: the sync engine and
 * the background task. Nothing is opened until the first sync actually runs,
 * so a cold launch that never touches the journal never opens its database.
 * Screens and hooks must use `useSQLiteContext()` instead.
 *
 * `enableChangeListener` is what makes `addDatabaseChangeListener` fire — and
 * matching SQLiteProvider's options is what lets both reuse one connection.
 */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME, {
        enableChangeListener: true,
      });
      await migrateOnce(db);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

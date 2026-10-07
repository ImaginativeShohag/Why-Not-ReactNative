import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { migrate } from "@/src/projects/podcast-player/db/schema";

/**
 * Module-scope database handle. The playback service and download manager
 * live outside React, so they can't use SQLiteProvider/useSQLiteContext —
 * everything goes through this lazily-opened singleton instead.
 */
export const DATABASE_NAME = "podcast-player.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await migrate(db);
      return db;
    })().catch((e) => {
      // Allow a retry on the next call instead of caching the failure forever.
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { migrate } from "./schema";

export const DATABASE_NAME = "fitness-tracker.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

/**
 * One shared connection for the UI *and* the background task. Not a
 * `<SQLiteProvider>`: the task runs with no React tree mounted at all, and
 * `addDatabaseChangeListener` only fires for writes made on the connection it
 * was enabled on — so the task and the UI must share it for live updates.
 */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME, {
        enableChangeListener: true,
      });
      await migrate(db);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

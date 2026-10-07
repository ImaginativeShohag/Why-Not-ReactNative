import type { SQLiteDatabase } from "expo-sqlite";

import { migrateOnce } from "./client";
import { seedOnce } from "./seed";

/** The `onInit` the project layout hands to SQLiteProvider: schema first, then furniture. */
export async function initDatabase(db: SQLiteDatabase) {
  await migrateOnce(db);
  await seedOnce(db);
}

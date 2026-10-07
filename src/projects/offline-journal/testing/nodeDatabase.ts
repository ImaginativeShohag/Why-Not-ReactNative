import type { SQLiteDatabase } from "expo-sqlite";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

/**
 * TEST-ONLY. Never import this from app code: `node:sqlite` does not exist in
 * the app runtime.
 *
 * The slice of expo-sqlite's async API the journal uses, backed by Node's
 * built-in SQLite (Node 22.5+, with FTS5 compiled in). The SQL under test is
 * the real SQL: migrations, FTS5 triggers, the outbox and the sync engine's
 * conflict rule all run against a real SQLite engine, in memory.
 */
export function openTestDatabase(): SQLiteDatabase {
  const db = new DatabaseSync(":memory:");

  // expo-sqlite takes bind params variadic or as one array; accept both.
  const bind = (params: unknown[]) =>
    (params.length === 1 && Array.isArray(params[0])
      ? params[0]
      : params) as SQLInputValue[];

  const adapter = {
    databasePath: ":memory:",
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, ...params: unknown[]) {
      const result = db.prepare(sql).run(...bind(params));
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    async getFirstAsync(sql: string, ...params: unknown[]) {
      const row = db.prepare(sql).get(...bind(params));
      return row ? { ...row } : null;
    },
    async getAllAsync(sql: string, ...params: unknown[]) {
      return db
        .prepare(sql)
        .all(...bind(params))
        .map((row) => ({ ...row }));
    },
    // Same contract as expo-sqlite's: not exclusive, rolls back on throw.
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec("BEGIN");
      try {
        await task();
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return adapter as unknown as SQLiteDatabase;
}

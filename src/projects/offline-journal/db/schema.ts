/**
 * Drizzle path — deliberately NOT taken.
 *
 * This project uses hand-written SQL (db/migrations.ts + db/queries/*) because
 * the version gate, the FTS5 triggers and the outbox transaction are the lesson,
 * and an ORM hides exactly those. drizzle-orm is not installed.
 *
 * If you want to try it later: `npx expo install drizzle-orm` and
 * `npm i -D drizzle-kit`, then declare the same table like this —
 *
 *   import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
 *
 *   export const entries = sqliteTable(
 *     "entries",
 *     {
 *       id: text("id").primaryKey(),
 *       title: text("title").notNull().default(""),
 *       body: text("body").notNull().default(""),
 *       mood: integer("mood"),
 *       createdAt: integer("created_at").notNull(),
 *       updatedAt: integer("updated_at").notNull(),
 *       deletedAt: integer("deleted_at"),
 *       remoteId: text("remote_id"),
 *       dirty: integer("dirty").notNull().default(1),
 *     },
 *     (table) => [index("idx_entries_timeline").on(table.createdAt)],
 *   );
 *
 * FTS5 virtual tables and triggers are not expressible in the schema DSL —
 * they stay raw SQL in a custom migration either way.
 */
export {};

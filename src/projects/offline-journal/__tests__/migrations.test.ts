/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { SQLiteDatabase } from "expo-sqlite";

import { MIGRATIONS, migrate, SCHEMA_VERSION } from "../db/migrations";
import { saveEntry, softDeleteEntry } from "../db/queries/entries";
import { searchEntries } from "../db/queries/search";
import { openTestDatabase } from "../testing/nodeDatabase";

// ulid() imports the native module; any bytes will do for these tests.
jest.mock("expo-crypto", () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const userVersion = async (db: SQLiteDatabase) =>
  (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
    ?.user_version;

const triggerSql = async (db: SQLiteDatabase, name: string) =>
  (
    await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ?",
      name,
    )
  )?.sql;

/** Every row write since the connection opened, trigger-driven FTS writes included. */
const totalChanges = async (db: SQLiteDatabase) =>
  (await db.getFirstAsync<{ n: number }>("SELECT total_changes() AS n"))?.n ??
  0;

const searchIds = async (db: SQLiteDatabase, text: string) =>
  (await searchEntries(db, { text })).map((hit) => hit.id);

/** Brings a database to exactly `version`, the way a device that stopped there has it. */
async function migrateTo(db: SQLiteDatabase, version: number) {
  for (let step = 1; step <= version; step++) {
    await db.execAsync(MIGRATIONS[step]);
    await db.execAsync(`PRAGMA user_version = ${step}`);
  }
}

describe("migration list", () => {
  it("has exactly one step per version, 1..SCHEMA_VERSION", () => {
    const steps = Object.keys(MIGRATIONS).map(Number);
    expect(steps).toEqual(
      Array.from({ length: SCHEMA_VERSION }, (_, i) => i + 1),
    );
  });
});

describe("migrate", () => {
  let db: SQLiteDatabase;
  beforeEach(() => {
    db = openTestDatabase();
  });

  it("takes a fresh database to SCHEMA_VERSION", async () => {
    await migrate(db);
    expect(await userVersion(db)).toBe(SCHEMA_VERSION);
  });

  it("is a no-op the second time", async () => {
    await migrate(db);
    await expect(migrate(db)).resolves.toBeUndefined();
    expect(await userVersion(db)).toBe(SCHEMA_VERSION);
  });

  it("upgrades a v3 device in place and keeps its rows searchable", async () => {
    await migrateTo(db, 3);
    expect(await triggerSql(db, "entries_au")).not.toMatch(/UPDATE OF/);
    const id = await saveEntry(db, {
      title: "Before upgrade",
      body: "written on v3",
      mood: null,
    });

    await migrate(db);

    expect(await userVersion(db)).toBe(SCHEMA_VERSION);
    expect(await triggerSql(db, "entries_au")).toMatch(
      /AFTER UPDATE OF title, body ON entries/,
    );
    expect(await searchIds(db, "upgrade")).toEqual([id]);
  });

  it("does not bump the version when a step fails", async () => {
    await migrateTo(db, 3);
    // A database that has drifted: the step's DROP TRIGGER now fails.
    await db.execAsync("DROP TRIGGER entries_au");

    await expect(migrate(db)).rejects.toThrow();
    expect(await userVersion(db)).toBe(3);
  });
});

describe("FTS triggers", () => {
  let db: SQLiteDatabase;
  beforeEach(async () => {
    db = openTestDatabase();
    await migrate(db);
  });

  it("indexes inserts and follows title/body edits", async () => {
    const id = await saveEntry(db, {
      title: "Morning walk",
      body: "quiet road",
      mood: 3,
    });
    expect(await searchIds(db, "walk")).toEqual([id]);

    await saveEntry(db, {
      id,
      title: "Evening run",
      body: "loud road",
      mood: 3,
    });

    expect(await searchIds(db, "walk")).toEqual([]);
    expect(await searchIds(db, "run")).toEqual([id]);
    expect(await searchIds(db, "loud")).toEqual([id]);
  });

  it("leaves the index alone when only bookkeeping columns change", async () => {
    const id = await saveEntry(db, {
      title: "Synced",
      body: "row",
      mood: null,
    });

    // What markDone and a pull do to a row whose text did not change.
    const before = await totalChanges(db);
    await db.runAsync(
      "UPDATE entries SET dirty = 0, remote_id = id WHERE id = ?",
      id,
    );
    // One row changed, nothing else: with AFTER UPDATE (no OF) the trigger's
    // FTS delete + insert would add their own index writes here.
    expect((await totalChanges(db)) - before).toBe(1);
    expect(await searchIds(db, "synced")).toEqual([id]);
  });

  it("keeps soft-deleted rows out of results via the query, not the index", async () => {
    const id = await saveEntry(db, { title: "Gone", body: "soon", mood: null });
    await softDeleteEntry(db, id);
    expect(await searchIds(db, "gone")).toEqual([]);
    // The index still holds the row: the JOIN's `deleted_at IS NULL` hides it.
    const row = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM entries_fts WHERE entries_fts MATCH 'gone'",
    );
    expect(row?.n).toBe(1);
  });

  it("stays consistent with entries after many edits", async () => {
    const id = await saveEntry(db, { title: "v0", body: "", mood: null });
    for (let i = 1; i <= 5; i++)
      await saveEntry(db, { id, title: `v${i}`, body: "draft", mood: null });
    await db.runAsync("UPDATE entries SET dirty = 0 WHERE id = ?", id);

    // FTS5's own check: the index must match what external content holds.
    await expect(
      db.execAsync(
        "INSERT INTO entries_fts (entries_fts) VALUES ('integrity-check')",
      ),
    ).resolves.toBeUndefined();
    expect(await searchIds(db, "v5")).toEqual([id]);
  });
});

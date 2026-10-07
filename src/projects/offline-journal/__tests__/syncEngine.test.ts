/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { SQLiteDatabase } from "expo-sqlite";

import { migrate } from "../db/migrations";
import { saveEntry, softDeleteEntry } from "../db/queries/entries";
import { MAX_ATTEMPTS } from "../db/queries/outbox";
import type { SyncSettings } from "../stores/settingsStore";
import type { HttpResponse } from "../sync/http";
import { kick, LAST_ERROR_KEY } from "../sync/syncEngine";
import { openTestDatabase } from "../testing/nodeDatabase";

/*
 * The engine runs for real against a real SQLite (node:sqlite, in memory) with
 * the real migrations, outbox queries and conflict SQL. Only its edges are
 * replaced: the db handle, the HTTP transport, the network probe and the
 * persisted settings — the four things that need a device.
 */

type Call = { method: string; path: string; body?: string; key?: string };
type Handler = (call: Call) => HttpResponse | Promise<HttpResponse>;

const mockState: {
  db: SQLiteDatabase | null;
  settings: SyncSettings;
  network: { isConnected?: boolean; isInternetReachable?: boolean };
  handler: Handler;
  calls: Call[];
} = {
  db: null,
  settings: {} as SyncSettings,
  network: {},
  handler: () => respond(200),
  calls: [],
};

jest.mock("expo-crypto", () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));
jest.mock("expo-network", () => ({
  getNetworkStateAsync: async () => mockState.network,
}));
jest.mock("../db/client", () => ({
  getDb: async () => mockState.db,
}));
jest.mock("../stores/settingsStore", () => ({
  ensureSettingsHydrated: async () => ({ sync: mockState.settings }),
}));
jest.mock("../sync/http", () => ({
  request: async (
    _settings: unknown,
    path: string,
    init: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
    } = {},
  ) => {
    const call = {
      method: init.method ?? "GET",
      path,
      body: init.body,
      key: init.headers?.["idempotency-key"],
    };
    mockState.calls.push(call);
    return mockState.handler(call);
  },
}));

function respond(status: number, json: unknown = {}): HttpResponse {
  return { status, ok: status >= 200 && status < 300, json: async () => json };
}

/** An empty pull, then whatever `push` says for every PUT/DELETE. */
const server =
  (push: (call: Call) => HttpResponse | Promise<HttpResponse>): Handler =>
  (call) =>
    call.method === "GET"
      ? respond(200, { entries: [], serverTime: 1_000 })
      : push(call);

const pushes = () => mockState.calls.filter((call) => call.method !== "GET");

const outbox = (db: SQLiteDatabase) =>
  db.getAllAsync<{
    op: string;
    entity_id: string;
    payload: string;
    attempts: number;
    next_attempt_at: number;
  }>("SELECT op, entity_id, payload, attempts, next_attempt_at FROM outbox");

const entry = (db: SQLiteDatabase, id: string) =>
  db.getFirstAsync<{
    title: string;
    body: string;
    dirty: number;
    remote_id: string | null;
    updated_at: number;
  }>(
    "SELECT title, body, dirty, remote_id, updated_at FROM entries WHERE id = ?",
    id,
  );

let db: SQLiteDatabase;

beforeEach(async () => {
  db = openTestDatabase();
  await migrate(db);
  mockState.db = db;
  mockState.settings = {
    enabled: true,
    baseUrl: "http://sync.test",
    latencyMs: 0,
    failureRate: 0,
  };
  mockState.network = { isConnected: true, isInternetReachable: true };
  mockState.handler = server(() => respond(200));
  mockState.calls = [];
});

describe("preconditions", () => {
  it("does nothing when sync is off", async () => {
    mockState.settings.enabled = false;
    await saveEntry(db, { title: "a", body: "", mood: null });

    expect(await kick()).toMatchObject({ skipped: "disabled" });
    expect(mockState.calls).toEqual([]);
  });

  it("skips without burning a retry when the device knows it is offline", async () => {
    mockState.network = { isConnected: true, isInternetReachable: false };
    await saveEntry(db, { title: "a", body: "", mood: null });

    expect(await kick()).toMatchObject({ skipped: "offline" });
    expect(mockState.calls).toEqual([]);
    expect((await outbox(db))[0].attempts).toBe(0);
  });
});

describe("push", () => {
  it("PUTs on the client id, then clears the outbox and the dirty flag", async () => {
    const id = await saveEntry(db, { title: "Hello", body: "x", mood: 2 });

    expect(await kick()).toMatchObject({ pushed: 1, failed: 0 });

    const [put] = pushes();
    expect(put.method).toBe("PUT");
    expect(put.path).toBe(`/entries/${id}`);
    expect(put.key).toMatch(new RegExp(`^${id}:\\d+$`));
    expect(JSON.parse(put.body ?? "")).toMatchObject({ id, title: "Hello" });
    expect(await outbox(db)).toEqual([]);
    expect(await entry(db, id)).toMatchObject({ dirty: 0, remote_id: id });
  });

  it("sends a soft delete as a bodyless DELETE", async () => {
    const id = await saveEntry(db, { title: "a", body: "", mood: null });
    await kick();
    mockState.calls = [];
    await softDeleteEntry(db, id);

    await kick();

    expect(pushes()).toEqual([
      expect.objectContaining({ method: "DELETE", body: undefined }),
    ]);
  });

  it("keeps an edit made while its request was in flight", async () => {
    const id = await saveEntry(db, { title: "v1", body: "", mood: null });
    let editedMidFlight = false;
    mockState.handler = server(async () => {
      if (!editedMidFlight) {
        editedMidFlight = true;
        // Autosave lands now. The item has attempts = 0, so this folds into it.
        await saveEntry(db, { id, title: "v2", body: "", mood: null });
      }
      return respond(200);
    });

    await kick();

    // The server got v1, but the outbox row now holds v2: it must survive,
    // and the entry must stay dirty so a pull cannot overwrite v2.
    const queued = await outbox(db);
    expect(queued).toHaveLength(1);
    expect(JSON.parse(queued[0].payload)).toMatchObject({ title: "v2" });
    expect(await entry(db, id)).toMatchObject({ title: "v2", dirty: 1 });

    await kick();
    expect(JSON.parse(pushes().at(-1)?.body ?? "")).toMatchObject({
      title: "v2",
    });
    expect(await outbox(db)).toEqual([]);
    expect(await entry(db, id)).toMatchObject({ dirty: 0 });
  });

  it("backs off on 5xx and dead-letters a 4xx", async () => {
    const flaky = await saveEntry(db, { title: "flaky", body: "", mood: null });
    const rejected = await saveEntry(db, {
      title: "bad",
      body: "",
      mood: null,
    });
    mockState.handler = server((call) =>
      respond(call.path.endsWith(flaky) ? 503 : 422),
    );
    const before = Date.now();

    expect(await kick()).toMatchObject({ pushed: 0, failed: 2 });

    const rows = await outbox(db);
    const row = (id: string) => rows.find((r) => r.entity_id === id);
    expect(row(flaky)).toMatchObject({ attempts: 1 });
    expect(row(flaky)?.next_attempt_at).toBeGreaterThan(before);
    expect(row(rejected)).toMatchObject({ attempts: MAX_ATTEMPTS });
    expect(await entry(db, flaky)).toMatchObject({ dirty: 1 });
  });

  it("does not retry an item inside its backoff window", async () => {
    await saveEntry(db, { title: "a", body: "", mood: null });
    mockState.handler = server(() => respond(503));
    await kick();
    mockState.calls = [];

    expect(await kick()).toMatchObject({ pushed: 0, failed: 0 });
    expect(pushes()).toEqual([]);
  });

  it("treats a thrown request as a retry, not a crash", async () => {
    await saveEntry(db, { title: "a", body: "", mood: null });
    mockState.handler = server(() => {
      throw new Error("Network request failed");
    });

    expect(await kick()).toMatchObject({ failed: 1 });
    expect((await outbox(db))[0]).toMatchObject({ attempts: 1 });
  });
});

describe("pull", () => {
  const remote = (id: string, title: string, updatedAt: number) => ({
    id,
    title,
    body: "",
    mood: null,
    created_at: 1,
    updated_at: updatedAt,
    deleted_at: null,
    tags: ["remote"],
  });

  /** A local row that is already synced (dirty = 0) at a known updated_at. */
  async function cleanRow(title: string, updatedAt: number) {
    const id = await saveEntry(db, { title, body: "", mood: null });
    await db.runAsync(
      "UPDATE entries SET dirty = 0, updated_at = ? WHERE id = ?",
      updatedAt,
      id,
    );
    await db.runAsync("DELETE FROM outbox");
    return id;
  }

  const tagsOf = async (id: string) =>
    (
      await db.getAllAsync<{ name: string }>(
        `SELECT t.name FROM tags t JOIN entry_tags et ON et.tag_id = t.id
         WHERE et.entry_id = ?`,
        id,
      )
    ).map((row) => row.name);

  it("applies last-write-wins and never clobbers unsent local edits", async () => {
    const older = await cleanRow("local old", 100);
    const newer = await cleanRow("local new", 900);
    const dirty = await saveEntry(db, {
      title: "unsent",
      body: "",
      mood: null,
    });
    mockState.handler = (call) =>
      call.method === "GET"
        ? respond(200, {
            entries: [
              remote(older, "remote wins", 500),
              remote(newer, "remote loses", 500),
              remote(dirty, "remote loses too", Date.now() + 60_000),
              remote("01REMOTEONLY0000000000000", "brand new", 500),
            ],
            serverTime: 4_242,
          })
        : respond(200);

    expect(await kick()).toMatchObject({ pulled: 4 });

    expect(await entry(db, older)).toMatchObject({ title: "remote wins" });
    expect(await tagsOf(older)).toEqual(["remote"]);
    expect(await entry(db, newer)).toMatchObject({ title: "local new" });
    expect(await tagsOf(newer)).toEqual([]);
    expect(await entry(db, dirty)).toMatchObject({ title: "unsent" });
    expect(await entry(db, "01REMOTEONLY0000000000000")).toMatchObject({
      title: "brand new",
      dirty: 0,
    });
    // Pull runs before push, so the unsent edit still went out afterwards.
    expect(pushes()).toEqual([
      expect.objectContaining({ path: `/entries/${dirty}` }),
    ]);
  });

  it("resumes from the server's cursor", async () => {
    mockState.handler = (call) =>
      call.method === "GET"
        ? respond(200, { entries: [], serverTime: 4_242 })
        : respond(200);
    await kick();
    await kick();

    const gets = mockState.calls.filter((call) => call.method === "GET");
    expect(gets.map((call) => call.path)).toEqual([
      "/entries?since=0",
      "/entries?since=4242",
    ]);
  });

  it("records a failed pull and leaves the outbox untouched", async () => {
    await saveEntry(db, { title: "a", body: "", mood: null });
    mockState.handler = () => respond(500);

    const result = await kick();

    expect(result.error).toMatch(/pull failed: HTTP 500/);
    expect(pushes()).toEqual([]);
    expect((await outbox(db))[0]).toMatchObject({ attempts: 0 });
    const meta = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_meta WHERE key = ?",
      LAST_ERROR_KEY,
    );
    expect(meta?.value).toMatch(/HTTP 500/);
  });
});

describe("run-lock", () => {
  it("shares one run between overlapping kicks and runs exactly one follow-up", async () => {
    const first = kick();
    const second = kick();
    const third = kick();
    expect(second).toBe(first);
    expect(third).toBe(first);

    await first;
    // The follow-up starts in `finally`; let it drain (no timers involved).
    await new Promise((resolve) => setTimeout(resolve, 0));

    const gets = mockState.calls.filter((call) => call.method === "GET");
    expect(gets).toHaveLength(2);
  });
});

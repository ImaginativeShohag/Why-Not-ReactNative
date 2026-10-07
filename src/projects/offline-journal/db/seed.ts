import type { SQLiteDatabase } from "expo-sqlite";

import { DAY_MS } from "../utils/date";
import { ulid } from "../utils/id";
import { getMeta, setMeta } from "./queries/outbox";
import { writeTags } from "./queries/tags";

const TITLES = [
  "Morning walk",
  "Standup notes",
  "Late night",
  "Outbox notes",
  "Weekend plan",
  "Reading",
];

const BODIES = [
  "Cool air, quiet road. Thought about the sync design while walking.",
  "Blocked on the API again. Wrote down what I would do with no network at all.",
  "Long day. Two lines is enough.",
  "The sync loop needs a run-lock, otherwise two triggers push the same row twice.",
  "Groceries, laundry, and one long walk without the phone.",
  "Finished the chapter on write-ahead logging. Readers never block the writer.",
];

const TAGS = [
  ["health", "calm"],
  ["work"],
  [],
  ["work", "sync"],
  ["home"],
  ["books"],
];

const SEEDED_KEY = "seeded_at";

/**
 * Inserts `count` fake entries spread over the last `count` days. Rows are
 * written with dirty = 0 and no outbox rows: seeds are local furniture, not user
 * edits, and must never flood the sync queue.
 */
export async function seedEntries(db: SQLiteDatabase, count = 30) {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < count; i++) {
      const createdAt =
        now - i * DAY_MS - Math.floor(Math.random() * DAY_MS * 0.5);
      const id = ulid(createdAt);
      const pick = i % TITLES.length;
      await db.runAsync(
        `INSERT INTO entries (id, title, body, mood, created_at, updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        id,
        TITLES[pick],
        BODIES[pick],
        (i % 5) + 1,
        createdAt,
        createdAt,
      );
      await writeTags(db, id, TAGS[pick]);
    }
  });
  return count;
}

/**
 * First launch only. Gated on a sync_meta flag rather than "is the table
 * empty?" — otherwise a user who deletes everything gets the fake entries back
 * on the next cold start.
 */
export async function seedOnce(db: SQLiteDatabase, count = 30) {
  if (await getMeta(db, SEEDED_KEY)) return 0;
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM entries",
  );
  const inserted = (row?.n ?? 0) > 0 ? 0 : await seedEntries(db, count);
  await setMeta(db, SEEDED_KEY, String(Date.now()));
  return inserted;
}

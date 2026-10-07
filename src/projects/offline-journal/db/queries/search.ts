import type { SQLiteDatabase } from "expo-sqlite";

import type { Mood, SearchHit } from "../../models/Entry";
import { MATCH_END, MATCH_START } from "../../utils/text";

/**
 * FTS5 MATCH takes a query *language*, not a plain string — a stray quote or a
 * bare `-` is a syntax error. Quote every term and append `*` for prefix search.
 */
export function toMatchQuery(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word.replace(/"/g, '""')}"*`)
    .join(" ");
}

export type SearchFilters = {
  text: string;
  mood?: Mood | null;
  tag?: string | null;
  limit?: number;
};

type HitRow = {
  id: string;
  created_at: number;
  title: string;
  excerpt: string;
  mood: Mood | null;
};

const toHit = (row: HitRow): SearchHit => ({
  id: row.id,
  createdAt: new Date(row.created_at),
  title: row.title,
  excerpt: row.excerpt,
  mood: row.mood,
});

/** Extra WHERE clauses shared by the FTS and the filter-only paths. */
function filterClauses({ mood, tag }: SearchFilters) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (mood) {
    clauses.push("AND e.mood = ?");
    params.push(mood);
  }
  if (tag) {
    clauses.push(`AND EXISTS (
      SELECT 1 FROM entry_tags et JOIN tags t ON t.id = et.tag_id
      WHERE et.entry_id = e.id AND t.name = ?)`);
    params.push(tag);
  }
  return { sql: clauses.join("\n"), params };
}

/**
 * Text goes through FTS5 and is ranked by bm25; with no text but a filter set,
 * it degrades to a plain filtered listing. No text and no filter: no results
 * (the screen shows its "type to search" empty state).
 */
export async function searchEntries(
  db: SQLiteDatabase,
  filters: SearchFilters,
): Promise<SearchHit[]> {
  const limit = filters.limit ?? 50;
  const match = toMatchQuery(filters.text);
  const extra = filterClauses(filters);

  if (!match) {
    if (!filters.mood && !filters.tag) return [];
    const rows = await db.getAllAsync<HitRow>(
      `SELECT e.id, e.created_at, e.title, e.mood,
              substr(e.body, 1, 120) AS excerpt
       FROM entries e
       WHERE e.deleted_at IS NULL
       ${extra.sql}
       ORDER BY e.created_at DESC
       LIMIT ?`,
      [...extra.params, limit],
    );
    return rows.map(toHit);
  }

  const rows = await db.getAllAsync<HitRow>(
    `SELECT e.id,
            e.created_at,
            e.title,
            e.mood,
            snippet(entries_fts, 1, ?, ?, '…', 12) AS excerpt
     FROM entries_fts f
     JOIN entries e ON e.rowid = f.rowid
     WHERE entries_fts MATCH ?
       AND e.deleted_at IS NULL
     ${extra.sql}
     ORDER BY bm25(entries_fts, 2.0, 1.0)   -- title weighted 2x over body
     LIMIT ?`,
    [MATCH_START, MATCH_END, match, ...extra.params, limit],
  );
  return rows.map(toHit);
}

/** The comparison to run once, then never use again. */
export async function searchEntriesSlowly(
  db: SQLiteDatabase,
  input: string,
  limit = 50,
) {
  return db.getAllAsync<HitRow>(
    `SELECT id, created_at, title, mood, substr(body, 1, 120) AS excerpt
     FROM entries
     WHERE deleted_at IS NULL AND (title LIKE ? OR body LIKE ?)
     ORDER BY created_at DESC
     LIMIT ?`,
    `%${input}%`,
    `%${input}%`,
    limit,
  );
}

/**
 * Times both paths over the same data. FTS stays flat as the table grows;
 * LIKE '%x%' is a full scan per keystroke. Run it over a few thousand seeded
 * entries and write the two numbers down.
 */
export async function benchmarkSearch(
  db: SQLiteDatabase,
  input: string,
  runs = 5,
) {
  const time = async (fn: () => Promise<unknown>) => {
    const start = performance.now();
    for (let i = 0; i < runs; i++) await fn();
    return (performance.now() - start) / runs;
  };

  const ftsMs = await time(() => searchEntries(db, { text: input }));
  const likeMs = await time(() => searchEntriesSlowly(db, input));
  const rows = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM entries",
  );
  return { ftsMs, likeMs, rows: rows?.n ?? 0 };
}

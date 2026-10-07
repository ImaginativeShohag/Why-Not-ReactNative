export type Mood = 1 | 2 | 3 | 4 | 5;

/** Exactly what SQLite hands back: snake_case, integers for dates and booleans. */
export type EntryRow = {
  id: string;
  title: string;
  body: string;
  mood: Mood | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  remote_id: string | null;
  dirty: 0 | 1;
};

/** What the UI consumes. Map row -> Entry once, at the query boundary. */
export type Entry = {
  id: string;
  title: string;
  body: string;
  mood: Mood | null;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  attachmentCount: number;
};

export type OutboxOp = "create" | "update" | "delete";

export type OutboxItem = {
  id: number;
  op: OutboxOp;
  entity: "entry";
  entity_id: string;
  payload: string;
  attempts: number;
};

/** An attachment as the UI sees it: URIs already resolved against the document dir. */
export type Attachment = {
  id: string;
  entryId: string;
  uri: string;
  thumbUri: string | null;
  blurhash: string | null;
  mime: string;
  width: number | null;
  height: number | null;
};

export type SearchHit = {
  id: string;
  createdAt: Date;
  title: string;
  /** FTS snippet, matches wrapped in MATCH_START / MATCH_END markers. */
  excerpt: string;
  mood: Mood | null;
};

export type TagCount = { name: string; count: number };

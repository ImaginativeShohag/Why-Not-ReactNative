import type { Entry, Mood } from "../models/Entry";

/**
 * Pure formatters for export. Kept apart from `export.ts` (which touches the
 * filesystem and share sheet) so they can be unit-tested without native modules.
 */

/** Picker and filter order: happiest first. */
export const MOODS: Mood[] = [5, 4, 3, 2, 1];

export const MOOD_FACES: Record<Mood, string> = {
  1: "😢",
  2: "🙁",
  3: "😐",
  4: "🙂",
  5: "😄",
};

export function toMarkdown(entry: Entry) {
  const tags = entry.tags.map((tag) => `#${tag}`).join(" ");
  const lines = [
    `## ${entry.title || "Untitled"}`,
    `*${entry.createdAt.toLocaleString()}*${entry.mood ? ` · mood ${entry.mood}/5` : ""}`,
    "",
    entry.body,
  ];
  if (tags) lines.push("", tags);
  return lines.join("\n").trimEnd();
}

export function toMarkdownDocument(entries: Entry[]) {
  return [
    "# Journal export",
    "",
    ...entries.map(toMarkdown).join("\n\n---\n\n").split("\n"),
  ].join("\n");
}

/** ISO dates instead of Date objects so the file round-trips through any tool. */
export function toJson(entries: Entry[]) {
  return JSON.stringify(
    entries.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
    null,
    2,
  );
}

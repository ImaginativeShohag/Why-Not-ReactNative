/**
 * Tag names are stored normalised so "#Work", "work " and "WORK" are one tag.
 * Returns "" for input that has nothing left after cleaning — callers drop it.
 */
export function normalizeTag(input: string): string {
  return input
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s,]+/g, "-") // commas would break GROUP_CONCAT splitting
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/** Normalise, drop empties and de-duplicate while keeping first-seen order. */
export function normalizeTags(inputs: string[]): string[] {
  return [...new Set(inputs.map(normalizeTag).filter(Boolean))];
}

export type HighlightPart = { text: string; match: boolean };

/** Markers the search query asks FTS5 `snippet()` to wrap matches in. */
export const MATCH_START = "\u0002";
export const MATCH_END = "\u0003";

/**
 * Splits an FTS snippet into plain and highlighted runs. Control characters are
 * used as markers instead of `[`/`]` so real brackets in an entry never get
 * mistaken for a match.
 */
export function splitHighlights(snippet: string): HighlightPart[] {
  const parts: HighlightPart[] = [];
  let rest = snippet;

  while (rest.length > 0) {
    const start = rest.indexOf(MATCH_START);
    if (start === -1) {
      parts.push({ text: rest, match: false });
      break;
    }
    if (start > 0) parts.push({ text: rest.slice(0, start), match: false });

    const end = rest.indexOf(MATCH_END, start + 1);
    const stop = end === -1 ? rest.length : end;
    const text = rest.slice(start + 1, stop);
    if (text) parts.push({ text, match: true });
    rest = end === -1 ? "" : rest.slice(end + 1);
  }

  return parts;
}

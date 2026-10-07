import type { Chapter } from "@/src/projects/podcast-player/models/Episode";
import { parseTimestamp } from "@/src/projects/podcast-player/utils/format";

/**
 * Show notes arrive as arbitrary publisher HTML. We never render it raw: the
 * list/text renderer gets plain text, and the WebView renderer gets a copy
 * with scripts, handlers, iframes and non-http links removed.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  copy: "©",
  reg: "®",
  trade: "™",
  bull: "•",
};

export function decodeEntities(input: string): string {
  return input.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, body: string) => {
      if (body[0] === "#") {
        const code =
          body[1] === "x" || body[1] === "X"
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff)
          return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    },
  );
}

const DANGEROUS_BLOCKS =
  /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi;

/** HTML → readable plain text with paragraph breaks preserved. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const text = html
    .replace(DANGEROUS_BLOCKS, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type NoteLink = { text: string; url: string };

/** Pulls http(s) anchors out of notes so the text renderer can list them. */
export function extractLinks(html: string | null | undefined): NoteLink[] {
  if (!html) return [];
  const links: NoteLink[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = decodeEntities(m[2].trim());
    if (!isSafeUrl(url) || seen.has(url)) continue;
    seen.add(url);
    links.push({ url, text: htmlToText(m[3]) || url });
  }
  return links;
}

export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Sanitized HTML for a WebView: no scripts, handlers, frames or js: links. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(DANGEROUS_BLOCKS, "")
    .replace(
      /<\/?(script|style|iframe|object|embed|link|meta|form|input|button)\b[^>]*>/gi,
      "",
    )
    .replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*(?!https?:|#|\/\/)[^"']*\2/gi, "");
}

/**
 * Many shows put chapters in the notes as "09:30 Update channels" lines.
 * Used as a fallback when the feed has no podcast:chapters document.
 */
export function chaptersFromNotes(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(
      /^\s*[•\-*(\[]?\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[)\]]?\s*[-–—:]?\s*(.+)$/,
    );
    if (!m) continue;
    const start = parseTimestamp(m[1]);
    if (start == null) continue;
    chapters.push({ start, title: m[2].trim() });
  }
  // Only trust it if it looks like a real chapter list: ≥2 entries, ascending.
  if (chapters.length < 2) return [];
  for (let i = 1; i < chapters.length; i++) {
    if (chapters[i].start <= chapters[i - 1].start) return [];
  }
  return chapters;
}

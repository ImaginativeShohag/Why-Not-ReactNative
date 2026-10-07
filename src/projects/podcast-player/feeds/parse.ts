import { XMLParser } from "fast-xml-parser";

import type {
  Chapter,
  Episode,
  Podcast,
} from "@/src/projects/podcast-player/models/Episode";
import {
  hashString,
  parseDuration,
  parseTimestamp,
} from "@/src/projects/podcast-player/utils/format";
import {
  chaptersFromNotes,
  decodeEntities,
  htmlToText,
} from "@/src/projects/podcast-player/utils/html";

/**
 * RSS/Atom → typed show + episodes. Pure: no I/O, no RN imports, so it runs in
 * Jest and could move to a worklet/worker unchanged. Every field access is
 * defensive because real feeds are wildly inconsistent.
 */

export type ParsedFeed = {
  podcast: Omit<Podcast, "id" | "subscribed" | "lastRefreshedAt">;
  episodes: Omit<Episode, "podcastId" | "id">[];
};

export class FeedParseError extends Error {}

// Tags that may legally appear once or many times; forcing arrays removes a
// whole class of "works for one feed, crashes on another" bugs.
const ARRAY_TAGS = new Set([
  "item",
  "entry",
  "category",
  "itunes:category",
  "enclosure",
  "link",
  "psc:chapter",
  "media:content",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  // Keep everything as strings: "0042" episode numbers and "1:02" durations
  // must not be coerced to numbers.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (tagName) => ARRAY_TAGS.has(tagName),
});

type Node = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Text content of a node that may be a string, a {#text} object or an array. */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return textOf(value[0]);
  if (typeof value === "object") return textOf((value as Node)["#text"]);
  return "";
}

function attr(value: unknown, name: string): string {
  const node = Array.isArray(value) ? value[0] : value;
  if (node && typeof node === "object") {
    const v = (node as Node)[`@_${name}`];
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  }
  return "";
}

function toInt(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDate(value: string): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isFinite(t)) return t;
  // Some feeds use "Tue, 5 Mar 2024 10:00:00 PST"-ish zones Date can't read.
  const stripped = value.replace(/\s+[A-Z]{2,5}$/, " GMT");
  const t2 = Date.parse(stripped);
  return Number.isFinite(t2) ? t2 : null;
}

function normalizeUrl(url: string): string {
  const trimmed = decodeEntities(url.trim());
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|mp4)(\?|#|$)/i;

type AudioPick = { url: string; type: string | null; length: number | null };

/**
 * Finds the playable audio for an item. Handles: multiple enclosures (prefer
 * audio/*), enclosures with no type, media:content instead of enclosure, and
 * Atom <link rel="enclosure">.
 */
function pickAudio(item: Node): AudioPick | null {
  const candidates: AudioPick[] = [];

  for (const enc of asArray(item.enclosure as Node | Node[])) {
    const url = normalizeUrl(attr(enc, "url") || attr(enc, "href"));
    if (!url) continue;
    candidates.push({
      url,
      type: attr(enc, "type") || null,
      length: toInt(attr(enc, "length")),
    });
  }
  for (const media of asArray(item["media:content"] as Node | Node[])) {
    const url = normalizeUrl(attr(media, "url"));
    if (!url) continue;
    candidates.push({
      url,
      type: attr(media, "type") || null,
      length: toInt(attr(media, "fileSize")),
    });
  }
  for (const link of asArray(item.link as unknown[])) {
    if (attr(link, "rel") === "enclosure") {
      const url = normalizeUrl(attr(link, "href"));
      if (url) {
        candidates.push({
          url,
          type: attr(link, "type") || null,
          length: toInt(attr(link, "length")),
        });
      }
    }
  }

  // A declared type wins; the extension is only a hint when type is missing
  // (".mp4" can be audio-only, but not when the feed says video/mp4).
  const isAudio = (c: AudioPick) =>
    c.type ? /^audio\//i.test(c.type) : AUDIO_EXT.test(c.url);
  const isVideo = (c: AudioPick) => (c.type ? /^video\//i.test(c.type) : false);

  return (
    candidates.find(isAudio) ??
    candidates.find((c) => !isVideo(c) && /^https?:/i.test(c.url)) ??
    candidates.find((c) => /^https?:/i.test(c.url)) ??
    null
  );
}

function pickImage(node: Node): string | null {
  const itunes = attr(node["itunes:image"], "href");
  if (itunes) return normalizeUrl(itunes);
  const image = node.image as Node | undefined;
  if (image && typeof image === "object") {
    const url = textOf(image.url);
    if (url) return normalizeUrl(url);
  }
  const media = attr(node["media:thumbnail"], "url");
  return media ? normalizeUrl(media) : null;
}

function inlineChapters(item: Node): Chapter[] {
  const container = item["psc:chapters"] as Node | undefined;
  if (!container || typeof container !== "object") return [];
  const out: Chapter[] = [];
  for (const ch of asArray(container["psc:chapter"] as Node | Node[])) {
    const startRaw = attr(ch, "start");
    const start =
      parseTimestamp(startRaw.split(".")[0]) ?? parseDuration(startRaw);
    const title = attr(ch, "title");
    if (start == null || !title) continue;
    out.push({ start, title, url: attr(ch, "href") || undefined });
  }
  return out.sort((a, b) => a.start - b.start);
}

function categoriesOf(channel: Node): string[] {
  const names = new Set<string>();
  const visit = (cat: unknown) => {
    const text = attr(cat, "text") || textOf(cat);
    if (text) names.add(decodeEntities(text));
    if (cat && typeof cat === "object") {
      for (const sub of asArray((cat as Node)["itunes:category"] as unknown[]))
        visit(sub);
    }
  };
  for (const cat of asArray(channel["itunes:category"] as unknown[]))
    visit(cat);
  for (const cat of asArray(channel.category as unknown[])) visit(cat);
  return [...names].slice(0, 6);
}

function linkOf(node: Node): string | null {
  for (const link of asArray(node.link as unknown[])) {
    const text = textOf(link);
    if (text && /^https?:/i.test(text)) return text;
    const href = attr(link, "href");
    const rel = attr(link, "rel");
    if (href && (!rel || rel === "alternate")) return href;
  }
  return null;
}

export function parseFeed(xml: string, feedUrl: string): ParsedFeed {
  if (!xml || typeof xml !== "string") {
    throw new FeedParseError("Empty feed");
  }
  // A leading BOM or whitespace before the XML declaration trips some parsers.
  const source = xml.replace(/^﻿/, "").trimStart();

  let doc: Node;
  try {
    doc = parser.parse(source) as Node;
  } catch (e) {
    throw new FeedParseError(`Invalid XML: ${(e as Error).message}`);
  }

  const rss = doc.rss as Node | undefined;
  const channel = (rss?.channel ?? (doc as Node)["rdf:RDF"] ?? doc.feed) as
    Node | Node[] | undefined;
  const ch = (Array.isArray(channel) ? channel[0] : channel) as
    Node | undefined;
  if (!ch || typeof ch !== "object") {
    throw new FeedParseError("Not an RSS or Atom feed");
  }

  const channelArtwork = pickImage(ch);
  const descriptionHtml =
    textOf(ch.description) ||
    textOf(ch["itunes:summary"]) ||
    textOf(ch.subtitle);

  const podcast: ParsedFeed["podcast"] = {
    feedUrl,
    title: decodeEntities(textOf(ch.title)) || "Untitled podcast",
    author:
      decodeEntities(
        textOf(ch["itunes:author"]) ||
          textOf((ch["itunes:owner"] as Node | undefined)?.["itunes:name"]) ||
          textOf((ch.author as Node | undefined)?.name) ||
          textOf(ch.author),
      ) || "",
    description: htmlToText(descriptionHtml),
    artworkUrl: channelArtwork,
    link: linkOf(ch),
    categories: categoriesOf(ch),
  };

  const items = [
    ...asArray(ch.item as Node | Node[]),
    ...asArray(ch.entry as Node | Node[]),
    // RSS 1.0 puts items beside the channel, not inside it.
    ...asArray((doc["rdf:RDF"] as Node | undefined)?.item as Node | Node[]),
  ];

  const episodes: ParsedFeed["episodes"] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const audio = pickAudio(item);
    if (!audio) continue; // text-only posts in mixed feeds

    const title = decodeEntities(
      textOf(item.title) || textOf(item["itunes:title"]),
    );
    const pubRaw =
      textOf(item.pubDate) ||
      textOf(item.published) ||
      textOf(item.updated) ||
      textOf(item["dc:date"]);
    const publishedAt = parseDate(pubRaw);

    // guid is the dedupe key; fall back through progressively weaker identities.
    const guid =
      textOf(item.guid) || textOf(item.id) || audio.url || `${title}|${pubRaw}`;
    if (seen.has(guid)) continue;
    seen.add(guid);

    const notesHtml =
      textOf(item["content:encoded"]) ||
      textOf(item.description) ||
      textOf(item["itunes:summary"]) ||
      textOf(item.summary) ||
      textOf(item.content);
    const notes = htmlToText(notesHtml);

    const inline = inlineChapters(item);
    const chaptersUrl = attr(item["podcast:chapters"], "url") || null;

    episodes.push({
      guid,
      title: title || "Untitled episode",
      notes,
      notesHtml,
      audioUrl: audio.url,
      mimeType: audio.type,
      enclosureLength: audio.length && audio.length > 0 ? audio.length : null,
      duration: parseDuration(textOf(item["itunes:duration"])),
      publishedAt,
      artworkUrl: pickImage(item) ?? channelArtwork,
      season: toInt(textOf(item["itunes:season"])),
      episodeNumber: toInt(textOf(item["itunes:episode"])),
      chapters:
        inline.length > 0
          ? inline
          : chaptersUrl
            ? []
            : chaptersFromNotes(notes),
      chaptersUrl: chaptersUrl ? normalizeUrl(chaptersUrl) : null,
    });
  }

  // Newest first regardless of feed order; undated items sink to the bottom.
  episodes.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  return { podcast, episodes };
}

/** podcast:chapters JSON (https://github.com/Podcastindex-org/podcast-namespace). */
export function parseChaptersJson(json: unknown): Chapter[] {
  if (!json || typeof json !== "object") return [];
  const list = (json as { chapters?: unknown }).chapters;
  if (!Array.isArray(list)) return [];
  const out: Chapter[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as {
      startTime?: unknown;
      title?: unknown;
      url?: unknown;
      toc?: unknown;
    };
    if (c.toc === false) continue; // silent chapters (e.g. ad markers)
    const start =
      typeof c.startTime === "number"
        ? c.startTime
        : parseFloat(String(c.startTime));
    if (!Number.isFinite(start) || start < 0) continue;
    out.push({
      start: Math.floor(start),
      title:
        typeof c.title === "string" && c.title.trim() ? c.title.trim() : "",
      url: typeof c.url === "string" ? c.url : undefined,
    });
  }
  // Number untitled chapters by their position in the sorted list.
  return out
    .sort((a, b) => a.start - b.start)
    .map((c, i) => (c.title ? c : { ...c, title: `Chapter ${i + 1}` }));
}

/** Stable id for shows that weren't found through the index. */
export function podcastIdForFeed(feedUrl: string): string {
  return `feed-${hashString(feedUrl.trim().toLowerCase()).toString(36)}`;
}

export function episodeIdFor(podcastId: string, guid: string): string {
  // Two independent 32-bit hashes: one alone collides too often in big back catalogues.
  return `${podcastId}:${hashString(guid).toString(36)}${hashString(`${guid}#`).toString(36)}`;
}

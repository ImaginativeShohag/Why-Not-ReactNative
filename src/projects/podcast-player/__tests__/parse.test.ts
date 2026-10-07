import {
  episodeIdFor,
  FeedParseError,
  parseChaptersJson,
  parseFeed,
  podcastIdForFeed,
} from "../feeds/parse";
import { extractLinks, htmlToText, sanitizeHtml } from "../utils/html";
import { readFileSync } from "fs";
import { join } from "path";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");
const CLEAN_FEED = fixture("clean.xml");
const MESSY_FEED = fixture("messy.xml");
const CHAPTERS_FEED = fixture("chapters.xml");
const ATOM_FEED = fixture("atom.xml");
const SINGLE_ITEM_FEED = fixture("single.xml");

describe("parseFeed — clean feed", () => {
  const { podcast, episodes } = parseFeed(CLEAN_FEED, "https://rn.show/feed");

  it("reads channel metadata", () => {
    expect(podcast.title).toBe("The React Native Show");
    expect(podcast.author).toBe("RN Folks");
    expect(podcast.description).toBe("Weekly & nerdy.");
    expect(podcast.artworkUrl).toBe("https://rn.show/art.jpg");
    expect(podcast.categories).toEqual(["Technology", "Software How-To"]);
    expect(podcast.link).toBe("https://rn.show");
  });

  it("parses HH:MM:SS and bare-seconds durations", () => {
    expect(episodes.map((e) => e.duration)).toEqual([2751, 2280]);
  });

  it("keeps guid text even with attributes, and orders newest first", () => {
    expect(episodes.map((e) => e.guid)).toEqual(["rn-142", "rn-141"]);
  });

  it("reads enclosure, numbers and podcast:chapters", () => {
    const [e] = episodes;
    expect(e.audioUrl).toBe("https://cdn.rn.show/142.mp3");
    expect(e.mimeType).toBe("audio/mpeg");
    expect(e.enclosureLength).toBe(84000000);
    expect(e.episodeNumber).toBe(142);
    expect(e.season).toBe(3);
    expect(e.chaptersUrl).toBe("https://rn.show/142/chapters.json");
    expect(e.chapters).toEqual([]);
    expect(e.artworkUrl).toBe("https://rn.show/art.jpg"); // falls back to channel art
  });

  it("turns HTML notes into safe text and drops scripts", () => {
    const [e] = episodes;
    expect(e.notes).toContain("We talk EAS Update.");
    expect(e.notes).toContain("• Channels");
    expect(e.notes).not.toContain("alert");
    expect(e.notes).not.toContain("<");
    expect(extractLinks(e.notesHtml)).toEqual([
      { url: "https://docs.expo.dev", text: "Docs" },
    ]);
  });

  it("treats a zero enclosure length as unknown", () => {
    expect(episodes[1].enclosureLength).toBeNull();
    expect(episodes[1].notes).toBe("Plain description.");
  });
});

describe("parseFeed — messy feed", () => {
  const { podcast, episodes } = parseFeed(MESSY_FEED, "https://messy.fm/rss");

  it("survives a BOM + leading whitespace and decodes entities in CDATA", () => {
    expect(podcast.title).toBe(`Tom & Jerry's "Pod"`);
    expect(podcast.artworkUrl).toBe("https://messy.fm/cover.png");
  });

  it("skips text-only items and duplicate guids", () => {
    const titles = episodes.map((e) => e.title);
    expect(titles).not.toContain("Text-only blog post (no audio)");
    expect(titles).not.toContain("Duplicate guid — should be dropped");
    expect(episodes).toHaveLength(3);
  });

  it("falls back to the enclosure URL as guid and decodes &amp; in URLs", () => {
    const e = episodes.find((x) => x.title.startsWith("No duration"))!;
    expect(e.audioUrl).toBe("https://messy.fm/audio/ep3.m4a?source=rss&id=3");
    expect(e.guid).toBe(e.audioUrl);
    expect(e.mimeType).toBeNull();
    expect(e.duration).toBeNull();
    expect(e.episodeNumber).toBe(42); // "0042" kept as string by the parser, then int
    expect(e.notes).toBe("Escaped & HTML");
    expect(e.publishedAt).not.toBeNull(); // "PDT" zone handled
  });

  it("prefers the audio enclosure over a video one, tolerates bad dates", () => {
    const e = episodes.find((x) => x.guid === "vid-audio")!;
    expect(e.audioUrl).toBe("https://messy.fm/a.mp3");
    expect(e.duration).toBe(75);
    expect(e.publishedAt).toBeNull();
  });

  it("uses media:content, protocol-relative URLs and item artwork", () => {
    const e = episodes.find((x) => x.guid === "media-only")!;
    expect(e.audioUrl).toBe("https://cdn.messy.fm/m.mp3");
    expect(e.enclosureLength).toBe(5000000);
    expect(e.duration).toBeNull();
    expect(e.artworkUrl).toBe("https://messy.fm/ep-art.png");
  });
});

describe("parseFeed — chapters", () => {
  const { episodes } = parseFeed(CHAPTERS_FEED, "https://ch.fm/rss");

  it("reads inline Podlove chapters, sorted", () => {
    const e = episodes.find((x) => x.guid === "inline")!;
    expect(e.chapters).toEqual([
      { start: 0, title: "Intro", url: undefined },
      { start: 570, title: "Update channels", url: undefined },
      { start: 1450, title: "Rollbacks", url: "https://ch.fm/rb" },
    ]);
  });

  it("falls back to timestamps in the show notes", () => {
    const e = episodes.find((x) => x.guid === "notes")!;
    expect(e.chapters).toEqual([
      { start: 0, title: "Intro" },
      { start: 570, title: "Update channels" },
      { start: 5050, title: "Rollbacks" },
    ]);
  });

  it("parses podcast:chapters JSON and skips toc:false entries", () => {
    expect(
      parseChaptersJson({
        version: "1.2.0",
        chapters: [
          { startTime: 1450.5, title: "Rollbacks" },
          { startTime: 0, title: "Intro" },
          { startTime: 300, title: "Ad", toc: false },
          { startTime: "570", title: "" },
          { title: "no start" },
        ],
      }),
    ).toEqual([
      { start: 0, title: "Intro", url: undefined },
      { start: 570, title: "Chapter 2", url: undefined },
      { start: 1450, title: "Rollbacks", url: undefined },
    ]);
    expect(parseChaptersJson(null)).toEqual([]);
    expect(parseChaptersJson({ chapters: "nope" })).toEqual([]);
  });
});

describe("parseFeed — Atom, single item, garbage", () => {
  it("parses Atom with rel=enclosure links", () => {
    const { podcast, episodes } = parseFeed(
      ATOM_FEED,
      "https://atom.example/feed",
    );
    expect(podcast.title).toBe("Atom Audio");
    expect(podcast.author).toBe("Jane");
    expect(episodes).toHaveLength(1);
    expect(episodes[0].audioUrl).toBe("https://atom.example/1.mp3");
    expect(episodes[0].guid).toBe("urn:uuid:1");
    expect(episodes[0].notes).toBe("Hello world");
  });

  it("coerces a single <item> into a list", () => {
    const { episodes } = parseFeed(SINGLE_ITEM_FEED, "https://solo.fm/rss");
    expect(episodes).toHaveLength(1);
    expect(episodes[0].guid).toBe("https://solo.fm/1.mp3");
  });

  it("throws FeedParseError for non-feeds", () => {
    expect(() => parseFeed("", "x")).toThrow(FeedParseError);
    expect(() => parseFeed("<html><body>404</body></html>", "x")).toThrow(
      FeedParseError,
    );
    expect(() => parseFeed('{"json":true}', "x")).toThrow(FeedParseError);
  });
});

describe("ids + sanitizer", () => {
  it("derives stable ids", () => {
    expect(podcastIdForFeed("https://A.com/feed ")).toBe(
      podcastIdForFeed("https://a.com/feed"),
    );
    expect(episodeIdFor("p", "g1")).toBe(episodeIdFor("p", "g1"));
    expect(episodeIdFor("p", "g1")).not.toBe(episodeIdFor("p", "g2"));
    expect(episodeIdFor("p", "g1").startsWith("p:")).toBe(true);
  });

  it("sanitizes HTML for a WebView", () => {
    const out = sanitizeHtml(
      `<p onclick="x()">Hi</p><script>bad()</script><a href="javascript:evil()">x</a><a href="https://ok.com">ok</a><iframe src="https://x"></iframe>`,
    );
    expect(out).not.toMatch(/script|onclick|javascript|iframe/i);
    expect(out).toContain(`href="https://ok.com"`);
    expect(htmlToText("a&nbsp;&#8212;&#x2014;b")).toBe("a ——b");
  });
});

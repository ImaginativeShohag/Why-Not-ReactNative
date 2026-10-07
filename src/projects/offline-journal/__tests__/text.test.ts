import { describe, expect, it } from "@jest/globals";

import { toMatchQuery } from "../db/queries/search";
import {
  MATCH_END,
  MATCH_START,
  normalizeTag,
  normalizeTags,
  splitHighlights,
} from "../utils/text";

describe("normalizeTag", () => {
  it("strips #, trims and lowercases", () => {
    expect(normalizeTag("  #Work ")).toBe("work");
  });
  it("turns spaces and commas into dashes (commas would break GROUP_CONCAT)", () => {
    expect(normalizeTag("deep work, focus")).toBe("deep-work-focus");
  });
  it("returns empty for nothing useful", () => {
    expect(normalizeTag(" # ")).toBe("");
  });
  it("normalizeTags de-duplicates after normalising", () => {
    expect(normalizeTags(["Work", "#work", "calm", ""])).toEqual([
      "work",
      "calm",
    ]);
  });
});

describe("splitHighlights", () => {
  const S = MATCH_START;
  const E = MATCH_END;

  it("returns plain text untouched", () => {
    expect(splitHighlights("no matches")).toEqual([
      { text: "no matches", match: false },
    ]);
  });

  it("splits marked matches", () => {
    expect(splitHighlights(`…the ${S}sync${E} ${S}design${E} while`)).toEqual([
      { text: "…the ", match: false },
      { text: "sync", match: true },
      { text: " ", match: false },
      { text: "design", match: true },
      { text: " while", match: false },
    ]);
  });

  it("does not treat real brackets as markers", () => {
    expect(splitHighlights("a [b] c")).toEqual([
      { text: "a [b] c", match: false },
    ]);
  });

  it("tolerates an unterminated marker", () => {
    expect(splitHighlights(`x ${S}y`)).toEqual([
      { text: "x ", match: false },
      { text: "y", match: true },
    ]);
  });
});

describe("toMatchQuery", () => {
  it("quotes each term and adds prefix search", () => {
    expect(toMatchQuery("sync design")).toBe('"sync"* "design"*');
  });
  it("escapes quotes and neutralises FTS operators", () => {
    expect(toMatchQuery('say "hi" -x OR')).toBe('"say"* """hi"""* "-x"* "OR"*');
  });
  it("is empty for whitespace", () => {
    expect(toMatchQuery("   ")).toBe("");
  });
});

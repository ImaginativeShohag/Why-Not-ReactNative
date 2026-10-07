import { describe, expect, it } from "@jest/globals";

import type { Entry } from "../models/Entry";
import { toJson, toMarkdown, toMarkdownDocument } from "../utils/exportFormat";

const entry: Entry = {
  id: "01J",
  title: "Morning walk",
  body: "Cool air, quiet road.",
  mood: 4,
  createdAt: new Date(Date.UTC(2026, 7, 6, 7, 12)),
  updatedAt: new Date(Date.UTC(2026, 7, 6, 7, 13)),
  tags: ["health", "calm"],
  attachmentCount: 0,
};

describe("export formats", () => {
  it("renders an entry as markdown with mood and tags", () => {
    const md = toMarkdown(entry);
    expect(md.startsWith("## Morning walk\n")).toBe(true);
    expect(md).toContain("mood 4/5");
    expect(md).toContain("Cool air, quiet road.");
    expect(md.endsWith("#health #calm")).toBe(true);
  });

  it("falls back to Untitled and omits empty tags", () => {
    const md = toMarkdown({ ...entry, title: "", tags: [], mood: null });
    expect(md.startsWith("## Untitled")).toBe(true);
    expect(md).not.toContain("mood");
    expect(md.endsWith("Cool air, quiet road.")).toBe(true);
  });

  it("separates entries in a document", () => {
    const doc = toMarkdownDocument([entry, { ...entry, id: "2" }]);
    expect(doc.startsWith("# Journal export")).toBe(true);
    expect(doc.split("\n---\n")).toHaveLength(2);
  });

  it("serialises dates as ISO strings in JSON", () => {
    const [parsed] = JSON.parse(toJson([entry]));
    expect(parsed.createdAt).toBe("2026-08-06T07:12:00.000Z");
    expect(parsed.tags).toEqual(["health", "calm"]);
  });
});

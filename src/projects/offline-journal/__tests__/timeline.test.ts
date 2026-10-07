import { describe, expect, it } from "@jest/globals";

import type { Entry } from "../models/Entry";
import { headerIndices, toRows } from "../utils/timeline";

const NOW = new Date(2026, 7, 6, 18, 0).getTime();

const entry = (id: string, date: Date): Entry => ({
  id,
  title: id,
  body: "",
  mood: null,
  createdAt: date,
  updatedAt: date,
  tags: [],
  attachmentCount: 0,
});

describe("toRows", () => {
  it("returns nothing for no entries", () => {
    expect(toRows([], NOW)).toEqual([]);
  });

  it("inserts one header per day, newest first", () => {
    const rows = toRows(
      [
        entry("a", new Date(2026, 7, 6, 9)),
        entry("b", new Date(2026, 7, 6, 7)),
        entry("c", new Date(2026, 7, 5, 22)),
        entry("d", new Date(2026, 6, 28, 12)),
      ],
      NOW,
    );

    expect(rows.map((row) => row.kind)).toEqual([
      "header",
      "entry",
      "entry",
      "header",
      "entry",
      "header",
      "entry",
    ]);
    expect(rows.filter((r) => r.kind === "entry").map((r) => r.key)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("labels today and yesterday", () => {
    const rows = toRows(
      [
        entry("a", new Date(2026, 7, 6, 9)),
        entry("b", new Date(2026, 7, 5, 9)),
        entry("c", new Date(2026, 7, 1, 9)),
      ],
      NOW,
    );
    const labels = rows.flatMap((row) =>
      row.kind === "header" ? [row.label] : [],
    );
    expect(labels[0].startsWith("TODAY · ")).toBe(true);
    expect(labels[1].startsWith("YESTERDAY · ")).toBe(true);
    expect(labels[2]).toBe(labels[2].toUpperCase());
    expect(labels[2]).not.toMatch(/TODAY/);
  });

  it("gives every row a unique key (FlashList recycling depends on it)", () => {
    const rows = toRows(
      [
        entry("a", new Date(2026, 7, 6, 9)),
        entry("b", new Date(2026, 7, 5, 9)),
      ],
      NOW,
    );
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it("headerIndices points at exactly the header rows", () => {
    const rows = toRows(
      [
        entry("a", new Date(2026, 7, 6, 9)),
        entry("b", new Date(2026, 7, 6, 8)),
        entry("c", new Date(2026, 7, 4, 9)),
      ],
      NOW,
    );
    expect(headerIndices(rows)).toEqual([0, 3]);
  });
});

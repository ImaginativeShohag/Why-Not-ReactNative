import { describe, expect, it } from "@jest/globals";

import {
  backoffDelay,
  classifyStatus,
  MAX_ATTEMPTS,
  mergeOutboxOp,
  parsePullResponse,
  sanitizeMood,
} from "../sync/policy";

describe("backoffDelay", () => {
  const noJitter = () => 0;

  it("doubles per attempt", () => {
    expect(backoffDelay(0, noJitter)).toBe(1_000);
    expect(backoffDelay(1, noJitter)).toBe(2_000);
    expect(backoffDelay(3, noJitter)).toBe(8_000);
  });

  it("caps at five minutes", () => {
    expect(backoffDelay(20, noJitter)).toBe(300_000);
    expect(backoffDelay(MAX_ATTEMPTS + 10, noJitter)).toBe(300_000);
  });

  it("adds up to one second of jitter", () => {
    expect(backoffDelay(2, () => 0.999)).toBe(4_000 + 999);
    expect(backoffDelay(20, () => 0.5)).toBe(300_500);
  });
});

describe("classifyStatus", () => {
  it.each([
    [200, "ok"],
    [204, "ok"],
    [400, "dead"],
    [404, "dead"],
    [422, "dead"],
    [408, "retry"],
    [429, "retry"],
    [500, "retry"],
    [503, "retry"],
    [0, "retry"],
  ] as [number, string][])("%i -> %s", (status, expected) => {
    expect(classifyStatus(status)).toBe(expected);
  });
});

describe("mergeOutboxOp", () => {
  it("keeps create when an update follows an unsent create", () => {
    expect(mergeOutboxOp("create", "update")).toBe("create");
  });
  it("collapses update + update", () => {
    expect(mergeOutboxOp("update", "update")).toBe("update");
  });
  it("lets delete win over anything", () => {
    expect(mergeOutboxOp("create", "delete")).toBe("delete");
    expect(mergeOutboxOp("update", "delete")).toBe("delete");
  });
  it("lets a re-save after delete replace it", () => {
    expect(mergeOutboxOp("delete", "update")).toBe("update");
  });
});

describe("parsePullResponse", () => {
  const good = {
    id: "01J",
    title: "t",
    body: "b",
    mood: 3,
    created_at: 1,
    updated_at: 2,
    deleted_at: null,
  };

  it("accepts a well-formed payload", () => {
    const parsed = parsePullResponse({ entries: [good], serverTime: 10 });
    expect(parsed.serverTime).toBe(10);
    expect(parsed.entries).toEqual([good]);
  });

  it("defaults a missing deleted_at to null", () => {
    const { deleted_at, ...rest } = good;
    expect(deleted_at).toBeNull();
    const parsed = parsePullResponse({ entries: [rest], serverTime: 1 });
    expect(parsed.entries[0].deleted_at).toBeNull();
  });

  it("drops malformed rows instead of failing the whole pull", () => {
    const parsed = parsePullResponse({
      entries: [good, { ...good, id: 5 }, null, { ...good, tags: [1] }],
      serverTime: 1,
    });
    expect(parsed.entries).toHaveLength(1);
  });

  it("throws when the envelope is wrong", () => {
    expect(() => parsePullResponse(null)).toThrow();
    expect(() => parsePullResponse({ entries: [] })).toThrow(/serverTime/);
    expect(() => parsePullResponse({ serverTime: 1 })).toThrow(/entries/);
  });
});

describe("sanitizeMood", () => {
  it("keeps 1..5 and nulls everything else", () => {
    expect(sanitizeMood(1)).toBe(1);
    expect(sanitizeMood(5)).toBe(5);
    expect(sanitizeMood(0)).toBeNull();
    expect(sanitizeMood(6)).toBeNull();
    expect(sanitizeMood(2.5)).toBeNull();
    expect(sanitizeMood(null)).toBeNull();
  });
});

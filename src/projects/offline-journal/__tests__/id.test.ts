import { describe, expect, it, jest } from "@jest/globals";

import { ulid, ulidTime } from "../utils/id";

// The native module is not available under Jest; ulid() takes its randomness
// as a parameter, so this mock only has to satisfy the import.
jest.mock("expo-crypto", () => ({
  getRandomBytes: (count: number) => new Uint8Array(count),
}));

const bytes = (fill: number) => (count: number) =>
  new Uint8Array(count).fill(fill);

describe("ulid", () => {
  it("is 26 Crockford base32 characters", () => {
    const id = ulid(Date.now(), bytes(7));
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("encodes the timestamp so it round-trips", () => {
    const at = Date.UTC(2026, 7, 6, 7, 12);
    expect(ulidTime(ulid(at, bytes(0)))).toBe(at);
  });

  it("sorts lexicographically by creation time", () => {
    const times = [
      5, 1_000, 1_700_000_000_000, 1_700_000_000_001, 2_000_000_000_000,
    ];
    // Worst case for ordering: later ids get the SMALLEST random part.
    const ids = times.map((t, i) => ulid(t, bytes(255 - i)));
    expect([...ids].sort()).toEqual(ids);
  });

  it("uses the random bytes for the last 16 characters", () => {
    const a = ulid(1_000, bytes(1));
    const b = ulid(1_000, bytes(2));
    expect(a.slice(0, 10)).toBe(b.slice(0, 10));
    expect(a.slice(10)).not.toBe(b.slice(10));
  });
});

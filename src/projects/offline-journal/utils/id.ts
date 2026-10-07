import { getRandomBytes } from "expo-crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I, L, O, U

/**
 * 26-char ULID: 10 chars of millisecond timestamp + 16 chars of randomness.
 * Sorting by id sorts by creation time, which keeps logs and debugging readable.
 * The 80 random bits let any device mint one with no coordination, so the id
 * doubles as the sync idempotency key. The timeline does not page on it:
 * `listEntries` orders by `created_at` and pages with LIMIT/OFFSET.
 *
 * `randomBytes` is injectable so tests can run without the native module.
 */
export function ulid(
  now: number = Date.now(),
  randomBytes: (count: number) => Uint8Array = getRandomBytes,
): string {
  let time = "";
  let remaining = now;
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[remaining % 32] + time;
    remaining = Math.floor(remaining / 32);
  }

  const bytes = randomBytes(16);
  let random = "";
  for (let i = 0; i < 16; i++) random += ALPHABET[bytes[i] % 32]; // 256 % 32 === 0, no bias

  return time + random;
}

/** Recovers the creation time from the first 10 chars. Handy in tests and debugging. */
export function ulidTime(id: string): number {
  let time = 0;
  for (const char of id.slice(0, 10)) time = time * 32 + ALPHABET.indexOf(char);
  return time;
}

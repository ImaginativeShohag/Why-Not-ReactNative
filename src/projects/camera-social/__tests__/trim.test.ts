import { trimLoopSeek } from "@/src/projects/camera-social/utils/trim";

describe("trimLoopSeek", () => {
  it("keeps playing inside the window", () => {
    expect(trimLoopSeek(4, 3, 8)).toBeNull();
    expect(trimLoopSeek(4, 3, null)).toBeNull();
  });

  it("jumps back to the trim start at the trim end", () => {
    expect(trimLoopSeek(8, 3, 8)).toBe(3);
    expect(trimLoopSeek(8.2, 0, 8)).toBe(0);
  });

  it("loops to the trim start, not 0:00, when only the start is trimmed", () => {
    // The file played to its end (playToEnd) with trimEndMs = null.
    expect(trimLoopSeek(12, 3, null, true)).toBe(3);
  });

  it("loops an untrimmed clip from the beginning", () => {
    expect(trimLoopSeek(12, 0, null, true)).toBe(0);
  });
});

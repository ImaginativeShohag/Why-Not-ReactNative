import {
  addLast,
  addNext,
  dedupe,
  dragTargetIndex,
  moveItem,
  onStartPlaying,
  takeNext,
  without,
} from "@/src/projects/podcast-player/playback/queue";
import type { QueueItem } from "@/src/projects/podcast-player/models/Episode";

const q = (...ids: string[]): QueueItem[] =>
  ids.map((episodeId, i) => ({ episodeId, addedAt: i }));
const ids = (queue: QueueItem[]) => queue.map((i) => i.episodeId);

describe("up-next queue", () => {
  it("add-next puts the episode first and never duplicates it", () => {
    expect(ids(addNext(q("a", "b", "c"), "c", 9))).toEqual(["c", "a", "b"]);
    expect(ids(addNext([], "x", 9))).toEqual(["x"]);
  });

  it("add-last appends, moving an existing entry and keeping its addedAt", () => {
    const result = addLast(q("a", "b", "c"), "a", 99);
    expect(ids(result)).toEqual(["b", "c", "a"]);
    expect(result[2].addedAt).toBe(0);
  });

  it("reorders with clamped indices", () => {
    expect(ids(moveItem(q("a", "b", "c", "d"), 0, 2))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(ids(moveItem(q("a", "b", "c"), 2, -5))).toEqual(["c", "a", "b"]);
    expect(moveItem([], 0, 1)).toEqual([]);
  });

  it("auto-advance pops the head", () => {
    expect(takeNext(q("a", "b"))).toEqual({
      next: "a",
      rest: q("a", "b").slice(1),
    });
    expect(takeNext([])).toEqual({ next: null, rest: [] });
  });

  it("starting a queued episode removes it from up-next", () => {
    expect(ids(onStartPlaying(q("a", "b"), "b"))).toEqual(["a"]);
    expect(ids(without(q("a"), "zzz"))).toEqual(["a"]);
  });

  it("dedupes keeping the first occurrence", () => {
    expect(ids(dedupe(q("a", "b", "a", "c", "b")))).toEqual(["a", "b", "c"]);
  });

  it("maps a drag distance to a target row", () => {
    expect(dragTargetIndex(1, 72 * 2, 72, 5)).toBe(3);
    expect(dragTargetIndex(1, 30, 72, 5)).toBe(1); // under half a row: stays
    expect(dragTargetIndex(0, -500, 72, 5)).toBe(0);
    expect(dragTargetIndex(4, 999, 72, 5)).toBe(4);
    expect(dragTargetIndex(0, 0, 72, 0)).toBe(0);
  });
});

import type { QueueItem } from "@/src/projects/podcast-player/models/Episode";

/**
 * Pure "up next" operations. The currently playing episode is NOT in the
 * queue; the queue is only what plays after it. Every op returns a new array
 * and never produces duplicates.
 */

export function without(
  queue: readonly QueueItem[],
  episodeId: string,
): QueueItem[] {
  return queue.filter((q) => q.episodeId !== episodeId);
}

export function addNext(
  queue: readonly QueueItem[],
  episodeId: string,
  now = Date.now(),
): QueueItem[] {
  return [{ episodeId, addedAt: now }, ...without(queue, episodeId)];
}

export function addLast(
  queue: readonly QueueItem[],
  episodeId: string,
  now = Date.now(),
): QueueItem[] {
  const existing = queue.find((q) => q.episodeId === episodeId);
  return [
    ...without(queue, episodeId),
    existing ?? { episodeId, addedAt: now },
  ];
}

/** Moves the item at `from` to index `to` (both clamped). */
export function moveItem(
  queue: readonly QueueItem[],
  from: number,
  to: number,
): QueueItem[] {
  if (queue.length === 0) return [];
  const src = clamp(from, 0, queue.length - 1);
  const dst = clamp(to, 0, queue.length - 1);
  if (src === dst) return [...queue];
  const next = [...queue];
  const [item] = next.splice(src, 1);
  next.splice(dst, 0, item);
  return next;
}

/** Pops the head for auto-advance. */
export function takeNext(queue: readonly QueueItem[]): {
  next: string | null;
  rest: QueueItem[];
} {
  if (queue.length === 0) return { next: null, rest: [] };
  const [head, ...rest] = queue;
  return { next: head.episodeId, rest };
}

/** Starting an episode that's already queued removes it from "up next". */
export function onStartPlaying(
  queue: readonly QueueItem[],
  episodeId: string,
): QueueItem[] {
  return without(queue, episodeId);
}

export function dedupe(queue: readonly QueueItem[]): QueueItem[] {
  const seen = new Set<string>();
  return queue.filter((q) =>
    seen.has(q.episodeId) ? false : (seen.add(q.episodeId), true),
  );
}

function clamp(n: number, min: number, max: number): number {
  "worklet";
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Index an item should land on when dragged by `dy` pixels from `from`,
 * given a fixed row height. Shared by the reorder gesture and its tests.
 */
export function dragTargetIndex(
  from: number,
  dy: number,
  rowHeight: number,
  count: number,
): number {
  // Runs inside the reorder gesture on the UI thread.
  "worklet";
  if (count <= 0) return 0;
  return clamp(from + dy / rowHeight, 0, count - 1);
}

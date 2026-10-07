/**
 * Non-destructive trim: the file is never re-encoded, so the player keeps
 * playback inside [start, end] itself. expo-video's native `loop` always
 * restarts at 0:00, which would replay a trimmed-away start, so the viewer
 * loops by hand instead.
 *
 * Returns the time (seconds) to seek to, or null to keep playing. Reaching
 * the trim end, or the end of the file (`ended`, from `playToEnd`) when there
 * is no end trim, both go back to the trim start.
 */
export function trimLoopSeek(
  currentSec: number,
  startSec: number,
  endSec: number | null,
  ended = false,
): number | null {
  if (ended) return startSec;
  if (endSec != null && currentSec >= endSec) return startSec;
  return null;
}

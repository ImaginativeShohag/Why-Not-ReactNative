/**
 * Throttled position persistence. Writing on every 500 ms status tick would
 * hammer SQLite; writing only on pause would lose everything on a crash. So:
 * at most every `intervalMs` while playing, plus an immediate flush on
 * pause / seek / track change / backgrounding.
 */

export const PROGRESS_INTERVAL_MS = 5_000;

/** Within this many seconds of the end we treat the episode as finished. */
export const PLAYED_THRESHOLD_SEC = 30;

export type ProgressSample = {
  episodeId: string;
  position: number;
  duration: number | null;
};

export function createProgressWriter(
  write: (sample: ProgressSample & { played: boolean }) => Promise<void> | void,
  options: { intervalMs?: number; now?: () => number } = {},
) {
  const intervalMs = options.intervalMs ?? PROGRESS_INTERVAL_MS;
  const now = options.now ?? Date.now;
  let lastWriteAt = 0;
  let lastWritten: ProgressSample | null = null;
  let pending: ProgressSample | null = null;

  const doWrite = (sample: ProgressSample) => {
    lastWriteAt = now();
    lastWritten = sample;
    pending = null;
    return write({
      ...sample,
      played: isPlayed(sample.position, sample.duration),
    });
  };

  return {
    /** Call on every status tick; writes at most once per interval. */
    sample(s: ProgressSample) {
      pending = s;
      if (now() - lastWriteAt >= intervalMs) {
        void doWrite(s);
      }
    },
    /** Force-write the latest sample (pause, seek, background, track change). */
    flush(s?: ProgressSample) {
      const target = s ?? pending;
      if (!target) return;
      if (
        lastWritten &&
        lastWritten.episodeId === target.episodeId &&
        Math.abs(lastWritten.position - target.position) < 0.5
      ) {
        pending = null;
        return;
      }
      return doWrite(target);
    },
    reset() {
      lastWriteAt = 0;
      lastWritten = null;
      pending = null;
    },
  };
}

export function isPlayed(position: number, duration: number | null): boolean {
  if (!duration || duration <= 0) return false;
  return (
    duration - position <= Math.min(PLAYED_THRESHOLD_SEC, duration * 0.05 + 5)
  );
}

/**
 * Where to start an episode: the saved position, unless it was finished
 * (restart) or it's so close to the start that resuming is pointless.
 */
export function resolveResumePosition(
  saved: { position: number; played: boolean } | null,
  duration: number | null,
): number {
  if (!saved || saved.played) return 0;
  if (saved.position < 5) return 0;
  if (duration && isPlayed(saved.position, duration)) return 0;
  // Rewind a couple of seconds so the listener regains context.
  return Math.max(0, saved.position - 2);
}

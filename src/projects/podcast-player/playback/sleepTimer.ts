import type { SleepTimerOption } from "@/src/projects/podcast-player/models/Episode";

/** Fade-out window before the timer pauses playback. */
export const SLEEP_FADE_MS = 10_000;

/** Linear volume ramp over the final `fadeMs`: 1 → 0. */
export function fadeVolume(
  remainingMs: number,
  fadeMs = SLEEP_FADE_MS,
  base = 1,
): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  if (fadeMs <= 0 || remainingMs >= fadeMs) return base;
  return Math.max(0, Math.min(1, remainingMs / fadeMs)) * base;
}

/**
 * Wall-clock ms until the timer fires. "End of episode" depends on the
 * playback rate: 10 min of audio at 2× ends in 5 wall-clock minutes.
 */
export function sleepRemainingMs(
  option: SleepTimerOption,
  ctx: {
    startedAt: number;
    now: number;
    episodeRemainingSec: number;
    rate: number;
  },
): number | null {
  switch (option.kind) {
    case "off":
      return null;
    case "minutes":
      return Math.max(0, ctx.startedAt + option.minutes * 60_000 - ctx.now);
    case "endOfEpisode": {
      const rate = ctx.rate > 0 ? ctx.rate : 1;
      return Math.max(0, (ctx.episodeRemainingSec * 1000) / rate);
    }
  }
}

/**
 * When an episode finishes, may playback move on to the next queued episode?
 *
 * The timer's own expiry and the player's "finished" event race: with "end of
 * episode" the countdown reaches 0 at the same moment the audio ends, and a
 * "minutes" timer can fire while the finish handler is awaiting a DB write.
 * Either one flips the store's `sleepOption` to "off", so re-reading it later
 * would wrongly auto-advance. The caller therefore passes:
 *  - `optionAtFinish`: the option read synchronously when the finish event
 *    arrived, before any await;
 *  - `timerFired`: whether the timer has paused playback since the user last
 *    started it (covers expiry before the event or during the await).
 */
export function shouldAdvanceAfterFinish(
  optionAtFinish: SleepTimerOption,
  timerFired: boolean,
): boolean {
  return optionAtFinish.kind !== "endOfEpisode" && !timerFired;
}

type SleepTimerDeps = {
  getEpisodeRemainingSec: () => number;
  getRate: () => number;
  isPlaying: () => boolean;
  setVolume: (volume: number) => void;
  onExpire: () => void;
  onTick?: (remainingMs: number | null) => void;
  now?: () => number;
};

/**
 * Drives the timer outside React. Ticks every 250 ms, applies the fade, and
 * pauses (via onExpire) at zero. Volume is always restored on cancel/expire
 * so the next play isn't silent.
 */
export function createSleepTimer(deps: SleepTimerDeps) {
  const now = deps.now ?? Date.now;
  let option: SleepTimerOption = { kind: "off" };
  let startedAt = 0;
  let handle: ReturnType<typeof setInterval> | null = null;
  let fading = false;

  const stop = () => {
    if (handle) clearInterval(handle);
    handle = null;
    if (fading) deps.setVolume(1);
    fading = false;
  };

  const tick = () => {
    const remaining = sleepRemainingMs(option, {
      startedAt,
      now: now(),
      episodeRemainingSec: deps.getEpisodeRemainingSec(),
      rate: deps.getRate(),
    });
    deps.onTick?.(remaining);
    if (remaining == null) return;
    // "End of episode" only counts down while audio is actually advancing.
    if (option.kind === "endOfEpisode" && !deps.isPlaying()) return;
    if (remaining <= 0) {
      stop();
      option = { kind: "off" };
      deps.onExpire();
      deps.onTick?.(null);
      return;
    }
    if (remaining < SLEEP_FADE_MS) {
      fading = true;
      deps.setVolume(fadeVolume(remaining));
    } else if (fading) {
      fading = false;
      deps.setVolume(1);
    }
  };

  return {
    start(next: SleepTimerOption) {
      stop();
      option = next;
      startedAt = now();
      if (next.kind === "off") {
        deps.onTick?.(null);
        return;
      }
      tick();
      handle = setInterval(tick, 250);
    },
    cancel() {
      stop();
      option = { kind: "off" };
      deps.onTick?.(null);
    },
    get option() {
      return option;
    },
  };
}

export type SleepTimer = ReturnType<typeof createSleepTimer>;

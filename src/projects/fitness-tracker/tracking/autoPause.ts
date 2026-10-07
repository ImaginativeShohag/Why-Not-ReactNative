/**
 * PURE auto-pause state machine. Fed with "is the user moving?" samples from
 * either GPS speed (works in the background) or device-motion energy (faster,
 * foreground only). Asymmetric timings on purpose: pausing late is cheap,
 * resuming late loses real distance.
 */
export type AutoPauseState = {
  stillSince: number | null;
  movingSince: number | null;
};

export type AutoPauseConfig = {
  stopAfterMs: number;
  resumeAfterMs: number;
};

export const DEFAULT_AUTO_PAUSE: AutoPauseConfig = {
  // Spec target: pause within 10 s of stopping, resume within 5 s of moving.
  stopAfterMs: 8_000,
  resumeAfterMs: 3_000,
};

export const initialAutoPause: AutoPauseState = {
  stillSince: null,
  movingSince: null,
};

/** Below this GPS speed we call it "stopped". Walking is ~1.3 m/s. */
export const STILL_SPEED_MPS = 0.6;

export function stepAutoPause(
  state: AutoPauseState,
  sample: { t: number; moving: boolean },
  isAutoPaused: boolean,
  config: AutoPauseConfig = DEFAULT_AUTO_PAUSE,
): { state: AutoPauseState; action: "pause" | "resume" | null } {
  if (sample.moving) {
    const movingSince = state.movingSince ?? sample.t;
    const next = { stillSince: null, movingSince };
    if (isAutoPaused && sample.t - movingSince >= config.resumeAfterMs) {
      return { state: next, action: "resume" };
    }
    return { state: next, action: null };
  }

  const stillSince = state.stillSince ?? sample.t;
  const next = { stillSince, movingSince: null };
  if (!isAutoPaused && sample.t - stillSince >= config.stopAfterMs) {
    return { state: next, action: "pause" };
  }
  return { state: next, action: null };
}

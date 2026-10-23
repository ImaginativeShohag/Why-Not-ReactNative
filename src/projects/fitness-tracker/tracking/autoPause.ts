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

/**
 * With a distance filter (5 m accurate, 25 m saver) the OS sends *no* fixes
 * while you stand still, so "still" samples never arrive. Silence longer than
 * it takes to cover one distance interval at walking-stop speed means the user
 * stopped, not that they kept moving unseen.
 */
export function silenceMeansStillMs(
  distanceIntervalM: number,
  timeIntervalMs: number,
  config: AutoPauseConfig = DEFAULT_AUTO_PAUSE,
) {
  return Math.max(
    config.stopAfterMs,
    (distanceIntervalM / STILL_SPEED_MPS) * 1000 + timeIntervalMs,
  );
}

/**
 * Who decided the last auto-pause transition. Device motion is the better
 * signal in the foreground, so a recent motion decision wins over GPS speed
 * for this long; GPS only takes over once motion has gone quiet.
 */
export const MOTION_PRIORITY_MS = 60_000;

export type MotionDecision = { action: "pause" | "resume"; at: number };

/** GPS wants `action` at `t`: allowed unless motion recently decided the opposite. */
export function gpsMayAct(
  action: "pause" | "resume",
  t: number,
  motion: MotionDecision | null | undefined,
) {
  if (!motion || motion.action === action) return true;
  return t - motion.at >= MOTION_PRIORITY_MS;
}

/**
 * When to pause, if the silence since the last fix says "stopped": one stop
 * window after the last fix. `null` when there was no fix in the current
 * active stretch yet (still acquiring) or the silence is too short.
 */
export function silentStopAt(
  lastFixAt: number | null,
  activeSince: number,
  now: number,
  silenceMs: number,
  config: AutoPauseConfig = DEFAULT_AUTO_PAUSE,
): number | null {
  if (lastFixAt == null || lastFixAt < activeSince) return null;
  return now - lastFixAt >= silenceMs ? lastFixAt + config.stopAfterMs : null;
}

/**
 * Interruptions, route changes and remote commands.
 *
 * What expo-audio does natively (verified in node_modules/expo-audio/ios/AudioModule.swift):
 *  - INTERRUPTION BEGAN   → pauses every playing player and remembers which.
 *  - INTERRUPTION ENDED   → resumes only those, and only if the OS passes `.shouldResume`.
 *  - ROUTE CHANGED (.oldDeviceUnavailable, i.e. headphones out) → pauses all players.
 *  - Remote commands (lock screen, headphones, car) → play/pause/seek on the player.
 *  - Android: audio-focus loss/gain handled in AudioModule.kt. "Becoming noisy"
 *    (headphones unplugged) is NOT handled by expo-audio 57 — see the runbook.
 *
 * None of these fire a JS event. What JS *can* see is the status stream: the
 * player stops or starts without us having asked. This module turns those
 * unexplained transitions into a classification so the service keeps its
 * notion of "what the user wants" in sync (and never auto-resumes after a
 * pause the user made from the lock screen).
 */

export type Intent = "play" | "pause";

export type StatusLike = {
  playing: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
  isLoaded: boolean;
};

export type TransitionKind =
  | "none"
  /** Stopped without us asking: interruption, route change or remote pause. */
  | "externalPause"
  /** Started without us asking: interruption ended with shouldResume, or remote play. */
  | "externalPlay"
  | "finished";

export function classifyTransition(
  prev: StatusLike | null,
  next: StatusLike,
  intent: Intent,
): TransitionKind {
  if (next.didJustFinish) return "finished";
  if (!prev || !next.isLoaded) return "none";
  // Buffering stalls flip `playing` on some platforms; they're not a pause.
  if (next.isBuffering || prev.isBuffering) return "none";
  if (prev.playing && !next.playing && intent === "play")
    return "externalPause";
  if (!prev.playing && next.playing && intent === "pause")
    return "externalPlay";
  return "none";
}

/**
 * Holds the last status + the user's intent. The service calls `command()`
 * whenever it plays/pauses on the user's behalf and `observe()` on every
 * status tick.
 */
export function createInterruptionTracker() {
  let intent: Intent = "pause";
  let prev: StatusLike | null = null;
  // Commands take a tick or two to show up in status; ignore transitions
  // inside that window so our own play() isn't misread as "external".
  let commandAt = 0;

  return {
    command(next: Intent, now = Date.now()) {
      intent = next;
      commandAt = now;
    },
    observe(status: StatusLike, now = Date.now()): TransitionKind {
      const kind =
        now - commandAt < 1200 && !status.didJustFinish
          ? "none"
          : classifyTransition(prev, status, intent);
      prev = {
        playing: status.playing,
        isBuffering: status.isBuffering,
        didJustFinish: status.didJustFinish,
        isLoaded: status.isLoaded,
      };
      if (kind === "externalPause" || kind === "finished") intent = "pause";
      if (kind === "externalPlay") intent = "play";
      return kind;
    },
    get intent() {
      return intent;
    },
    reset() {
      prev = null;
    },
  };
}

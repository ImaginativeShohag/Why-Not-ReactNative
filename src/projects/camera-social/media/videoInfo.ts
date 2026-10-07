import { createVideoPlayer } from "expo-video";

/**
 * A video file's real duration in ms, read from its metadata by a throwaway
 * expo-video player that never plays. expo-camera's `recordAsync` only
 * returns a URI, and wall-clock time around it includes session start-up and
 * stop latency. Resolves null if the file can't be loaded in time, so the
 * caller keeps a fallback.
 */
export function probeVideoDurationMs(
  uri: string,
  timeoutMs = 3000,
): Promise<number | null> {
  return new Promise((resolve) => {
    let done = false;
    const player = createVideoPlayer(uri);
    const finish = (seconds: number) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      loaded.remove();
      status.remove();
      player.release();
      resolve(seconds > 0 ? Math.round(seconds * 1000) : null);
    };
    const timer = setTimeout(() => finish(0), timeoutMs);
    const loaded = player.addListener("sourceLoad", ({ duration }) =>
      finish(duration),
    );
    const status = player.addListener("statusChange", ({ status: s }) => {
      if (s === "readyToPlay") finish(player.duration);
      else if (s === "error") finish(0);
    });
    // Loaded before the listeners attached.
    if (player.status === "readyToPlay") finish(player.duration);
  });
}

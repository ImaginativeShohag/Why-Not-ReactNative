import type { AudioMetadata, AudioPlayer } from "expo-audio";

import type { Episode } from "@/src/projects/podcast-player/models/Episode";

/**
 * Lock-screen / Control Center / Android media-notification metadata.
 *
 * expo-audio owns the remote-command wiring natively: play, pause, toggle,
 * scrub (changePlaybackPosition) and ±skip when `showSeekForward/Backward`
 * are set. The skip interval on those surfaces is fixed natively (10 s on
 * iOS, the ExoPlayer default on Android) — our in-app 15/30/45 s setting
 * can't be pushed to them with this API. Next/previous track commands are
 * disabled natively too, so auto-advance happens on didJustFinish only.
 */

export function metadataFor(
  episode: Pick<Episode, "title" | "artworkUrl">,
  podcastTitle: string,
): AudioMetadata {
  return {
    title: episode.title,
    artist: podcastTitle,
    albumTitle: podcastTitle,
    artworkUrl: episode.artworkUrl ?? undefined,
  };
}

export function activateLockScreen(
  player: AudioPlayer,
  metadata: AudioMetadata,
): void {
  try {
    player.setActiveForLockScreen(true, metadata, {
      showSeekForward: true,
      showSeekBackward: true,
    });
  } catch {
    // Web / Expo Go builds without the media service: degrade silently.
  }
}

export function clearLockScreen(player: AudioPlayer): void {
  try {
    player.clearLockScreenControls();
  } catch {
    // see activateLockScreen
  }
}

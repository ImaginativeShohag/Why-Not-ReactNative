import { create } from "zustand";

import type {
  Chapter,
  QueueItem,
  SleepTimerOption,
} from "@/src/projects/podcast-player/models/Episode";

/**
 * UI-facing playback state. Written ONLY by the playback service (fed by the
 * expo-audio status events); components read it with selectors and send
 * commands to the service. Nothing in React holds the player itself.
 */

export type NowPlaying = {
  episodeId: string;
  podcastId: string;
  title: string;
  podcastTitle: string;
  artworkUrl: string | null;
  chapters: Chapter[];
  /** True when playing from a downloaded file. */
  isLocal: boolean;
};

export type PlaybackStatus = {
  position: number;
  duration: number;
  playing: boolean;
  buffering: boolean;
  loaded: boolean;
  rate: number;
  error: string | null;
};

type PlayerState = {
  nowPlaying: NowPlaying | null;
  status: PlaybackStatus;
  queue: QueueItem[];
  sleepOption: SleepTimerOption;
  sleepRemainingMs: number | null;
  /** Paused by the system/remote (call, headphones out, lock screen). */
  pausedExternally: boolean;
  ready: boolean;
};

export const INITIAL_STATUS: PlaybackStatus = {
  position: 0,
  duration: 0,
  playing: false,
  buffering: false,
  loaded: false,
  rate: 1,
  error: null,
};

export const usePlayerStore = create<PlayerState>()(() => ({
  nowPlaying: null,
  status: INITIAL_STATUS,
  queue: [],
  sleepOption: { kind: "off" },
  sleepRemainingMs: null,
  pausedExternally: false,
  ready: false,
}));

import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";
import { AppState, Platform } from "react-native";

import {
  getEpisode,
  kvGet,
  kvSet,
  loadQueue,
  saveProgress,
  saveQueue,
  setEpisodeDuration,
  setPlayed,
} from "@/src/projects/podcast-player/db/queries";
import { downloadManager } from "@/src/projects/podcast-player/downloads/manager";
import { ensureChapters } from "@/src/projects/podcast-player/feeds/sync";
import type {
  EpisodeDetail,
  QueueItem,
  SleepTimerOption,
} from "@/src/projects/podcast-player/models/Episode";
import { createInterruptionTracker } from "@/src/projects/podcast-player/playback/interruptions";
import {
  activateLockScreen,
  clearLockScreen,
  metadataFor,
} from "@/src/projects/podcast-player/playback/nowPlaying";
import {
  createProgressWriter,
  isAtEnd,
  resolveResumePosition,
} from "@/src/projects/podcast-player/playback/progress";
import * as Queue from "@/src/projects/podcast-player/playback/queue";
import {
  clampRate,
  resolveStartRate,
} from "@/src/projects/podcast-player/playback/rate";
import {
  createSleepTimer,
  shouldAdvanceAfterFinish,
} from "@/src/projects/podcast-player/playback/sleepTimer";
import {
  INITIAL_STATUS,
  usePlayerStore,
} from "@/src/projects/podcast-player/stores/playerStore";
import {
  ensureSettingsHydrated,
  getSettings,
} from "@/src/projects/podcast-player/stores/settingsStore";
import { invalidateProgress } from "@/src/projects/podcast-player/utils/invalidate";

/**
 * THE playback singleton. Module scope, so it outlives every screen: navigating
 * anywhere (or leaving the project for the launcher) never unmounts it.
 *
 *   commands  ← UI (mini player, full player, rows) call methods here
 *   events    → expo-audio `playbackStatusUpdate` → usePlayerStore
 *
 * Nothing else holds a reference to the AudioPlayer.
 */

const SESSION_KEY = "session";

type Session = { episodeId: string; rate: number };

class PlaybackService {
  private player: AudioPlayer | null = null;
  private initPromise: Promise<void> | null = null;
  private current: EpisodeDetail | null = null;
  /** Resume position to apply once the new source reports isLoaded. */
  private pendingSeek: number | null = null;
  private autoplayOnLoad = false;
  private durationLearned = false;
  private lockScreenActive = false;
  private askedNotificationPermission = false;
  private tracker = createInterruptionTracker();
  /**
   * Set when the sleep timer pauses playback, cleared when the user starts it
   * again. Stops a finish event that races the timer from auto-advancing.
   */
  private sleepFired = false;
  /**
   * Bumped by every load(); a load whose token is no longer the latest stops
   * after its next await, so rapid taps always end on the last episode tapped.
   */
  private loadSeq = 0;
  /** The current item reached its end; play() must rewind before playing. */
  private finished = false;
  /** A speed the user picked this run; null means "use the Default speed". */
  private userRate: number | null = null;

  private progress = createProgressWriter(
    async ({ episodeId, position, duration, played }) => {
      await saveProgress({ episodeId, position, duration, played });
    },
  );

  private sleep = createSleepTimer({
    getEpisodeRemainingSec: () => {
      const { position, duration } = usePlayerStore.getState().status;
      return Math.max(0, duration - position);
    },
    getRate: () => usePlayerStore.getState().status.rate,
    isPlaying: () => usePlayerStore.getState().status.playing,
    setVolume: (v) => {
      if (this.player) this.player.volume = v;
    },
    onExpire: () => {
      this.sleepFired = true;
      this.pause();
      usePlayerStore.setState({ sleepOption: { kind: "off" } });
    },
    onTick: (remaining) => {
      if (usePlayerStore.getState().sleepRemainingMs !== remaining) {
        usePlayerStore.setState({ sleepRemainingMs: remaining });
      }
    },
  });

  // ------------------------------------------------------------ lifecycle

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((e) => {
        this.initPromise = null;
        throw e;
      });
    }
    return this.initPromise;
  }

  private async doInit() {
    // Session config, once. doNotMix: a podcast should pause the user's music
    // (and it's required for expo-audio's lock-screen controls to work).
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });

    this.player = createAudioPlayer(null, { updateInterval: 500 });
    this.player.addListener("playbackStatusUpdate", (s) => this.onStatus(s));

    AppState.addEventListener("change", (state) => {
      // Persist before the OS might kill us; nothing is saved on termination.
      if (state !== "active") this.flushProgress();
    });

    const queue = await loadQueue();
    usePlayerStore.setState({ queue });

    const session = await kvGet<Session>(SESSION_KEY);
    if (session?.episodeId) {
      // loadEpisode, not load(): load() awaits init(), which is this very
      // promise, so calling it here would never settle.
      await this.loadEpisode(session.episodeId, ++this.loadSeq, {
        autoplay: false,
        rate: session.rate,
      }).catch(() => {});
    }
    usePlayerStore.setState({ ready: true });
  }

  // ------------------------------------------------------------ loading

  /** Loads an episode (local file preferred) and optionally starts it. */
  async load(
    episodeId: string,
    options: { autoplay?: boolean; startAt?: number } = {},
  ): Promise<void> {
    const token = ++this.loadSeq;
    await this.init();
    if (token !== this.loadSeq) return;
    await this.loadEpisode(episodeId, token, options);
  }

  private async loadEpisode(
    episodeId: string,
    token: number,
    options: { autoplay?: boolean; startAt?: number; rate?: number },
  ): Promise<void> {
    const autoplay = options.autoplay ?? true;
    const stale = () => token !== this.loadSeq;

    if (this.current?.id === episodeId) {
      if (options.startAt != null) await this.seekTo(options.startAt);
      if (stale()) return;
      // play() rewinds first if this episode already finished.
      if (autoplay) this.play();
      return;
    }

    const episode = await getEpisode(episodeId);
    if (stale()) return;
    if (!episode) throw new Error(`Episode ${episodeId} not found`);

    // The episode row already carries progress and download state; only a
    // finished download needs its file path looked up.
    const localUri =
      episode.downloadState === "done"
        ? await downloadManager.localUriFor(episodeId)
        : null;
    if (stale()) return;
    const settings = await ensureSettingsHydrated();
    if (stale()) return;

    this.flushProgress();
    this.progress.reset();
    this.tracker.reset();

    const start =
      options.startAt ?? resolveResumePosition(episode, episode.duration);
    const rate = resolveStartRate({
      explicit: options.rate,
      userRate: this.userRate,
      defaultRate: settings.defaultRate,
    });

    this.current = episode;
    this.finished = false;
    this.durationLearned = !!episode.duration;
    this.pendingSeek = start > 0 ? start : null;
    this.autoplayOnLoad = autoplay;

    const queue = Queue.onStartPlaying(
      usePlayerStore.getState().queue,
      episodeId,
    );
    usePlayerStore.setState({
      nowPlaying: {
        episodeId,
        podcastId: episode.podcastId,
        title: episode.title,
        podcastTitle: episode.podcastTitle,
        artworkUrl: episode.artworkUrl ?? episode.podcastArtworkUrl,
        chapters: episode.chapters,
        isLocal: !!localUri,
      },
      status: {
        ...INITIAL_STATUS,
        position: start,
        duration: episode.duration ?? 0,
        rate,
      },
      queue,
      pausedExternally: false,
    });
    void saveQueue(queue);

    this.replaceSource(localUri ?? episode.audioUrl, episode.title, rate);
    await this.ensureLockScreen(episode, token);
    if (stale()) return;

    if (autoplay) {
      if (this.pendingSeek == null) {
        this.play();
      } else {
        // Start only after the resume seek lands, or the first second of
        // audio blips out from 0:00.
        this.tracker.command("play");
        this.sleepFired = false;
      }
    }
    void kvSet(SESSION_KEY, { episodeId, rate } satisfies Session);

    // podcast:chapters JSON is fetched lazily; patch it in when it arrives.
    if (episode.chapters.length === 0 && episode.chaptersUrl) {
      void ensureChapters(episode).then((chapters) => {
        const np = usePlayerStore.getState().nowPlaying;
        if (chapters.length > 0 && np?.episodeId === episodeId) {
          usePlayerStore.setState({ nowPlaying: { ...np, chapters } });
        }
      });
    }
  }

  /**
   * Swaps the player's source without starting it. Native replace() resumes
   * on its own when the old item was playing, which would play the new one
   * from 0:00 until the resume seek lands; pausing first leaves the start to
   * the caller (or to the pending-seek handler in onStatus).
   */
  private replaceSource(uri: string, name: string, rate: number) {
    const player = this.player!;
    player.pause();
    player.replace({ uri, name });
    player.setPlaybackRate(rate);
    player.volume = 1;
  }

  /**
   * Moves the current episode off its downloaded file onto the stream, at the
   * same position, so the file can be deleted under it. No-op otherwise.
   */
  releaseLocalFile(episodeId: string) {
    const np = usePlayerStore.getState().nowPlaying;
    const cur = this.current;
    if (!this.player || !cur || cur.id !== episodeId || !np?.isLocal) return;
    const { position, playing, rate } = usePlayerStore.getState().status;
    this.pendingSeek = position > 0 ? position : null;
    this.autoplayOnLoad = playing;
    this.replaceSource(cur.audioUrl, cur.title, rate);
    usePlayerStore.setState((s) => ({
      nowPlaying: { ...np, isLocal: false },
      status: { ...s.status, loaded: false },
    }));
    if (playing && this.pendingSeek == null) this.play();
  }

  private async ensureLockScreen(episode: EpisodeDetail, token: number) {
    const player = this.player!;
    if (Platform.OS === "android" && !this.askedNotificationPermission) {
      // Android 13+ needs POST_NOTIFICATIONS for the media notification.
      this.askedNotificationPermission = true;
      await requestNotificationPermissionsAsync().catch(() => {});
    }
    // A newer load owns the lock screen now; don't overwrite its metadata.
    if (token !== this.loadSeq) return;
    activateLockScreen(
      player,
      metadataFor(
        {
          title: episode.title,
          artworkUrl: episode.artworkUrl ?? episode.podcastArtworkUrl,
        },
        episode.podcastTitle,
      ),
    );
    this.lockScreenActive = true;
  }

  // ------------------------------------------------------------ transport

  play() {
    if (!this.player || !this.current) return;
    this.tracker.command("play");
    this.sleepFired = false;
    // If a load is still pending, the status handler starts playback once loaded.
    this.autoplayOnLoad = true;
    usePlayerStore.setState({ pausedExternally: false });

    const { position, duration, loaded } = usePlayerStore.getState().status;
    if (this.finished || (loaded && isAtEnd(position, duration))) {
      // Parked at the end: both native players ignore play() there, so the
      // button would do nothing. Rewind, then start (unless paused meanwhile).
      this.finished = false;
      usePlayerStore.setState((s) => ({
        status: { ...s.status, position: 0 },
      }));
      const player = this.player;
      void player.seekTo(0).then(() => {
        if (this.autoplayOnLoad && player === this.player) player.play();
      });
      return;
    }
    this.player.play();
  }

  pause() {
    if (!this.player) return;
    this.tracker.command("pause");
    this.autoplayOnLoad = false;
    this.player.pause();
    this.flushProgress();
    invalidateProgress();
  }

  toggle() {
    if (usePlayerStore.getState().status.playing) this.pause();
    else this.play();
  }

  async seekTo(seconds: number) {
    if (!this.player || !this.current) return;
    this.finished = false;
    const { duration } = usePlayerStore.getState().status;
    const target = Math.max(
      0,
      duration > 0 ? Math.min(seconds, duration - 1) : seconds,
    );
    usePlayerStore.setState((s) => ({
      status: { ...s.status, position: target },
    }));
    if (!usePlayerStore.getState().status.loaded) {
      this.pendingSeek = target;
      return;
    }
    await this.player.seekTo(target);
    this.flushProgress(target);
  }

  skipBy(deltaSec: number) {
    const { position } = usePlayerStore.getState().status;
    void this.seekTo(position + deltaSec);
  }

  skipForward() {
    this.skipBy(getSettings().skipForwardSec);
  }

  skipBack() {
    this.skipBy(-getSettings().skipBackSec);
  }

  setRate(rate: number) {
    const clamped = clampRate(rate);
    // An explicit choice: it carries over to the next episodes this run.
    this.userRate = clamped;
    this.player?.setPlaybackRate(clamped);
    usePlayerStore.setState((s) => ({
      status: { ...s.status, rate: clamped },
    }));
    const id = this.current?.id;
    if (id)
      void kvSet(SESSION_KEY, {
        episodeId: id,
        rate: clamped,
      } satisfies Session);
  }

  /** Skip to the next queued episode (marks nothing as played). */
  async next() {
    const { next } = Queue.takeNext(usePlayerStore.getState().queue);
    if (!next) return;
    // load() drops it from the queue once it actually starts.
    await this.load(next, { autoplay: true });
  }

  async stop() {
    this.flushProgress();
    this.player?.pause();
    if (this.player && this.lockScreenActive) clearLockScreen(this.player);
    this.lockScreenActive = false;
    this.current = null;
    this.sleep.cancel();
    usePlayerStore.setState({
      nowPlaying: null,
      status: INITIAL_STATUS,
      sleepOption: { kind: "off" },
    });
  }

  // ------------------------------------------------------------ queue

  private setQueue(queue: QueueItem[]) {
    usePlayerStore.setState({ queue });
    void saveQueue(queue);
  }

  playNext(episodeId: string) {
    if (episodeId === this.current?.id) return;
    this.setQueue(Queue.addNext(usePlayerStore.getState().queue, episodeId));
  }

  addToQueue(episodeId: string) {
    if (episodeId === this.current?.id) return;
    this.setQueue(Queue.addLast(usePlayerStore.getState().queue, episodeId));
  }

  removeFromQueue(episodeId: string) {
    this.setQueue(Queue.without(usePlayerStore.getState().queue, episodeId));
  }

  moveInQueue(from: number, to: number) {
    this.setQueue(Queue.moveItem(usePlayerStore.getState().queue, from, to));
  }

  clearQueue() {
    this.setQueue([]);
  }

  // ------------------------------------------------------------ misc

  setSleepTimer(option: SleepTimerOption) {
    usePlayerStore.setState({ sleepOption: option });
    this.sleep.start(option);
  }

  async markPlayed(episodeId: string, played: boolean) {
    await setPlayed(episodeId, played);
    if (played) void downloadManager.onEpisodePlayed();
    invalidateProgress();
  }

  private flushProgress(position?: number) {
    const cur = this.current;
    if (!cur) return;
    const { status } = usePlayerStore.getState();
    void this.progress.flush({
      episodeId: cur.id,
      position: position ?? status.position,
      duration: status.duration || cur.duration,
    });
  }

  // ------------------------------------------------------------ events

  private onStatus(s: AudioStatus) {
    const cur = this.current;
    if (!cur || !this.player) return;

    const kind = this.tracker.observe(s);
    const prev = usePlayerStore.getState();

    usePlayerStore.setState({
      status: {
        position: s.currentTime,
        duration: s.duration > 0 ? s.duration : prev.status.duration,
        playing: s.playing,
        buffering: s.isBuffering,
        loaded: s.isLoaded,
        rate: prev.status.rate,
        error: s.error ?? null,
      },
      pausedExternally:
        kind === "externalPause"
          ? true
          : s.playing
            ? false
            : prev.pausedExternally,
    });

    if (s.isLoaded && this.pendingSeek != null) {
      const target = this.pendingSeek;
      const token = this.loadSeq;
      this.pendingSeek = null;
      void this.player.seekTo(target).then(() => {
        // A newer load starts its own source; don't start it early.
        if (token !== this.loadSeq || this.current !== cur) return;
        if (this.autoplayOnLoad && !this.player?.playing) this.player?.play();
      });
    }

    if (s.isLoaded && s.duration > 0 && !this.durationLearned) {
      this.durationLearned = true;
      void setEpisodeDuration(cur.id, s.duration);
    }

    if (s.playing) {
      this.progress.sample({
        episodeId: cur.id,
        position: s.currentTime,
        duration: s.duration || null,
      });
    }
    if (kind === "externalPause") {
      this.flushProgress(s.currentTime);
    }
    // Lock screen / headphone play after the timer paused: the user is back.
    if (kind === "externalPlay") this.sleepFired = false;
    if (kind === "finished") {
      this.finished = true;
      void this.onFinished(cur.id).catch(() => {});
    }
  }

  private async onFinished(episodeId: string) {
    // Decide before the first await: the timer can flip sleepOption to "off"
    // while saveProgress is in flight (see shouldAdvanceAfterFinish).
    const optionAtFinish = usePlayerStore.getState().sleepOption;
    // "End of episode" is done: clear it now (restores the faded volume).
    if (optionAtFinish.kind === "endOfEpisode") {
      this.setSleepTimer({ kind: "off" });
    }
    const duration = usePlayerStore.getState().status.duration;
    await saveProgress({
      episodeId,
      position: duration,
      duration,
      played: true,
    });
    void downloadManager.onEpisodePlayed();
    invalidateProgress();

    // A sleep timer that ended this episode, or already paused us, wins over
    // the queue.
    if (!shouldAdvanceAfterFinish(optionAtFinish, this.sleepFired)) return;
    const { next } = Queue.takeNext(usePlayerStore.getState().queue);
    if (next) {
      // load() removes `next` from the queue (and persists it) only once the
      // episode is found. Shortening the queue first lost the item when the
      // load threw, and raced load()'s own saveQueue.
      await this.load(next, { autoplay: true }).catch(() => {});
    }
  }
}

export const playbackService = new PlaybackService();

import {
  createSleepTimer,
  fadeVolume,
  shouldAdvanceAfterFinish,
  SLEEP_FADE_MS,
  sleepRemainingMs,
} from "@/src/projects/podcast-player/playback/sleepTimer";

describe("sleep timer math", () => {
  it("fades linearly over the last 10 s", () => {
    expect(fadeVolume(SLEEP_FADE_MS + 1)).toBe(1);
    expect(fadeVolume(SLEEP_FADE_MS / 2)).toBeCloseTo(0.5);
    expect(fadeVolume(0)).toBe(0);
    expect(fadeVolume(Number.NaN)).toBe(0);
  });

  it("counts minutes in wall-clock time", () => {
    expect(
      sleepRemainingMs(
        { kind: "minutes", minutes: 15 },
        { startedAt: 0, now: 60_000, episodeRemainingSec: 0, rate: 1 },
      ),
    ).toBe(14 * 60_000);
  });

  it("scales end-of-episode by playback rate", () => {
    const ctx = { startedAt: 0, now: 0, episodeRemainingSec: 600, rate: 2 };
    expect(sleepRemainingMs({ kind: "endOfEpisode" }, ctx)).toBe(300_000);
    expect(sleepRemainingMs({ kind: "off" }, ctx)).toBeNull();
  });
});

describe("createSleepTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup(playing = true) {
    let clock = 0;
    const deps = {
      getEpisodeRemainingSec: () => 1_000,
      getRate: () => 1,
      isPlaying: () => playing,
      setVolume: jest.fn(),
      onExpire: jest.fn(),
      now: () => clock,
    };
    const timer = createSleepTimer(deps);
    const advance = (ms: number) => {
      for (let t = 0; t < ms; t += 250) {
        clock += 250;
        jest.advanceTimersByTime(250);
      }
    };
    return { timer, deps, advance };
  }

  it("fades out, pauses once at zero, then restores full volume", () => {
    const { timer, deps, advance } = setup();
    timer.start({ kind: "minutes", minutes: 1 });

    advance(55_000); // inside the fade window
    const faded = deps.setVolume.mock.calls.at(-1)?.[0];
    expect(faded).toBeGreaterThan(0);
    expect(faded).toBeLessThan(1);

    advance(10_000);
    expect(deps.onExpire).toHaveBeenCalledTimes(1);
    expect(deps.setVolume).toHaveBeenLastCalledWith(1);
    expect(timer.option).toEqual({ kind: "off" });
  });

  it("cancel mid-fade restores volume and never pauses", () => {
    const { timer, deps, advance } = setup();
    timer.start({ kind: "minutes", minutes: 1 });
    advance(55_000);
    timer.cancel();
    advance(20_000);
    expect(deps.onExpire).not.toHaveBeenCalled();
    expect(deps.setVolume).toHaveBeenLastCalledWith(1);
  });
});

describe("shouldAdvanceAfterFinish", () => {
  it("advances with no timer, or a minutes timer that hasn't fired", () => {
    expect(shouldAdvanceAfterFinish({ kind: "off" }, false)).toBe(true);
    expect(
      shouldAdvanceAfterFinish({ kind: "minutes", minutes: 30 }, false),
    ).toBe(true);
  });

  it("stops for end-of-episode, even if the timer already reset itself", () => {
    expect(shouldAdvanceAfterFinish({ kind: "endOfEpisode" }, false)).toBe(
      false,
    );
    expect(shouldAdvanceAfterFinish({ kind: "endOfEpisode" }, true)).toBe(
      false,
    );
  });

  it("stops when the timer fired before the finish event or during its await", () => {
    // By then the store already says "off"; the fired flag is what remembers.
    expect(shouldAdvanceAfterFinish({ kind: "off" }, true)).toBe(false);
    expect(
      shouldAdvanceAfterFinish({ kind: "minutes", minutes: 15 }, true),
    ).toBe(false);
  });
});

describe("end-of-episode timer races the finish event", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("expires on its own once the position reaches the end while still playing", () => {
    // This is why the finish handler can't trust `sleepOption` later: the
    // timer may already have fired and switched itself off.
    let remainingSec = 0.2;
    const deps = {
      getEpisodeRemainingSec: () => remainingSec,
      getRate: () => 1,
      isPlaying: () => true,
      setVolume: jest.fn(),
      onExpire: jest.fn(),
    };
    const timer = createSleepTimer(deps);
    timer.start({ kind: "endOfEpisode" });
    expect(deps.onExpire).not.toHaveBeenCalled();

    remainingSec = 0; // last status tick before didJustFinish: at the end, still playing
    jest.advanceTimersByTime(250);
    expect(deps.onExpire).toHaveBeenCalledTimes(1);
    expect(timer.option).toEqual({ kind: "off" });
  });

  it("does not expire once the player reports it stopped", () => {
    // expo-audio's didJustFinish status carries playing: false, so an
    // end-of-episode timer left running is inert and the finish handler owns it.
    const deps = {
      getEpisodeRemainingSec: () => 0,
      getRate: () => 1,
      isPlaying: () => false,
      setVolume: jest.fn(),
      onExpire: jest.fn(),
    };
    const timer = createSleepTimer(deps);
    timer.start({ kind: "endOfEpisode" });
    jest.advanceTimersByTime(5_000);
    expect(deps.onExpire).not.toHaveBeenCalled();
    expect(timer.option).toEqual({ kind: "endOfEpisode" });
  });
});

import voice from "./voice.json";

// Scene lengths come from the narration (src/voice.json, written by
// `npm run voice`), so a different voice or script re-fits the timeline.

export const FPS = 30;
/** Frames a scene spends leaving. The next scene only starts after this. */
export const EXIT = 14;
/** Narration starts this many frames into each scene. */
export const VO_START = 6;

type ClipId = keyof typeof voice.clips;
const frames = (id: ClipId) => Math.ceil(voice.clips[id] * FPS);

/** Long enough for the scene's own motion and its narration, plus the exit. */
const fit = (minMotion: number, id: ClipId, hold = 12) =>
  Math.max(minMotion, VO_START + frames(id) + hold) + EXIT;

const PROJECT_CLIPS: ClipId[] = ["p1", "p2", "p3", "p4", "p5", "p6"];

export type Spot = { from: number; frames: number };

// Each project card is spotlit while its line is spoken.
const SPOT_START = Math.max(84, VO_START + frames("projects") + 6);
export const PROJECT_SPOTS: Spot[] = [];
let cursor = SPOT_START;
for (const id of PROJECT_CLIPS) {
  const length = Math.max(30, frames(id) + 6);
  PROJECT_SPOTS.push({ from: cursor, frames: length });
  cursor += length;
}

export const SCENE_FRAMES = {
  intro: fit(95, "intro"),
  stack: fit(90, "stack"),
  projects: cursor + 14 + EXIT,
  path: fit(120, "path"),
  quiz: fit(115, "quiz"),
  // The last scene doesn't leave; it holds the call to action.
  cta: Math.max(100, VO_START + frames("cta") + 36),
};

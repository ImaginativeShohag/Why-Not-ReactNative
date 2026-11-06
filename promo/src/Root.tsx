import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Freeze,
  interpolate,
  Series,
  useCurrentFrame,
} from "remotion";
import { Sfx } from "./audio";
import { Background } from "./components";
import { CtaScene } from "./scenes/CtaScene";
import { IntroScene } from "./scenes/IntroScene";
import { PathScene } from "./scenes/PathScene";
import { ProjectsScene } from "./scenes/ProjectsScene";
import { QuizScene } from "./scenes/QuizScene";
import { StackScene } from "./scenes/StackScene";
import { EXIT, FPS, SCENE_FRAMES } from "./timeline";

// Scenes play strictly one after another: each one leaves completely before
// the next one's first element appears.
const SCENES = [
  { id: "intro", frames: SCENE_FRAMES.intro, Component: IntroScene },
  { id: "stack", frames: SCENE_FRAMES.stack, Component: StackScene },
  { id: "projects", frames: SCENE_FRAMES.projects, Component: ProjectsScene },
  { id: "path", frames: SCENE_FRAMES.path, Component: PathScene },
  { id: "quiz", frames: SCENE_FRAMES.quiz, Component: QuizScene },
  { id: "cta", frames: SCENE_FRAMES.cta, Component: CtaScene },
];
const DURATION = SCENES.reduce((sum, scene) => sum + scene.frames, 0);

/** Lifts, shrinks and blurs the scene away over its last EXIT frames. */
const SceneExit: React.FC<{
  frames: number;
  exit: boolean;
  children: React.ReactNode;
}> = ({ frames, exit, children }) => {
  const frame = useCurrentFrame();
  // Fully gone two frames before the scene ends.
  const p = exit
    ? interpolate(frame, [frames - EXIT, frames - 2], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.cubic),
      })
    : 0;
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - p,
        transform: `translateY(${-50 * p}px) scale(${1 - 0.05 * p})`,
        filter: `blur(${p * 12}px)`,
      }}
    >
      {children}
      {exit ? <Sfx name="swish" at={frames - EXIT} volume={0.3} /> : null}
    </AbsoluteFill>
  );
};

const Promo: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Series>
      {SCENES.map(({ id, frames, Component }, i) => (
        <Series.Sequence key={id} durationInFrames={frames} name={id}>
          <SceneExit frames={frames} exit={i < SCENES.length - 1}>
            <Component />
          </SceneExit>
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);

const POSTER_FRAME = 110;

/** The closing scene once it has settled, for the <video> poster. */
const Poster: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Freeze frame={POSTER_FRAME}>
      <CtaScene />
    </Freeze>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
    {/* Not a <Still>: frames are clamped to the composition's length, so a
        1-frame still would freeze the scene at frame 0. Renders frame 0. */}
    <Composition
      id="Poster"
      component={Poster}
      durationInFrames={POSTER_FRAME + 1}
      fps={FPS}
      width={1920}
      height={1080}
    />
    {/* The same video, laid out for Reels, Shorts and Stories. */}
    <Composition
      id="PromoPortrait"
      component={Promo}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="PosterPortrait"
      component={Poster}
      durationInFrames={POSTER_FRAME + 1}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);

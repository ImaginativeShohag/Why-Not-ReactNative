import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Eyebrow,
  GradientText,
  Logo,
  Reveal,
  Stage,
  StaggerText,
  useIsPortrait,
} from "../components";
import { Sfx, Voice } from "../audio";
import { VO_START } from "../timeline";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = useIsPortrait();
  const pop = spring({ frame, fps, config: { damping: 11, stiffness: 120 } });
  const check = interpolate(frame, [14, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <Stage gap={34}>
        <div
          style={{
            transform: `scale(${0.3 + pop * 0.7}) rotate(${(1 - pop) * -18}deg)`,
            filter: `drop-shadow(0 20px 60px rgba(99, 102, 241, ${0.6 * pop}))`,
          }}
        >
          <Logo size={portrait ? 200 : 170} check={check} id="intro-logo" />
        </div>
        <StaggerText
          text="Why-Not-ReactNative"
          delay={18}
          step={1.3}
          style={{
            fontSize: portrait ? 84 : 96,
            fontWeight: 800,
            letterSpacing: -2,
          }}
        />
        <Reveal delay={48}>
          <Eyebrow>Learn by building</Eyebrow>
        </Reveal>
        <Reveal delay={58}>
          <div
            style={{
              fontSize: portrait ? 72 : 64,
              fontWeight: 700,
              letterSpacing: -1,
              textAlign: "center",
              maxWidth: portrait ? 900 : undefined,
              lineHeight: 1.2,
            }}
          >
            Expo &amp; React Native,{" "}
            <GradientText shimmer={interpolate(frame, [58, 120], [0, 100])}>
              built for production.
            </GradientText>
          </div>
        </Reveal>
      </Stage>
      <Voice id="intro" at={VO_START} />
      <Sfx name="pop" at={0} volume={0.45} />
      <Sfx name="tick" at={34} volume={0.3} />
      <Sfx name="whoosh" at={16} volume={0.25} />
      <Sfx name="whoosh" at={54} volume={0.2} />
    </>
  );
};

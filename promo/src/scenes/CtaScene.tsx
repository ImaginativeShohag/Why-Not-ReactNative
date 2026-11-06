import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  GradientText,
  Logo,
  Reveal,
  Stage,
  useIsPortrait,
} from "../components";
import { COLORS, GRADIENT, SITE_URL } from "../theme";
import { Sfx, Voice } from "../audio";
import { VO_START } from "../timeline";

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = useIsPortrait();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const check = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 1 + Math.sin(frame / 9) * 0.015;

  return (
    <>
      <Stage gap={36} style={{ textAlign: "center" }}>
        <div
          style={{
            transform: `scale(${pop})`,
            filter: "drop-shadow(0 20px 60px rgba(99, 102, 241, 0.6))",
          }}
        >
          <Logo size={portrait ? 180 : 140} check={check} id="cta-logo" />
        </div>
        <Reveal delay={8}>
          <div
            style={{
              fontSize: portrait ? 86 : 104,
              fontWeight: 800,
              letterSpacing: -2.5,
            }}
          >
            <GradientText shimmer={interpolate(frame, [0, 135], [0, 100])}>
              Why-Not-ReactNative
            </GradientText>
          </div>
        </Reveal>
        <Reveal delay={18}>
          <div
            style={{
              fontSize: portrait ? 48 : 40,
              color: COLORS.dim,
              fontWeight: 500,
              maxWidth: portrait ? 820 : undefined,
              lineHeight: 1.3,
            }}
          >
            Build six real apps.{portrait ? <br /> : " "}Ship them like
            production.
          </div>
        </Reveal>
        <Reveal delay={32} style={{ marginTop: 20 }}>
          <div
            style={{
              padding: 3,
              borderRadius: 999,
              background: GRADIENT,
              transform: `scale(${pulse})`,
              boxShadow: "0 0 60px rgba(129, 140, 248, 0.45)",
            }}
          >
            <div
              style={{
                padding: "22px 48px",
                borderRadius: 999,
                background: COLORS.bg,
                fontSize: 40,
                fontWeight: 700,
              }}
            >
              Start the learning path →
            </div>
          </div>
        </Reveal>
        <Reveal delay={44}>
          <div
            style={{
              fontSize: portrait ? 34 : 32,
              color: COLORS.fg,
              fontWeight: 600,
            }}
          >
            {SITE_URL}
          </div>
        </Reveal>
        <Reveal delay={52}>
          <div
            style={{
              fontSize: portrait ? 30 : 26,
              color: COLORS.faint,
              maxWidth: portrait ? 820 : undefined,
              lineHeight: 1.4,
            }}
          >
            Free and open source · write-ups, quizzes and the full code on
            GitHub
          </div>
        </Reveal>
      </Stage>
      <Voice id="cta" at={VO_START} />
      <Sfx name="pop" at={0} volume={0.45} />
      <Sfx name="tick" at={24} volume={0.3} />
      <Sfx name="whoosh" at={8} volume={0.22} />
      <Sfx name="click" at={34} volume={0.3} />
    </>
  );
};

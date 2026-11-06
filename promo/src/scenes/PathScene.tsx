import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientText, Reveal, Stage, useIsPortrait } from "../components";
import { COLORS, GRADIENT } from "../theme";
import { Sfx, Voice } from "../audio";
import { VO_START } from "../timeline";

const STEPS = [
  { num: "00", label: "Launcher" },
  { num: "01", label: "Journal" },
  { num: "02", label: "Camera" },
  { num: "03", label: "Commerce" },
  { num: "04", label: "Fitness" },
  { num: "05", label: "Podcast" },
  { num: "06", label: "Tic-tac-toe" },
];

const STATS = [
  { value: 6, suffix: "", label: "Projects" },
  { value: 7, suffix: "", label: "Write-ups" },
  { value: 300, suffix: "+", label: "Quiz questions" },
];

// The track runs left to right, or top to bottom in portrait.
const LENGTH = 1500;
const LENGTH_PORTRAIT = 840;
const NODE = 90;
const DRAW_FROM = 14;
const DRAW_TO = 80;

export const PathScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = useIsPortrait();
  const length = portrait ? LENGTH_PORTRAIT : LENGTH;
  // Places a bar or node along the track, `along` px from its start.
  const onTrack = (along: number, size: number): React.CSSProperties =>
    portrait
      ? { top: along, left: 0, height: size }
      : { left: along, top: 0, width: size };
  const draw = interpolate(frame, [DRAW_FROM, DRAW_TO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <>
      <Stage gap={portrait ? 80 : 90}>
        <Reveal>
          <div
            style={{
              fontSize: portrait ? 84 : 76,
              fontWeight: 800,
              letterSpacing: -1.5,
              textAlign: "center",
              maxWidth: portrait ? 900 : undefined,
              lineHeight: 1.15,
            }}
          >
            A <GradientText>step-by-step</GradientText> learning path
          </div>
        </Reveal>

        <div
          style={{
            position: "relative",
            width: portrait ? 320 : length,
            height: portrait ? length : 170,
            margin: portrait ? `${NODE / 2}px 0` : undefined,
          }}
        >
          <div
            style={{
              position: "absolute",
              [portrait ? "left" : "top"]: NODE / 2 - 3,
              [portrait ? "width" : "height"]: 6,
              [portrait ? "height" : "width"]: length,
              borderRadius: 3,
              background: "rgba(148, 163, 184, 0.15)",
            }}
          />
          <div
            style={{
              position: "absolute",
              [portrait ? "left" : "top"]: NODE / 2 - 3,
              [portrait ? "width" : "height"]: 6,
              [portrait ? "height" : "width"]: length * draw,
              borderRadius: 3,
              background: GRADIENT,
              boxShadow: "0 0 24px rgba(129, 140, 248, 0.7)",
            }}
          />
          {STEPS.map((step, i) => {
            const at = i / (STEPS.length - 1);
            const reach = DRAW_FROM + (DRAW_TO - DRAW_FROM) * at;
            const p = spring({
              frame: frame - reach,
              fps,
              config: { damping: 10, stiffness: 160 },
            });
            return (
              <div
                key={step.num}
                style={{
                  position: "absolute",
                  ...onTrack(length * at - NODE / 2, NODE),
                  display: "flex",
                  flexDirection: portrait ? "row" : "column",
                  alignItems: "center",
                  gap: portrait ? 32 : 20,
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: NODE,
                    height: NODE,
                    borderRadius: "50%",
                    padding: 4,
                    background: GRADIENT,
                    transform: `scale(${p})`,
                    boxShadow: `0 0 ${40 * p}px rgba(34, 211, 238, 0.5)`,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: COLORS.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 32,
                      fontWeight: 800,
                    }}
                  >
                    {step.num}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: portrait ? 40 : 28,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: COLORS.dim,
                    opacity: p,
                    transform: portrait
                      ? `translateX(${(1 - p) * -20}px)`
                      : `translateY(${(1 - p) * 20}px)`,
                  }}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: portrait ? 80 : 140 }}>
          {STATS.map((stat, i) => {
            const start = 70 + i * 8;
            const count = Math.round(
              interpolate(frame, [start, start + 30], [0, stat.value], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }),
            );
            return (
              <Reveal
                key={stat.label}
                delay={start}
                style={{ textAlign: "center" }}
              >
                <GradientText
                  style={{ fontSize: portrait ? 100 : 110, fontWeight: 800 }}
                >
                  {count}
                  {stat.suffix}
                </GradientText>
                <div
                  style={{ fontSize: 30, color: COLORS.dim, fontWeight: 600 }}
                >
                  {stat.label}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Stage>
      <Voice id="path" at={VO_START} />
      <Sfx name="whoosh" at={0} volume={0.25} />
      <Sfx name="rise" at={DRAW_FROM} volume={0.16} />
      {STEPS.map((step, i) => (
        <Sfx
          key={step.num}
          name="pop"
          at={DRAW_FROM + ((DRAW_TO - DRAW_FROM) * i) / (STEPS.length - 1)}
          volume={0.22}
        />
      ))}
      {STATS.map((stat, i) => (
        <Sfx key={stat.label} name="tick" at={70 + i * 8} volume={0.25} />
      ))}
    </>
  );
};

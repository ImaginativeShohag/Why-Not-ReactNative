import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientText, Reveal, Stage, useIsPortrait } from "../components";
import { COLORS } from "../theme";
import { Sfx, Voice } from "../audio";
import { VO_START } from "../timeline";

const STACK = [
  "Expo SDK 57",
  "React Native 0.86",
  "React 19.2 + Compiler",
  "TypeScript 6",
  "New Architecture",
  "Expo Router",
  "TanStack Query v5",
  "Zustand v5",
  "expo-sqlite",
  "Reanimated 4",
  "Skia",
  "FlashList v2",
  "Gesture Handler",
  "EAS Build & Update",
  "Jest + Maestro",
];

const DOTS = [COLORS.indigo, COLORS.violet, COLORS.cyan];

export const StackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = useIsPortrait();

  return (
    <>
      <Stage gap={portrait ? 80 : 60}>
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
            One modern stack, <GradientText>end to end.</GradientText>
          </div>
        </Reveal>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: portrait ? 24 : 22,
            width: portrait ? 980 : 1500,
          }}
        >
          {STACK.map((label, i) => {
            const p = spring({
              frame: frame - 12 - i * 3.5,
              fps,
              config: { damping: 12, stiffness: 140 },
            });
            const float = Math.sin(frame / 18 + i * 1.7) * 6;
            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: portrait ? "20px 32px" : "18px 30px",
                  borderRadius: 999,
                  fontSize: portrait ? 38 : 34,
                  fontWeight: 600,
                  background: "rgba(22, 25, 37, 0.8)",
                  border: `1.5px solid ${COLORS.border}`,
                  opacity: Math.min(1, p * 1.5),
                  transform: `translateY(${(1 - p) * 80 + float}px) scale(${0.6 + p * 0.4})`,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: DOTS[i % DOTS.length],
                    boxShadow: `0 0 18px ${DOTS[i % DOTS.length]}`,
                  }}
                />
                {label}
              </div>
            );
          })}
        </div>
      </Stage>
      <Voice id="stack" at={VO_START} />
      <Sfx name="whoosh" at={0} volume={0.25} />
      {STACK.map((label, i) => (
        <Sfx
          key={label}
          name={i % 2 ? "pop-low" : "pop"}
          at={12 + i * 3.5}
          volume={0.18}
        />
      ))}
    </>
  );
};

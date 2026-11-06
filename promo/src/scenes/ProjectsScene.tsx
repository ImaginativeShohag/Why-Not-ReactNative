import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientText, Reveal, Stage, useIsPortrait } from "../components";
import { COLORS, GRADIENT } from "../theme";
import { Sfx, Voice } from "../audio";
import { PROJECT_SPOTS, VO_START } from "../timeline";

const PROJECTS = [
  {
    num: "01",
    emoji: "📓",
    title: "Offline-first journal",
    tech: "SQLite · FTS · outbox sync · biometric lock",
  },
  {
    num: "02",
    emoji: "📷",
    title: "Camera & social capture",
    tech: "Camera · Skia editor · media library · sharing",
  },
  {
    num: "03",
    emoji: "🛍",
    title: "Production commerce app",
    tech: "Auth refresh · checkout · payments · push",
  },
  {
    num: "04",
    emoji: "🏃",
    title: "Background fitness tracker",
    tech: "Location · sensors · Expo Module · widgets",
  },
  {
    num: "05",
    emoji: "🎧",
    title: "Podcast player & release",
    tech: "Audio · downloads · EAS Update · CI",
  },
  {
    num: "06",
    emoji: "🎮",
    title: "Tic-tac-toe vs. the CPU",
    tech: "Zustand persist · minimax · Reanimated + SVG",
  },
];

// Each card is spotlit while its narration line plays (see timeline.ts).
const SPOT_START = PROJECT_SPOTS[0].from;
const LAST_SPOT = PROJECT_SPOTS[PROJECT_SPOTS.length - 1];
const SPOT_END = LAST_SPOT.from + LAST_SPOT.frames;

export const ProjectsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Portrait stacks the cards in one column, each laid out as a row.
  const portrait = useIsPortrait();
  const spotOn = interpolate(
    frame,
    [SPOT_START - 6, SPOT_START + 4, SPOT_END - 4, SPOT_END + 6],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      <Stage gap={portrait ? 60 : 56}>
        <div style={{ textAlign: "center", maxWidth: portrait ? 920 : undefined }}>
          <Reveal>
            <div
              style={{
                fontSize: 76,
                fontWeight: 800,
                letterSpacing: -1.5,
                lineHeight: 1.15,
              }}
            >
              Six <GradientText>production-grade</GradientText> projects
            </div>
          </Reveal>
          <Reveal delay={8}>
            <div
              style={{
                fontSize: 34,
                color: COLORS.dim,
                marginTop: 14,
                lineHeight: 1.35,
              }}
            >
              One launcher app. Isolated vertical slices. Real native code.
            </div>
          </Reveal>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: portrait ? "960px" : "repeat(3, 540px)",
            gap: portrait ? 24 : 32,
          }}
        >
          {PROJECTS.map((project, i) => {
            const enter = spring({
              frame: frame - 16 - i * 6,
              fps,
              config: { damping: 14, stiffness: 120 },
            });
            const spot = PROJECT_SPOTS[i];
            const local = frame - spot.from;
            const active = interpolate(
              local,
              [0, 8, spot.frames - 6, spot.frames + 2],
              [0, 1, 1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            const fill = interpolate(local, [0, spot.frames], [0, 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const opacity = enter * (1 - spotOn * 0.5 + active * 0.5);
            return (
              <div
                key={project.num}
                style={{
                  position: "relative",
                  height: portrait ? 172 : 250,
                  padding: portrait ? "0 36px" : "30px 34px",
                  borderRadius: 28,
                  overflow: "hidden",
                  background: COLORS.card,
                  border: `1.5px solid ${
                    active > 0.5 ? "rgba(129, 140, 248, 0.75)" : COLORS.border
                  }`,
                  boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 ${70 * active}px rgba(129, 140, 248, ${0.55 * active})`,
                  opacity,
                  transform: `translateY(${(1 - enter) * 120}px) scale(${(0.85 + enter * 0.15) * (1 + active * (portrait ? 0.04 : 0.06))})`,
                  display: "flex",
                  flexDirection: portrait ? "row" : "column",
                  alignItems: portrait ? "center" : undefined,
                  gap: portrait ? 30 : 14,
                }}
              >
                {portrait ? (
                  <>
                    <GradientText
                      style={{ fontSize: 64, fontWeight: 800, width: 84 }}
                    >
                      {project.num}
                    </GradientText>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 38, fontWeight: 700 }}>
                        {project.title}
                      </div>
                      <div style={{ fontSize: 25, color: COLORS.dim }}>
                        {project.tech}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 64,
                        transform: `scale(${1 + active * 0.25}) rotate(${active * -8}deg)`,
                      }}
                    >
                      {project.emoji}
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <GradientText style={{ fontSize: 58, fontWeight: 800 }}>
                        {project.num}
                      </GradientText>
                      <span
                        style={{
                          fontSize: 64,
                          transform: `scale(${1 + active * 0.25}) rotate(${active * -8}deg)`,
                        }}
                      >
                        {project.emoji}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 34,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.title}
                    </div>
                    <div
                      style={{
                        fontSize: 23,
                        color: COLORS.dim,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.tech}
                    </div>
                  </>
                )}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    height: 6,
                    width: `${fill}%`,
                    background: GRADIENT,
                    opacity: active,
                  }}
                />
              </div>
            );
          })}
        </div>
      </Stage>
      <Voice id="projects" at={VO_START} />
      <Sfx name="whoosh" at={0} volume={0.25} />
      {PROJECTS.map((project, i) => (
        <React.Fragment key={project.num}>
          <Sfx name="pop-low" at={16 + i * 6} volume={0.2} />
          <Sfx name="tick" at={PROJECT_SPOTS[i].from} volume={0.28} />
          <Voice id={`p${i + 1}`} at={PROJECT_SPOTS[i].from + 2} />
        </React.Fragment>
      ))}
    </>
  );
};

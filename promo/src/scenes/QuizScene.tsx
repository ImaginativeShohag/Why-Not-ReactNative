import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Card,
  GradientText,
  Reveal,
  Stage,
  useIsPortrait,
} from "../components";
import { COLORS, MONO } from "../theme";
import { Sfx, Voice } from "../audio";
import { VO_START } from "../timeline";

// src/projects/store/api/client.ts, trimmed. Each token is [text, colour].
const KW = "#c4b5fd";
const STR = "#67e8f9";
const FN = "#a5b4fc";
const PLAIN = COLORS.fg;
const DIM = COLORS.faint;
const CODE: [string, string][][] = [
  [
    ["import ", KW],
    ["sharedAxios ", PLAIN],
    ["from ", KW],
    ['"@/src/shared/api/axios"', STR],
    [";", DIM],
  ],
  [
    ["import ", KW],
    ["{ env } ", PLAIN],
    ["from ", KW],
    ['"@/src/shared/constants/env"', STR],
    [";", DIM],
  ],
  [],
  [
    ["export const ", KW],
    ["storeApi ", PLAIN],
    ["= ", DIM],
    ["sharedAxios", PLAIN],
    [".", DIM],
    ["create", FN],
    ["({", DIM],
  ],
  [
    ["  baseURL", PLAIN],
    [": ", DIM],
    ["env", PLAIN],
    [".", DIM],
    ["storeApiUrl", PLAIN],
    [",", DIM],
  ],
  [["});", DIM]],
  [],
  [
    ["export const ", KW],
    ["authApi ", PLAIN],
    ["= ", DIM],
    ["sharedAxios", PLAIN],
    [".", DIM],
    ["create", FN],
    ["({", DIM],
  ],
  [
    ["  baseURL", PLAIN],
    [": ", DIM],
    ["env", PLAIN],
    [".", DIM],
    ["storeApiUrl", PLAIN],
    [",", DIM],
  ],
  [["});", DIM]],
];
const TOTAL_CHARS = CODE.flat().reduce((sum, [text]) => sum + text.length, 0);

const CHOICES = [
  "Only to give each one a different baseURL",
  "Each instance gets its own interceptor chain, so the store's 401 refresh never touches other projects",
  "Axios can't share a timeout between instances",
];
const CORRECT = 1;
const PICK_AT = 78;
const CONFIRM_AT = 90;

const Code: React.FC<{ typed: number; frame: number }> = ({ typed, frame }) => {
  let left = typed;
  return (
    <div style={{ fontFamily: MONO, fontSize: 25, lineHeight: 1.75 }}>
      {CODE.map((line, row) => {
        const before = left;
        const tokens = line.map(([text, color], col) => {
          const shown = text.slice(0, Math.max(0, left));
          left -= text.length;
          return (
            <span key={col} style={{ color }}>
              {shown}
            </span>
          );
        });
        // The caret sits on the line being typed, then rests on the last one.
        const typing = before > 0 && (left <= 0 || row === CODE.length - 1);
        return (
          <div key={row} style={{ whiteSpace: "pre", minHeight: "1.75em" }}>
            <span style={{ color: DIM, display: "inline-block", width: 44 }}>
              {row + 1}
            </span>
            {tokens}
            {typing && Math.floor(frame / 8) % 2 === 0 ? (
              <span style={{ color: COLORS.cyan }}>▍</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const QuizScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Portrait stacks the question under the code.
  const portrait = useIsPortrait();
  const typed = interpolate(frame, [12, 70], [0, TOTAL_CHARS], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const picked = frame >= PICK_AT;
  const confirmed = spring({
    frame: frame - CONFIRM_AT,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  return (
    <>
      <Stage gap={portrait ? 48 : 56}>
        <Reveal>
          <div
            style={{
              fontSize: portrait ? 76 : 70,
              fontWeight: 800,
              letterSpacing: -1.5,
              textAlign: "center",
              maxWidth: portrait ? 900 : undefined,
              lineHeight: 1.15,
            }}
          >
            Quizzes that send you into{" "}
            <GradientText>the real code</GradientText>
          </div>
        </Reveal>

        <div
          style={{
            display: "flex",
            flexDirection: portrait ? "column" : "row",
            gap: portrait ? 32 : 40,
            alignItems: "stretch",
          }}
        >
          <Reveal delay={6} y={60}>
            <Card
              style={{
                width: portrait ? 960 : 860,
                height: portrait ? 560 : 610,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "20px 26px",
                  borderBottom: `1.5px solid ${COLORS.border}`,
                }}
              >
                {["#f87171", "#fbbf24", "#34d399"].map((c) => (
                  <span
                    key={c}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: c,
                    }}
                  />
                ))}
                <span
                  style={{
                    marginLeft: 16,
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.dim,
                  }}
                >
                  src/projects/store/api/client.ts
                </span>
              </div>
              <div style={{ padding: "26px 30px" }}>
                <Code typed={typed} frame={frame} />
              </div>
            </Card>
          </Reveal>

          <Reveal delay={22} y={60}>
            <Card
              style={{
                width: portrait ? 960 : 760,
                height: portrait ? undefined : 610,
                padding: "34px 38px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: COLORS.cyan,
                  textTransform: "uppercase",
                }}
              >
                Store · Question 02 · Level 1
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3 }}>
                Why does the store derive its own axios instances?
              </div>
              {CHOICES.map((choice, i) => {
                const p = spring({
                  frame: frame - 34 - i * 6,
                  fps,
                  config: { damping: 200 },
                });
                const isPick = picked && i === CORRECT;
                const green = i === CORRECT ? confirmed : 0;
                return (
                  <div
                    key={choice}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "18px 22px",
                      borderRadius: 18,
                      fontSize: 24,
                      lineHeight: 1.35,
                      color: picked && i !== CORRECT ? COLORS.faint : COLORS.fg,
                      border: `2px solid ${
                        green > 0.1
                          ? COLORS.green
                          : isPick
                            ? COLORS.indigo
                            : COLORS.border
                      }`,
                      background:
                        green > 0.1
                          ? `rgba(52, 211, 153, ${0.14 * green})`
                          : "rgba(255,255,255,0.02)",
                      opacity: p,
                      transform: `translateX(${(1 - p) * 40}px) scale(${1 + (isPick ? 0.02 : 0)})`,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 22,
                        background:
                          green > 0.1 ? COLORS.green : "rgba(148,163,184,0.15)",
                        color: green > 0.1 ? COLORS.bg : COLORS.dim,
                        transform: `scale(${1 + green * 0.15 - (green > 0.1 ? 0.15 : 0)})`,
                      }}
                    >
                      {green > 0.1 ? "✓" : String.fromCharCode(65 + i)}
                    </span>
                    {choice}
                  </div>
                );
              })}
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 22px",
                  borderRadius: 999,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.bg,
                  background: COLORS.green,
                  opacity: confirmed,
                  transform: `scale(${0.5 + confirmed * 0.5})`,
                }}
              >
                Correct · streak 3 🔥
              </div>
            </Card>
          </Reveal>
        </div>
      </Stage>
      <Voice id="quiz" at={VO_START} />
      <Sfx name="whoosh" at={0} volume={0.22} />
      <Sfx name="typing" at={12} volume={0.3} />
      <Sfx name="pop-low" at={22} volume={0.22} />
      <Sfx name="click" at={PICK_AT} volume={0.4} />
      <Sfx name="confirm" at={CONFIRM_AT} volume={0.3} />
    </>
  );
};

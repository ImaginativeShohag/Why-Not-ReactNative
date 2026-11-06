import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GRADIENT, SANS } from "./theme";

/** True for the vertical (1080×1920) compositions; scenes re-lay themselves out. */
export const useIsPortrait = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Drifting colour fields and a faint grid, shared by every scene. */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  // Positions are authored for 1920×1080 and stretched to the canvas.
  const blob = (x: number, y: number, color: string, size: number) => (
    <div
      style={{
        position: "absolute",
        left: (x * width) / 1920 - size / 2,
        top: (y * height) / 1080 - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        opacity: 0.55,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      {blob(
        420 + Math.sin(t * 0.35) * 160,
        260 + Math.cos(t * 0.3) * 90,
        "rgba(99, 102, 241, 0.55)",
        1100,
      )}
      {blob(
        1500 + Math.cos(t * 0.28) * 180,
        820 + Math.sin(t * 0.33) * 110,
        "rgba(34, 211, 238, 0.35)",
        1000,
      )}
      {blob(
        1100 + Math.sin(t * 0.22 + 2) * 220,
        200 + Math.cos(t * 0.25) * 80,
        "rgba(167, 139, 250, 0.35)",
        800,
      )}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          backgroundPosition: `0 ${(frame * 0.6) % 80}px`,
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** A centred column, used as the layout root of each scene. */
export const Stage: React.FC<{
  children: React.ReactNode;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ children, gap = 28, style }) => (
  <AbsoluteFill
    style={{
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      gap,
      fontFamily: SANS,
      color: COLORS.fg,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Rises into place with a soft blur, `delay` frames after the scene starts. */
export const Reveal: React.FC<{
  delay?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, y = 40, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * y}px)`,
        filter: `blur(${(1 - p) * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const GradientText: React.FC<{
  children: React.ReactNode;
  shimmer?: number;
  style?: React.CSSProperties;
}> = ({ children, shimmer = 0, style }) => (
  <span
    style={{
      backgroundImage: GRADIENT,
      backgroundSize: "200% 100%",
      backgroundPosition: `${shimmer}% 0`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);

/** Each letter springs up in turn. */
export const StaggerText: React.FC<{
  text: string;
  delay?: number;
  step?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, step = 1.4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", ...style }}>
      {text.split("").map((char, i) => {
        const p = spring({
          frame: frame - delay - i * step,
          fps,
          config: { damping: 14, stiffness: 160, mass: 0.6 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: interpolate(p, [0, 0.4], [0, 1], {
                extrapolateRight: "clamp",
              }),
              transform: `translateY(${(1 - p) * 60}px) rotate(${(1 - p) * 8}deg)`,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

/** The site's favicon: a gradient tile with a check that draws in. */
export const Logo: React.FC<{ size: number; check: number; id: string }> = ({
  size,
  check,
  id,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366f1" />
        <stop offset="1" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
    <path
      d="M9 17l5 5 9-12"
      fill="none"
      stroke="white"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - check}
    />
  </svg>
);

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: 8,
      textTransform: "uppercase",
      color: COLORS.cyan,
    }}
  >
    {children}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: COLORS.card,
      border: `1.5px solid ${COLORS.border}`,
      borderRadius: 28,
      boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
      ...style,
    }}
  >
    {children}
  </div>
);

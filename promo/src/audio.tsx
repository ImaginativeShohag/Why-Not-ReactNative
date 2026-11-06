import React from "react";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

export type SfxName =
  | "whoosh"
  | "swish"
  | "rise"
  | "pop"
  | "pop-low"
  | "tick"
  | "click"
  | "confirm"
  | "typing";

/** A sound effect from public/sfx (see scripts/sfx.mjs), `at` frames into the scene. */
export const Sfx: React.FC<{ name: SfxName; at: number; volume?: number }> = ({
  name,
  at,
  volume = 0.35,
}) => (
  <Audio
    from={Math.max(0, Math.round(at))}
    src={staticFile(`sfx/${name}.wav`)}
    volume={volume}
  />
);

/** A narration clip from public/voice (see scripts/voice.mjs). */
export const Voice: React.FC<{ id: string; at: number }> = ({ id, at }) => (
  <Audio from={Math.round(at)} src={staticFile(`voice/${id}.wav`)} volume={1} />
);

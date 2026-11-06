// Synthesises the motion sound effects into public/sfx/*.wav.
// No samples or music: every sound is generated here, so there's nothing to license.
//
//   npm run sfx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 48000;
const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public/sfx");
mkdirSync(outDir, { recursive: true });

// Deterministic noise, so re-running the script gives identical files.
let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
};

function writeWav(name, samples) {
  const peak = Math.max(...samples.map(Math.abs)) || 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) =>
    data.writeInt16LE(Math.round((s / peak) * 0.9 * 32767), i * 2),
  );
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(outDir, `${name}.wav`), Buffer.concat([header, data]));
}

const render = (seconds, fn) =>
  Array.from({ length: Math.round(seconds * RATE) }, (_, i) => fn(i / RATE, i));

/** State-variable band-pass filter whose centre frequency follows `cutoff(t)`. */
function bandpass(input, cutoff, q = 0.7) {
  let low = 0;
  let band = 0;
  return input.map((x, i) => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff(i / RATE), 12000)) / RATE);
    const high = x - low - q * band;
    band += f * high;
    low += f * band;
    return band;
  });
}

// Filtered noise whose pitch sweeps from `from` to `to` Hz.
function whoosh(seconds, from, to, attack) {
  const raw = render(seconds, () => noise());
  const swept = bandpass(raw, (t) => from * Math.pow(to / from, t / seconds), 0.9);
  return swept.map((s, i) => {
    const t = i / RATE / seconds;
    const env = t < attack ? Math.sin((t / attack) * (Math.PI / 2)) : Math.pow(1 - (t - attack) / (1 - attack), 2);
    return s * env;
  });
}

// A sine blip whose pitch drops quickly: a soft "pop".
function pop(seconds, from, to) {
  let phase = 0;
  return render(seconds, (t) => {
    const freq = to + (from - to) * Math.exp(-t * 40);
    phase += (2 * Math.PI * freq) / RATE;
    return Math.sin(phase) * Math.exp(-t * 28);
  });
}

function tone(seconds, freq, decay) {
  return render(seconds, (t) => Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * decay));
}

function mix(length, parts) {
  const out = new Array(length).fill(0);
  for (const { at, samples, gain = 1 } of parts) {
    const start = Math.round(at * RATE);
    samples.forEach((s, i) => {
      if (start + i < length) out[start + i] += s * gain;
    });
  }
  return out;
}

// A key press: a short burst of high band-passed noise plus a tiny thump.
function key(variant) {
  const click = bandpass(render(0.03, () => noise()), () => 2600 + variant * 500, 1.2).map(
    (s, i) => s * Math.exp(-(i / RATE) * 180),
  );
  const thump = tone(0.03, 180 + variant * 30, 120);
  return click.map((s, i) => s + thump[i] * 0.3);
}

writeWav("whoosh", whoosh(0.5, 300, 4000, 0.55));
writeWav("swish", whoosh(0.32, 3500, 500, 0.3));
writeWav("rise", whoosh(2.2, 200, 5000, 0.85));
writeWav("pop", pop(0.16, 900, 260));
writeWav("pop-low", pop(0.18, 600, 160));
writeWav("tick", tone(0.05, 2200, 90));
writeWav("click", mix(Math.round(0.06 * RATE), [
  { at: 0, samples: tone(0.04, 1500, 110) },
  { at: 0, samples: key(1), gain: 0.6 },
]));
// Two quick rising blips: a UI "correct" cue, not a melody.
writeWav("confirm", mix(Math.round(0.32 * RATE), [
  { at: 0, samples: tone(0.18, 880, 22) },
  { at: 0.09, samples: tone(0.22, 1320, 18) },
]));

// Typing that matches the code typewriter in QuizScene (frames 12–70 at 30 fps).
const TYPING_SECONDS = 58 / 30;
const presses = [];
for (let at = 0; at < TYPING_SECONDS; at += 0.045 + Math.abs(noise()) * 0.05) {
  presses.push({ at, samples: key(Math.floor(Math.abs(noise()) * 3)), gain: 0.6 + Math.abs(noise()) * 0.4 });
}
writeWav("typing", mix(Math.round((TYPING_SECONDS + 0.1) * RATE), presses));

console.log(`Wrote sound effects to ${outDir}`);

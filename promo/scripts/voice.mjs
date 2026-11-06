// Generates the narration and writes the clip lengths to src/voice.json,
// which the timeline reads to size each scene.
//
// Speech comes from AVSpeechSynthesizer (scripts/speak.swift), which can use
// the Siri and Premium/Enhanced voices that `say` doesn't list. Needs Xcode or
// the Command Line Tools for the `swift` interpreter.
//
//   npm run voice                  # best installed English voice
//   npm run voice -- --list        # show the installed English voices
//   VOICE=com.apple.siri.natural.Aaron RATE=0.5 npm run voice
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/voice");
const cache = join(root, ".cache");
mkdirSync(outDir, { recursive: true });
mkdirSync(join(cache, "raw"), { recursive: true });

const LINES = {
  intro: "Why Not React Native. Expo and React Native, built for production.",
  stack: "One modern stack, end to end.",
  projects: "Six real projects, in one app.",
  p1: "An offline journal.",
  p2: "A camera editor.",
  p3: "A commerce app.",
  p4: "A fitness tracker.",
  p5: "A podcast player.",
  p6: "And a tic-tac-toe game you can't beat.",
  path: "A step-by-step path, seven write-ups, and hundreds of quiz questions.",
  quiz: "Every quiz sends you into the real code.",
  cta: "Start the learning path today. Free, and open source.",
};

// AVSpeechUtterance rate: 0 is slowest, 1 fastest, 0.5 is the system default.
const RATE = process.env.RATE ?? "0.5";

// Run with the interpreter: see the note at the top of speak.swift.
const speak = (...args) =>
  execFileSync("swift", [join(root, "scripts/speak.swift"), ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

const voices = speak("--list")
  .trim()
  .split("\n")
  .map((line) => {
    const [quality, language, id, name] = line.split("\t");
    return { quality, language, id, name };
  });

if (process.argv.includes("--list")) {
  console.table(voices);
  process.exit(0);
}

// The released promo is narrated by Siri "Voice 1". Override with VOICE=<id or name>.
const DEFAULT_VOICE = "com.apple.siri.natural.Aaron";

function pickVoice() {
  const wanted = process.env.VOICE ?? DEFAULT_VOICE;
  const match = voices.find((v) => v.id === wanted || v.name === wanted);
  if (!match) {
    throw new Error(
      `Voice "${wanted}" isn't installed. Download it (System Settings → Siri → Voice) or pick one: npm run voice -- --list`,
    );
  }
  return match;
}

// Seconds of audio in a PCM WAV: the size of the `data` chunk over the byte rate.
function wavSeconds(file) {
  const buf = readFileSync(file);
  const byteRate = buf.readUInt32LE(28);
  let offset = 12;
  while (offset < buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") return size / byteRate;
    offset += 8 + size + (size % 2);
  }
  throw new Error(`No data chunk in ${file}`);
}

const voice = pickVoice();
const raw = (id) => join(cache, "raw", `${id}.wav`);
speak(voice.id, RATE, ...Object.entries(LINES).flatMap(([id, text]) => [raw(id), text]));

const clips = {};
for (const id of Object.keys(LINES)) {
  const file = join(outDir, `${id}.wav`);
  // Normalise to 48 kHz mono 16-bit PCM with Remotion's bundled ffmpeg.
  execFileSync(
    "npx",
    ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw(id),
      "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", "-map_metadata", "-1", "-bitexact", file],
    { cwd: root },
  );
  clips[id] = Number(wavSeconds(file).toFixed(3));
}

writeFileSync(
  join(root, "src/voice.json"),
  JSON.stringify(
    { voice: `${voice.name} (${voice.id})`, rate: Number(RATE), lines: LINES, clips },
    null,
    2,
  ) + "\n",
);
console.log(`Voice: ${voice.name} (${voice.id}, ${voice.quality})`);
console.table(clips);

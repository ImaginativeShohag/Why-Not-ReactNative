# Promo video

A motion-graphics promo for the docs site, built with [Remotion](https://www.remotion.dev): a
narrated walkthrough with motion sound effects and no music. It's a separate package so the Expo
app's dependencies stay untouched. The root `tsconfig.json` and `eslint.config.js` both ignore this folder.

```bash
cd promo
npm install      # after a fresh clone, run voice and sfx too: public/ is not committed
VOICE=com.apple.siri.natural.Aaron npm run voice   # narration → public/voice/*.wav + src/voice.json
                 # (always pass VOICE, see "Narration"; a bare `npm run voice` may pick a female voice)
npm run sfx      # synthesised sound effects → public/sfx/*.wav
npm run studio   # live preview with a scrubber
npm run render   # → output/promo.mp4 (1920×1080, landscape only; portrait is a separate command)
npm run poster   # → output/poster.png (the settled closing scene)
npm run render:portrait   # → output/promo-portrait.mp4 (1080×1920, for Reels/Shorts/Stories)
npm run poster:portrait   # → output/poster-portrait.png
npm run typecheck
```

On first render Remotion downloads Chrome Headless Shell. Without network access, point it at a
local Chrome: `npm run render -- --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --chrome-mode=headless-shell`.

## Narration

`scripts/voice.mjs` speaks each line in `LINES` through `scripts/speak.swift` (AVSpeechSynthesizer,
run with the `swift` interpreter, so it needs Xcode or the Command Line Tools). Unlike `say`, it
can use the natural **Siri** voices. It picks the best installed English voice: Premium, then
Enhanced (Siri voices report as Enhanced), then Samantha. The current render uses
**Voice 1 (`com.apple.siri.natural.Aaron`)**.

```bash
npm run voice -- --list                                   # installed English voices
VOICE=com.apple.siri.natural.Aaron RATE=0.5 npm run voice # pick one; RATE is 0…1
```

More Siri voices: System Settings → Siri → Voice (each one you select is downloaded), or
Accessibility → Spoken Content → System Voice → Manage Voices.

**Use Aaron for the released promo.** Without `VOICE`, `npm run voice` takes the best voice installed
on that Mac, so a clean machine (where Aaron isn't downloaded yet) silently ends up with a different
one, often a female Siri voice or Samantha. Download "Voice 1" (Aaron) first, confirm it appears in
`npm run voice -- --list` as `com.apple.siri.natural.Aaron`, then run the command above. Setting
`VOICE` makes the script stop with an error if that voice isn't installed instead of falling back.
Check the "voice" line in `src/voice.json` after generating. Changing the voice or `RATE` changes
every clip length, so re-render both videos afterwards.

The voice that was used is recorded in `src/voice.json`. To use a recorded or hosted voice instead,
drop WAVs with the same ids into `public/voice/` and update the clip lengths in `src/voice.json`.

## Timing

Scenes play strictly one after another (`Series`). Each one leaves over its last `EXIT` frames
(lift, shrink, blur, with a swish), and the next scene's first element appears only after that.
`src/timeline.ts` sizes every scene to fit its motion and its narration, so a new voice or a
re-worded line re-fits the timeline. Each project card is spotlit while its own line plays.

| Scene | Shows | Sounds |
| --- | --- | --- |
| `IntroScene` | Logo, name, "Expo & React Native, built for production." | pop, tick, whooshes |
| `StackScene` | The tech stack as chips | a pop per chip |
| `ProjectsScene` | The six projects, spotlit in turn | pop per card, tick per spotlight |
| `PathScene` | Learning path 00 → 06 and the site stats | rising sweep, pop per node, ticks |
| `QuizScene` | Typed code beside a quiz question that gets answered | typing, click, confirm |
| `CtaScene` | Call to action and the site URL | pop, whoosh, click |

Both videos are separate renders: `npm run render` makes only the landscape file, and the portrait
one needs `npm run render:portrait`. `PromoPortrait` and `PosterPortrait` reuse the same scenes, narration and timeline. Each scene
checks `useIsPortrait()` (`src/components.tsx`) and re-lays itself out: the project cards stack in
one column, the learning path runs top to bottom, and the quiz puts the question under the code.

Colours come from `docs/index.html` (`src/theme.ts`); update the copy there if the site changes.

# Tic-tac-toe: production-ready rewrite (design)

Date: 2026-10-25 · Owner: Shohag · Status: approved

## Goal

Turn Project 06 from a bare port of the React tutorial into a polished, production-quality
game. It gets a modern, playful UI animated with Reanimated 4, a vs-computer mode, a persisted
scoreboard, undo plus a move timeline, and haptics. Then rewrite the write-up and the quiz bank
around the new code.

## Features

- **Modes:** `pvp` (two players, one device) and `cpu` (the human is X and always moves first;
  the CPU is O).
- **Difficulty (cpu):** `easy` plays at random. `medium` wins if it can, otherwise blocks, otherwise
  plays at random. `hard` uses minimax and is unbeatable.
- **Scoreboard:** X wins, O wins and draws, persisted. Can be reset.
- **Undo + timeline:** undo steps back one move (pvp), or back to the human's turn (cpu). The
  timeline shows each move as a chip, and tapping one jumps there (time travel). Both are locked
  once the round has a result.
- **Haptics:** a light tap on a move, success on a win, warning on a draw. Can be toggled, and
  the setting is persisted.

## Slice layout (`src/projects/tic-tac-toe/`)

| File | Purpose |
| --- | --- |
| `utils/game.ts` | Pure rules: `findWinningLine`, `countRemainingTurns`, `deriveGame`, `squareLabel`, `statusText` |
| `utils/ai.ts` | `pickMove(squares, cpu, difficulty, random = Math.random): number` (pure) |
| `utils/palette.ts` | The project's own light/dark palette and a `useTicTacToePalette()` hook |
| `stores/gameStore.ts` | `useGameStore`: `persist(combine(...))` on AsyncStorage, `version: 1` |
| `hooks/useCpuTurn.ts` | Plays the CPU's move after `CPU_DELAY_MS` (450), cleared on change or unmount |
| `hooks/useGameHaptics.ts` | Fires haptics when the move count changes (skips the first render) |
| `components/*.tsx` | Dumb components that take props only (list below) |
| `__tests__/` | `game.test.ts`, `ai.test.ts`, `gameStore.test.ts` |

The route `src/app/projects/tic-tac-toe/index.tsx` stays the single route (`singleScreen`). It
is a thin screen that wires the store and hooks to the components.

## Interfaces

```ts
// utils/game.ts
export type Player = "X" | "O";
export type SquareValue = Player | null;
export type Squares = SquareValue[];
export type WinningLine = { winner: Player; line: [number, number, number] };
export type GameView = {
  squares: Squares; next: Player; win: WinningLine | null;
  isDraw: boolean; isOver: boolean;
};
export const LINES: readonly (readonly [number, number, number])[];
export function emptyBoard(): Squares;
export function findWinningLine(squares: Squares): WinningLine | null;
export function countRemainingTurns(squares: Squares): number;
export function nextPlayer(moveIndex: number): Player;      // even -> X
export function deriveGame(history: Squares[], currentMove: number): GameView;
export function statusText(view: GameView, mode: Mode): string;
export function squareLabel(index: number, value: SquareValue): string;

// stores/gameStore.ts
export type Mode = "pvp" | "cpu";
export type Difficulty = "easy" | "medium" | "hard";
export type Scores = { X: number; O: number; draw: number };
export const HUMAN: Player = "X"; export const CPU: Player = "O";
// state: history, currentMove, mode, difficulty, scores, hapticsEnabled
// actions: play(index), undo(), jumpTo(move), newRound(), setMode(m),
//          setDifficulty(d), setHapticsEnabled(on), resetScores()
```

Rules enforced in the store, not in the UI:
- `play` ignores a filled square or a finished round, truncates any future history, and, when
  the move ends the round, increments `scores` in the same `set`.
- `undo` and `jumpTo` are no-ops once the round is over. `undo` in cpu mode rewinds to the last
  state where it is the human's turn.
- `setMode` and `setDifficulty` start a new round (scores are kept).
- `partialize` persists data only. `version: 1`.

## Components (dumb)

`Board` (a 3×3 grid of `Square` plus a `WinLine` overlay, sized by prop), `Square` (press-scale
spring, a11y label/state, renders `XMark`/`OMark`), `XMark` / `OMark` (SVG strokes that draw on
via `useAnimatedProps` on `strokeDashoffset`), `WinLine`, `StatusBanner` (keyed text with
`FadeIn`/`FadeOut`, live region), `Scoreboard` (three tiles; the count bumps with a spring and the
active player's tile is highlighted), `SegmentedControl<T>` (spring thumb, used for mode and
difficulty), `MoveTimeline` (horizontal chips, `entering` animation, `flexGrow: 0`),
`ActionBar` (Undo / New round). Every animation honours `useReducedMotion()`.

## Testing

- `game`: lines, draws, `deriveGame`, `statusText`, labels.
- `ai`: `hard` never loses across every human line, as X and as O; every level takes an
  immediate win; `medium` and `hard` block; `easy` only picks empty squares (seeded random).
- `gameStore`: play, truncation, scoring once, locking after the result, undo in pvp and cpu,
  jumpTo, setMode resets the round.

Done when typecheck, lint, jest, `expo export` (iOS and Android) and `validate.mjs` all pass.

## Docs

Rewrite `docs/06-tic-tac-toe.html` in the shared write-up shell, around the new code. Rework
`docs/training/banks/06-tic-tac-toe.js`: drop stale questions and add Reanimated, AI and persist
questions. Update AGENTS.md, the learning-path blurb and `.agents/lessons/_learned.md`.

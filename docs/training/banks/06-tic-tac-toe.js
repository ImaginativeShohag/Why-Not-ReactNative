QUIZ.register({
  slug: "tic-tac-toe",
  number: "06",
  title: "Tic-tac-toe with Zustand",
  doc: "../06-tic-tac-toe.html",
  summary:
    "Trains the React, React Native and Zustand fundamentals behind the single-route tic-tac-toe project: a typed combine store, selectors and re-renders, immutable updates, derived state, time travel, flexbox layout, and how a single-screen project is registered in the launcher.",
  questions: [
    // ---------------------------------------------------------------- L1
    {
      id: "tic-tac-toe-01",
      type: "mcq",
      level: 1,
      topics: ["Zustand", "Architecture"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Open `src/app/projects/tic-tac-toe/index.tsx`. Where does the game state (`history`, `currentMove`) actually live?",
      choices: [
        "In a module-scope Zustand store, `useGameStore`, created with `create(combine(...))` at the top of the route file",
        "In `useState` inside the `Game` component, passed down to `Board` as props",
        "In a React context provider mounted by the project's `_layout.tsx`",
        "In a persisted store under `src/projects/tic-tac-toe/stores/`",
      ],
      answer: 0,
      explain:
        "`useGameStore` is created once, at module scope, by `create(combine(initialState, actions))`. There is no `_layout.tsx` and no `stores/` folder: the store, `Board` and `Square` all live in the route file, and the small `src/projects/tic-tac-toe/` slice only holds the pure game helpers (`utils/game.ts`). `Game` reads the state through selector hooks. It doesn't own the state with `useState`, and nothing is persisted.",
    },
    {
      id: "tic-tac-toe-02",
      type: "text",
      level: 1,
      topics: ["Zustand", "TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Which Zustand middleware, imported from `zustand/middleware`, wraps the initial state object and the actions creator, so that the store's type is inferred with no hand-written interface? Type the function name.",
      accept: ["combine", "combine()", /^combine\s*\(?\)?$/i],
      explain:
        "`combine(initialState, (set) => actions)` merges the plain initial state with whatever the creator returns. Its type is `Write<T, U>`: the initial state type `T` combined with the actions type `U`. That's why `useGameStore` needs no `GameState` interface.",
    },
    {
      id: "tic-tac-toe-03",
      type: "mcq",
      level: 1,
      topics: ["TypeScript", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "The store's initial state is `history: [Array<SquareValue>(9).fill(null)]`. Why does the code write `Array<SquareValue>(9)` instead of plain `Array(9)`?",
      choices: [
        "`Array(9).fill(null)` infers `any[]`, which would quietly switch off type checking for every board, selector and setter built from it",
        "`Array(9)` creates a sparse array that `.fill()` cannot fill on Hermes",
        "`combine` throws at runtime if the initial state has no explicit generic",
        "Without the generic the array would hold `undefined` instead of `null`",
      ],
      answer: 0,
      explain:
        "Since `combine` infers the store type from the initial object, an `any[]` there spreads `any` through `history`, `squares` and every selector. Passing the element type gives `SquareValue[]`, so `history` becomes `SquareValue[][]`, which is the same structure as `Squares[]`. `.fill()` works fine on `Array(9)` in any engine. The generic only exists for the type checker.",
    },
    {
      id: "tic-tac-toe-04",
      type: "multi",
      level: 1,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "In the final code, which of these values are **computed during render** and not stored in the Zustand store? Select all that apply.",
      choices: [
        "`xIsNext`",
        "`currentSquares`",
        "`winner`",
        "`status`",
        "`history`",
        "`currentMove`",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "Only `history` and `currentMove` are in the `combine` initial state. `Game` computes `xIsNext` (`currentMove % 2 === 0`) and `currentSquares` (`history[currentMove]`). `Board` computes `winner`, `remainingTurns`, `player` and `status` with the pure helpers from `utils/game.ts`. This follows the principle of storing the minimum state and deriving everything else, so the derived values can never fall out of sync.",
    },
    {
      id: "tic-tac-toe-05",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Game` no longer stores whose turn it is. Write the exact boolean expression it uses to compute `xIsNext`.",
      accept: [
        "currentMove % 2 === 0",
        "currentMove % 2 == 0",
        /^currentMove\s*%\s*2\s*===?\s*0;?$/i,
      ],
      hint: "It only depends on the index of the move being viewed.",
      explain:
        "`const xIsNext = currentMove % 2 === 0;`. X moves on even indices, and the empty board is move 0. Because the turn comes from `currentMove`, `jumpTo` only has to set one value, and the turn is automatically correct after time travel.",
    },
    {
      id: "tic-tac-toe-06",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling", "React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Square` renders `<Pressable><Text>{value}</Text></Pressable>`. What happens if you drop the `<Text>` and render `{value}` straight inside the `Pressable`, as the web tutorial does with `<button>`?",
      choices: [
        "React Native throws \"Text strings must be rendered within a <Text> component\" as soon as a square holds `X` or `O`",
        "It works, but the text loses its font styling",
        "TypeScript rejects it at compile time",
        "The string is drawn, but screen readers can't see it",
      ],
      answer: 0,
      explain:
        "In React Native, every visible string needs a `<Text>` ancestor. `View` and `Pressable` can't hold raw strings. This is a runtime error, not a type error. An empty square holds `null`, which renders nothing, so the crash only appears after the first move. This rule also splits the styles: box styles go on the `Pressable` (`styles.square`) and text styles on the `Text` (`styles.squareText`).",
    },
    {
      id: "tic-tac-toe-07",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "At the start of a game every square's `value` is `null`. What does `<Text style={styles.squareText}>{value}</Text>` show, and why does the square stay 40×40?",
      choices: [
        "Nothing is drawn, because React skips `null` children; the size comes from `styles.square` on the `Pressable`, not from the text",
        "The literal text \"null\", and the size comes from the font metrics",
        "An empty string, and the square collapses to 0×0 until a mark is placed",
        "It crashes, because `Text` children must be strings",
      ],
      answer: 0,
      explain:
        "React renders `null`, `undefined` and booleans as nothing. That's why `SquareValue = Player | null` works as a child with no conversion. The square keeps its size because `width` and `height` (`SQUARE_SIZE`) are set on the `Pressable` box, so it doesn't depend on its content.",
    },
    {
      id: "tic-tac-toe-08",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Which React Native core component does this file use for every touchable element (the squares and the \"Go to move\" buttons)? Type the component name.",
      accept: ["Pressable", "<Pressable>", "<Pressable />"],
      explain:
        "`Pressable` is React Native's general touch primitive. It takes `onPress`, and its `style` can be a function of `{ pressed }`. Lowercase DOM tags like `<button>` don't exist in React Native. `Square` and the move list in `Game` both use `Pressable` with a `Text` child.",
    },
    {
      id: "tic-tac-toe-09",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Look at `styles.board` and `styles.square`. How does the code lay the nine squares out as a 3×3 grid?",
      choices: [
        "`flexDirection: \"row\"` and `flexWrap: \"wrap\"` on a container exactly `SQUARE_SIZE * 3` wide, so each row fills up at three squares and wraps",
        "`display: \"grid\"` with `gridTemplateColumns: \"repeat(3, 1fr)\"`",
        "Three nested row `View`s, each mapped over a slice of `squares`",
        "A `FlatList` with `numColumns={3}`",
      ],
      answer: 0,
      explain:
        "React Native's layout engine (Yoga) only supports flexbox: there's no CSS Grid. `Board` maps all nine squares into one `View` styled with `styles.board`. With `width: SQUARE_SIZE * 3` and 40-pt squares, every fourth square wraps to a new line. The container width has to be an exact multiple of the square size for this to work.",
    },
    {
      id: "tic-tac-toe-10",
      type: "text",
      level: 1,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Inside `Board`, the status `Text` sits **above** the grid, even though the wrapping `<View>` has no style. What is React Native's default `flexDirection` that causes this? Type the value.",
      accept: ["column", "\"column\"", "flexDirection: column", "flexDirection: \"column\""],
      explain:
        "Every React Native `View` is a flex container with `flexDirection: \"column\"` by default. On the web the default is `row`. That's why `styles.game` has to set `flexDirection: \"row\"` explicitly to put the board and the move list side by side. It's also why the write-up wraps the board in a `View` and not a fragment: a fragment can't take a style, so the parent's direction would decide the layout.",
    },
    {
      id: "tic-tac-toe-11",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "In `Board`'s `handleClick`, why does the code make a copy with `const nextSquares = squares.slice()` before writing `nextSquares[i] = player`?",
      choices: [
        "So the board in `history` is never mutated: a new array is a new reference, which keeps every past board intact for time travel and lets Zustand and React detect the change",
        "Because arrays that come from a Zustand store are frozen and throw when written to",
        "Because `.slice()` deep-clones nested objects, which the board needs",
        "To convert the array from `SquareValue[]` to `Player[]`",
      ],
      answer: 0,
      explain:
        "Treating state as immutable is what makes time travel possible: every entry in `history` is a separate snapshot. `.slice()` is only a shallow copy, but squares hold primitives (`\"X\"`, `\"O\"`, `null`), so shallow is enough. Zustand doesn't freeze state. Mutation is allowed by the language but breaks both change detection and the stored history.",
    },
    {
      id: "tic-tac-toe-12",
      type: "order",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Put the steps of `Game`'s `handlePlay(nextSquares)` in the order the code runs them.",
      items: [
        "Take `history.slice(0, currentMove + 1)`: the boards up to and including the one on screen",
        "Append `nextSquares` to build `nextHistory`",
        "Call `setHistory(nextHistory)`",
        "Call `setCurrentMove(nextHistory.length - 1)`",
      ],
      explain:
        "`const nextHistory = [...history.slice(0, currentMove + 1), nextSquares]` drops any \"future\" boards, then adds the new one. `setCurrentMove` has to come after `nextHistory` is built, because the new index is `nextHistory.length - 1`, which always points at the board that was just added.",
    },
    {
      id: "tic-tac-toe-13",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "X, O and X have each played one square. What number does `countRemainingTurns(squares)` return? (Read what it counts.)",
      accept: ["6", "six"],
      explain:
        "`countRemainingTurns` returns `squares.filter((square) => !square).length`, which is the number of **empty** squares. That's also the number of turns left to play, so 9 − 3 = 6. `calculateStatus` relies on it: `!remainingTurns` means the board is full, which (with no winner) is a draw. The helper used to be called `calculateTurns`, which sounded like \"moves played\" and is the opposite of what it counts. It was renamed so the name says what the body does.",
    },
    {
      id: "tic-tac-toe-14",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/app/_layout.tsx", "src/shared/config/projects.ts"],
      prompt:
        "Open `src/app/_layout.tsx` and look at the `PROJECTS.map(...)`. Why does the tic-tac-toe screen show the root Stack's native header, while the store, journal and other projects don't?",
      choices: [
        "Its entry has `singleScreen: true`, so the root declares `projects/tic-tac-toe/index` without `headerShown: false`; the other projects are declared with `headerShown: false` because their own `_layout.tsx` Stacks draw their headers",
        "The tic-tac-toe file sets `export const options = { headerShown: true }`",
        "Expo Router always shows a header for routes named `index`",
        "The launcher pushes it with `router.push(route, { header: true })`",
      ],
      answer: 0,
      explain:
        "Multi-screen projects are declared as `projects/<slug>` with `headerShown: false`, and their nested Stack in `src/app/projects/<slug>/_layout.tsx` takes over. Tic-tac-toe has no `_layout.tsx`, so the root Stack shows it directly with `options={{ title }}` taken from the registry entry (\"Tic-Tac-Toe\") plus `headerBackButtonDisplayMode: \"minimal\"`. Without that `title` option, the header would fall back to the raw route name. Expo Router has no route-level `options` export, and the launcher just calls `router.push(item.route)`.",
    },
    {
      id: "tic-tac-toe-15",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts"],
      prompt:
        "In the `PROJECTS` registry, which optional boolean field marks tic-tac-toe as a single route rather than a project with its own stack? Type the field name.",
      accept: ["singleScreen", "singleScreen: true"],
      explain:
        "`singleScreen?: boolean` is documented in the `Project` type as \"A single route (projects/<slug>/index) instead of a project stack.\" The root layout reads it to choose the `Stack.Screen` name, and passes the entry's `title` as that screen's header title. The launcher in `src/app/index.tsx` doesn't care either way: it pushes `route` (`/projects/tic-tac-toe`) for every entry.",
    },
    {
      id: "tic-tac-toe-16",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Platform Differences"],
      files: ["docs/06-tic-tac-toe.html", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The write-up's appendix covers someone who pastes the web tutorial's `<button onClick={...}>` into this route. What happens on iOS and Android?",
      choices: [
        "`tsc` passes, but the first render throws \"View config getter callback for component `button` must be a function\", because no native view is registered under that name",
        "`tsc` fails because `button` is not a valid JSX element in React Native",
        "It renders a native system button with no styling",
        "It works on device but fails on the web target",
      ],
      answer: 0,
      explain:
        "A lowercase JSX tag is a host component. Fabric looks it up in `ReactNativeViewConfigRegistry`, which only knows natively registered views (`RCTView`, `RCTText`, …), and finds nothing. `@types/react` declares every DOM element, so the type checker doesn't complain. It's the reverse on the web: there the DOM is real, so `npm run web` can look fine while devices crash. The fix is to use a real primitive (`Pressable`), not just to capitalise the tag.",
    },
    {
      id: "tic-tac-toe-17",
      type: "multi",
      level: 1,
      topics: ["Layout & Styling", "Platform Differences"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "Which of these web-to-React-Native translations does the real file use? Select all that apply.",
      choices: [
        "Lengths are unitless numbers (`16`, `SQUARE_SIZE * 3`) and not `\"1rem\"` or `calc(...)`",
        "Styles live in `StyleSheet.create` and are referenced as `style={styles.x}`",
        "`gap` on the parent sets the spacing between children (`styles.game`, `styles.moves`)",
        "The font is chosen per platform with `Platform.select`",
        "`display: \"flex\"` is set on containers to turn flexbox on",
        "The move list is a `<FlatList>` to replace the web `<ol>`",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "React Native lengths are density-independent numbers with no CSS units, so you do the arithmetic in JavaScript. `StyleSheet.create` gives styles typed against `ViewStyle` and `TextStyle`. `gap` is supported, and `MONO = Platform.select({ ios: \"Menlo\", default: \"monospace\" })` picks the font. Every `View` is already a flex container, so `display: \"flex\"` isn't needed. The history is short, so a plain `.map()` inside a `View` is enough and virtualisation isn't worth it.",
    },
    {
      id: "tic-tac-toe-18",
      type: "text",
      level: 1,
      topics: ["Platform Differences", "Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`fontFamily: \"monospace\"` works on Android but not on iOS. Which React Native API does the file call to choose `\"Menlo\"` on iOS and `\"monospace\"` everywhere else? Type the call, as in `Object.method`.",
      accept: ["Platform.select", "Platform.select()", /^Platform\.select\s*\(?.*\)?$/i],
      explain:
        "`const MONO = Platform.select({ ios: \"Menlo\", default: \"monospace\" });` runs once at module scope. `Platform.select` returns the value for the current `Platform.OS` and falls back to `default`. For differences bigger than a single value, the repo uses `.ios.tsx` / `.android.tsx` files.",
    },

    // ---------------------------------------------------------------- L2
    {
      id: "tic-tac-toe-19",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals"],
      files: ["src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "X makes the ninth move, which fills the last empty square **and** completes a diagonal. What does `calculateStatus` return?",
      code: [
        "if (!winner && !remainingTurns) return \"Draw\";",
        "if (winner) return `Winner ${winner}`;",
        "return `Next player: ${player}`;",
      ].join("\n"),
      choices: ["`Winner X`", "`Draw`", "`Next player: O`", "`Winner O`"],
      answer: 0,
      explain:
        "`remainingTurns` is 0 (no empty squares left), but `winner` is `\"X\"`, so `!winner && !remainingTurns` is false and the second branch returns `Winner X`. Reading only the first line suggests \"Draw\", but that check requires **no winner**. The game is only a draw when the board is full and `calculateWinner` returns `null`.",
    },
    {
      id: "tic-tac-toe-20",
      type: "order",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "A player taps an empty square during a game. Put the steps from the tap to the updated screen in order.",
      items: [
        "`Pressable`'s `onPress` calls the `onSquareClick` arrow that `Board` passed to that `Square`",
        "`Board.handleClick(i)` checks `squares[i] || winner`, then copies the board and writes `player` at `i`",
        "`onPlay(nextSquares)`, which is `Game.handlePlay`, builds `nextHistory` and calls `setHistory` and `setCurrentMove`",
        "Zustand merges the partial state and notifies subscribers; each selector result is compared with `Object.is`",
        "`Game` re-renders with the new `history` and `currentMove`, and computes `xIsNext` and `currentSquares` again",
        "`Board` receives the new `squares` and recomputes `winner`, `remainingTurns` and `status`",
      ],
      explain:
        "Data flows down (`Game` to `Board` to `Square` through props) and events flow up (callbacks: `onSquareClick` to `handleClick` to `onPlay`). Only `Game` talks to the store. The store's `set` does `Object.assign({}, state, partial)` and calls listeners. `useSyncExternalStore` re-renders `Game` because its `history` and `currentMove` selectors now return new values.",
    },
    {
      id: "tic-tac-toe-21",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Five moves have been played, so `history.length === 6` and `currentMove === 5`. The player taps \"Go to move #2\", then taps an empty square. What are `history.length` and `currentMove` afterwards?",
      choices: [
        "`history.length === 4`, `currentMove === 3`",
        "`history.length === 7`, `currentMove === 6`",
        "`history.length === 7`, `currentMove === 3`",
        "`history.length === 3`, `currentMove === 2`",
      ],
      answer: 0,
      explain:
        "`jumpTo(2)` only sets `currentMove = 2`. `handlePlay` then keeps `history.slice(0, 3)` (boards 0, 1 and 2), appends the new board to get length 4, and sets `currentMove = nextHistory.length - 1 = 3`. Moves 3 to 5 from the old timeline are dropped. This is the \"new branch replaces the future\" behaviour every undo stack uses.",
    },
    {
      id: "tic-tac-toe-22",
      type: "order",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The player taps \"Go to move #2\" in the move list. Put what happens in order.",
      items: [
        "The move-list `Pressable` calls `jumpTo(2)` through its inline `onPress` arrow",
        "`jumpTo` calls `setCurrentMove(2)`; `history` stays the same, future boards included",
        "The store merges `{ currentMove: 2 }`, and `Game`'s `currentMove` selector returns a new value",
        "`Game` re-renders: `currentSquares = history[2]` and `xIsNext = true`",
        "`Board` shows the board as it was after move 2, and every \"Go to move\" button is still listed",
      ],
      explain:
        "Time travel here only moves an index. `jumpTo` never touches `history`, so you can jump forward again until a new move is played, and only then does `handlePlay` cut off the future. `xIsNext` comes out right with no extra code because it's derived from `currentMove`.",
    },
    {
      id: "tic-tac-toe-23",
      type: "multi",
      level: 3,
      topics: ["Zustand", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Game` subscribes with four separate selector hooks, such as `useGameStore((state) => state.history)`. Which statements about re-renders are true? Select all that apply.",
      choices: [
        "A selector hook re-renders the component only when its selected value changes by `Object.is`",
        "Selecting `setHistory` or `setCurrentMove` never causes a re-render, because those function references are created once in the `combine` creator and never change",
        "Tapping the button for the move already on screen (`setCurrentMove` with the same number) doesn't re-render `Game`, even though `set` still creates a new state object",
        "Zustand deep-compares arrays, so `setHistory` with an equal-looking copy of `history` would be skipped",
        "`useGameStore()` with no selector behaves the same as these four selectors",
      ],
      answer: [0, 1, 2],
      explain:
        "Zustand's `useStore` passes `() => selector(api.getState())` to `useSyncExternalStore`, which compares snapshots with `Object.is`. Actions are stable references, and a primitive like `2` equals `2`. A new array is a new reference, even if its contents are the same, so nothing is deep-compared. Calling the hook with no selector returns the whole state object, which is replaced on every `set`, so the component would re-render on any change.",
    },
    {
      id: "tic-tac-toe-24",
      type: "text",
      level: 2,
      topics: ["Zustand", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/projects/camera-social/camera.tsx"],
      prompt:
        "Say you wanted to replace `Game`'s four selector calls with **one** call that returns `{ history, currentMove }` as an object. In Zustand v5, which helper must wrap that selector so it doesn't return a new object on every call? `src/app/projects/camera-social/camera.tsx` shows it in use. Type the helper name.",
      accept: ["useShallow", "useShallow()", /^useShallow\s*\(?\)?$/i],
      explain:
        "`useShallow` (from `zustand/react/shallow`) remembers the last result and returns the same reference while each top-level field is still `Object.is`-equal. Camera & Social uses it for its capture-session fields. The tic-tac-toe route avoids the problem by selecting each field separately, which is the simplest pattern when you only need a few fields.",
    },
    {
      id: "tic-tac-toe-25",
      type: "mcq",
      level: 2,
      topics: ["Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`setCurrentMove` calls `set((state) => ({ currentMove: ... }))`, returning an object with **only** `currentMove`. What happens to `history` and the two actions?",
      choices: [
        "They're kept: Zustand's `set` shallow-merges the partial object into the current state",
        "They're removed: you have to spread `...state` or `history` becomes `undefined`",
        "`history` is kept, but the actions are dropped and recreated on the next render",
        "`combine` throws because the returned object doesn't match the full state type",
      ],
      answer: 0,
      explain:
        "Zustand's vanilla `setState` does `Object.assign({}, state, nextState)` unless you pass `replace: true`. Unlike React's class `setState`, it only merges one level deep, so to change a nested object you'd still spread inside it. Here every field is top-level, which is why each action can return just the one key it changes.",
    },
    {
      id: "tic-tac-toe-26",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "The Zustand TypeScript guide recommends the curried `create<State>()(...)` form. Why does this file write `create(combine(...))` with no type argument?",
      choices: [
        "`combine` builds the state type itself (initial state merged with the returned actions), so a hand-written generic adds nothing and works against the inference",
        "The curried form was removed in Zustand v5",
        "The React Compiler can't analyse curried calls",
        "Type arguments are not allowed in `.tsx` files",
      ],
      answer: 0,
      explain:
        "`combine<T, U>(initialState: T, create: StateCreator<T, ..., U>)` returns `StateCreator<Write<T, U>>`, so `create` already gets a fully typed store. The curried form is there for stores written without `combine`, where `set` and `get` can't infer the state otherwise. It still exists in v5. The write-up gives the same advice for the `redux` middleware.",
    },
    {
      id: "tic-tac-toe-27",
      type: "multi",
      level: 2,
      topics: ["TypeScript", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "About `type Updater<T> = T | ((prev: T) => T)` and the `typeof nextHistory === \"function\"` check in `setHistory` and `setCurrentMove`: select all that apply.",
      choices: [
        "It copies React's `setState` API: the setter takes either a new value or a function of the previous value",
        "The `typeof` check narrows correctly only because the value types (`Squares[]`, `number`) can never be called themselves",
        "In the current code, `Game` only ever passes plain values (`nextHistory`, `nextHistory.length - 1`, `nextMove`)",
        "If a store field ever held a function as state, this narrowing would stop telling the two cases apart",
        "Zustand requires every action to accept an updater function",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "The function branch of `Updater` is read against `state.history` / `state.currentMove` inside `set((state) => ...)`, so it always sees the latest store value. `handlePlay` and `jumpTo` never use that branch, but it's there for callers like `setCurrentMove((m) => m + 1)`. Zustand imposes no shape on actions: this pattern is the tutorial's own choice.",
    },
    {
      id: "tic-tac-toe-28",
      type: "mcq",
      level: 2,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`styles.game` is `{ flexDirection: \"row\", alignItems: \"flex-start\", gap: 16, padding: 16 }`. After ten moves the move list is much taller than the board. What does `alignItems: \"flex-start\"` prevent?",
      choices: [
        "The board column stretching along the cross axis to match the move list's height (the default is `alignItems: \"stretch\"`)",
        "The move list wrapping onto a second row",
        "The board and move list being centred horizontally",
        "The move buttons growing wider than their text",
      ],
      answer: 0,
      explain:
        "With `flexDirection: \"row\"`, the cross axis is vertical, and the default `alignItems: \"stretch\"` makes every child as tall as the tallest one. `\"flex-start\"` keeps each child at its own natural height, pinned to the top. Wrapping is controlled by `flexWrap`, and the horizontal (main-axis) position by `justifyContent`.",
    },
    {
      id: "tic-tac-toe-29",
      type: "mcq",
      level: 2,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt: "Predict: what happens if you add a border to the grid container?",
      code: [
        "board: {",
        "  flexDirection: \"row\",",
        "  flexWrap: \"wrap\",",
        "  width: SQUARE_SIZE * 3,",
        "  borderWidth: 1, // added",
        "},",
      ].join("\n"),
      choices: [
        "The grid wraps at two squares per row, because React Native boxes are border-box: the content width drops to 118, which is less than three 40-pt squares",
        "The border is drawn outside the 120-pt width and the grid looks the same",
        "The squares shrink to fit 118 points",
        "Nothing changes, because `borderWidth` is ignored on wrapping containers",
      ],
      answer: 0,
      explain:
        "In React Native, `width` always includes borders and padding (like CSS `box-sizing: border-box`). The squares have fixed widths and no `flexShrink`, so `flexWrap` moves the third square to the next line. The squares' own borders are fine, since they sit inside each square's 40 points. To frame the board, put the border on a wrapper `View` outside `styles.board`.",
    },
    {
      id: "tic-tac-toe-30",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Both lists use array indexes as keys. Each square's key is a template string made from `square-` and `squareIndex`, and each move button's key is `key={historyIndex}`. Why is that safe **here**, when index keys are usually a warning sign?",
      choices: [
        "Neither list ever reorders or inserts in the middle: the board has nine fixed positions, and history only grows or is cut at the end, so an index always refers to the same slot or move",
        "React Native ignores `key` for children of a plain `View`",
        "Template-literal keys are hashed, so they're as good as stable IDs",
        "The React Compiler rewrites index keys into stable IDs",
      ],
      answer: 0,
      explain:
        "Keys tell React which child is which between renders. Index keys break when items are inserted, removed or reordered before others, because the state and identity then attach to the wrong item. Square `i` is always square `i`, and move `n` is always move `n`, even after `handlePlay` cuts the history, since only the tail changes. React Native uses keys exactly like React DOM, and the compiler doesn't touch them.",
    },
    {
      id: "tic-tac-toe-31",
      type: "mcq",
      level: 2,
      topics: ["Zustand", "Architecture"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/index.tsx"],
      prompt:
        "Play three moves, tap back to the launcher, then open Tic-Tac-Toe again. What does the board show, and why?",
      choices: [
        "The same three-move game: `useGameStore` is created at module scope, so its state outlives the unmounted screen until the JS runtime reloads",
        "An empty board: popping the route unmounts `Game` and resets its state",
        "An empty board: Expo Router clears Zustand stores on navigation",
        "The same game, because `combine` persists to AsyncStorage by default",
      ],
      answer: 0,
      explain:
        "A Zustand store is a plain JS object owned by the module, not by a component. Unmounting `Game` only removes its subscription. `useState` would reset, because that state belongs to the component instance. Nothing is written to disk here: persisting across app launches would need the `persist` middleware, which `src/projects/store/stores/cartStore.ts` uses.",
    },
    {
      id: "tic-tac-toe-32",
      type: "multi",
      level: 3,
      topics: ["React Compiler", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "app.config.ts"],
      prompt:
        "The file has no `useMemo`, `useCallback` or `React.memo`. Which statements are true for this repo? Select all that apply.",
      choices: [
        "The React Compiler is switched on with `experiments.reactCompiler: true` in `app.config.ts`",
        "The compiler can cache computed values and JSX (including the inline `onSquareClick` arrows) based on their inputs, so hand-written memoisation isn't needed",
        "The compiler assumes render is pure and that props and state are never mutated, so writing into `squares` in place would break its assumptions",
        "`Square` must still be wrapped in `React.memo` or the compiler skips it",
        "With the compiler on, Zustand selectors are no longer needed",
      ],
      answer: [0, 1, 2],
      explain:
        "The compiler adds memoisation automatically at build time. It only works correctly when code follows the Rules of React: pure render and immutable props and state, which `squares.slice()` respects. It doesn't need `React.memo`. It also has no effect on how external stores notify components: selectors still decide when `useSyncExternalStore` re-renders `Game`.",
    },
    {
      id: "tic-tac-toe-33",
      type: "order",
      level: 2,
      topics: ["Zustand", "React Fundamentals"],
      files: ["docs/06-tic-tac-toe.html", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The write-up grows the store step by step. Put its shapes in order, from the first version to the final one in `index.tsx`.",
      items: [
        "`{ squares }` with `setSquares`, read directly by `Board`",
        "`{ squares, xIsNext }`, adding `setXIsNext` to take turns",
        "`{ history, xIsNext }`, with `Board` now driven by props and `Game` owning the store",
        "`{ history, currentMove, xIsNext }`, adding `jumpTo` for time travel",
        "`{ history, currentMove }`, with `xIsNext` computed from `currentMove`",
      ],
      explain:
        "Each step lifts state higher or removes redundancy: first squares go into a store, then turns are added. Next, state is lifted into `Game` so it can hold every board, then an index is added to view the past. Finally `xIsNext` is deleted because `currentMove % 2 === 0` already encodes it. The final store in `index.tsx` holds only `history` and `currentMove`.",
    },
    {
      id: "tic-tac-toe-34",
      type: "explain",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "An earlier version of this code stored `xIsNext` in the store next to `currentMove`. Explain why the final code computes it instead, and what bug the stored version invites.",
      model:
        "Whose turn it is can be fully worked out from `currentMove`: X plays on even indices, so `xIsNext = currentMove % 2 === 0`. Storing it as well creates two sources of truth that every code path must keep in sync. `handlePlay` had to flip it, and `jumpTo` had to set it from the move's parity. If any path forgets, for example a new \"reset\" action or a jump that skips the update, the board shows the wrong player's turn. Computing it during render removes that whole class of bugs and makes the store smaller (`history` and `currentMove` only). Computing it is free, and the React Compiler can cache it anyway.",
      rubric: [
        "Says `xIsNext` can be fully derived from `currentMove` (`% 2 === 0`)",
        "Names the risk of redundant state: two values that can fall out of sync",
        "Gives a concrete code path that would need updating, such as `jumpTo` or `handlePlay`",
        "Notes that the final store holds only `history` and `currentMove`",
      ],
      explain:
        "The general rule: if a value can be computed from props or existing state, compute it during render and don't store it. The same thinking explains why `winner`, `status` and `currentSquares` are computed values too.",
    },
    {
      id: "tic-tac-toe-35",
      type: "explain",
      level: 2,
      topics: ["Architecture", "React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "AGENTS.md"],
      prompt:
        "`Board` takes `{ xIsNext, squares, onPlay }` as props and never calls `useGameStore`, although it easily could. Explain why this design is better and how it matches the repo's component rule in `AGENTS.md`.",
      model:
        "`Board` and `Square` are presentational (\"dumb\") components: plain data comes in, callbacks go out. `Game` is the only component that knows about the store. It decides which board to show (`history[currentMove]`) and what a move means (`handlePlay` cuts the history and appends). Because of that, `Board` can render any board, past or present, which is exactly what time travel needs. If it read the store directly, it would always show the latest state. The separation also makes `Board` reusable and easy to test or preview with fixed data and no store setup. `AGENTS.md` makes this a rule for the whole repo: components take plain data and callbacks, never a store or view model, and screens own the state.",
      rubric: [
        "Calls `Board` / `Square` presentational: props and callbacks, no store access",
        "Says `Game` owns the store and decides which board to show (`history[currentMove]`)",
        "Links prop-driven rendering to time travel, showing a past board",
        "Mentions reuse or testability with no store",
        "Cites the `AGENTS.md` rule that components are dumb and screens own state",
      ],
      explain:
        "This is \"lifting state up\": shared state moves to the closest common owner, and children get it through props. A store doesn't change that. Choosing which component *subscribes* is still an architecture decision.",
    },
    {
      id: "tic-tac-toe-36",
      type: "explain",
      level: 2,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts", "src/app/_layout.tsx", "src/app/index.tsx", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Trace how tapping the \"Tic-Tac-Toe\" card in the launcher reaches `Game`. Explain why the root layout declares `projects/tic-tac-toe/index` for this project but `projects/<slug>` for the others.",
      model:
        "The launcher (`src/app/index.tsx`) maps over `PROJECTS` and calls `router.push(item.route)`, which is `/projects/tic-tac-toe`. Expo Router resolves that URL from the file tree to `src/app/projects/tic-tac-toe/index.tsx`, whose default export is `Game`. The root `Stack` names screens by route node. Other projects have a `_layout.tsx` in their folder, so `projects/<slug>` is a nested navigator node, and the root hides its header there. Tic-tac-toe has no layout, so there's no `projects/tic-tac-toe` node. The leaf route is `projects/tic-tac-toe/index`, and the `Stack.Screen` must use that name or it matches nothing. The `singleScreen` flag in the registry is what lets `_layout.tsx` choose between the two names, so neither the launcher nor the root has to hardcode the project.",
      rubric: [
        "Launcher maps `PROJECTS` and pushes `route` (`/projects/tic-tac-toe`)",
        "The URL resolves through the file tree to `projects/tic-tac-toe/index.tsx`",
        "No `_layout.tsx` means no `projects/tic-tac-toe` navigator node, so the screen name is `.../index`",
        "`singleScreen` drives the choice in `_layout.tsx`, and the header stays visible",
      ],
      explain:
        "In Expo Router, routes come from files, while `Stack.Screen` only sets options for routes that already exist. A `Stack.Screen` whose name matches no route node does nothing except trigger a warning, which is why the name has to match the file structure.",
    },

    // ---------------------------------------------------------------- L3
    {
      id: "tic-tac-toe-37",
      type: "mcq",
      level: 3,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Predict: someone \"simplifies\" `handleClick` to write into the board in place. On move 3 (`currentMove === 2`), what happens?",
      code: [
        "function handleClick(i: number) {",
        "  if (squares[i] || winner) return;",
        "  squares[i] = player; // mutate in place",
        "  onPlay(squares);",
        "}",
      ].join("\n"),
      choices: [
        "The board updates (because `handlePlay` still builds a new `history` array), but `history[2]` is now the same array as `history[3]`, so \"Go to move #2\" already shows move 3's mark",
        "Nothing re-renders, because Zustand sees the same `squares` reference and skips the update",
        "TypeScript rejects the assignment because props are read-only",
        "It works the same as before, because `.slice()` was only an optimisation",
      ],
      answer: 0,
      explain:
        "`squares` is `history[currentMove]`, so writing into it changes the past snapshot itself. `handlePlay` then appends that **same reference**, but inside a **new** outer array (`[...history.slice(...), squares]`). The `history` selector therefore changes and `Game` re-renders, which hides the bug. Time travel breaks because two entries now share one array. TypeScript doesn't make array props read-only unless you type them as `readonly SquareValue[]`.",
    },
    {
      id: "tic-tac-toe-38",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "React Hooks"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/projects/camera-social/camera.tsx"],
      prompt: "In Zustand v5, what happens if `Game` subscribes like this, with no `useShallow`?",
      code: [
        "const { history, currentMove } = useGameStore((state) => ({",
        "  history: state.history,",
        "  currentMove: state.currentMove,",
        "}));",
      ].join("\n"),
      choices: [
        "The selector returns a new object on every call, so `useSyncExternalStore` sees a changed snapshot each time and React fails with an infinite loop (\"Maximum update depth exceeded\")",
        "It works, but `Game` re-renders on every store change, the same as with no selector",
        "Zustand shallow-compares object results by default, so it behaves like four separate selectors",
        "TypeScript rejects the selector because it returns a new type",
      ],
      answer: 0,
      explain:
        "Zustand v5 passes `() => selector(getState())` to React's `useSyncExternalStore` as the snapshot getter. React requires that getter to return a cached value when nothing has changed. A new object literal is never `Object.is`-equal to the last one, so React keeps re-rendering. v4 used a custom equality hook and only re-rendered too often; v5 fails loudly. The fixes are separate selectors, as this file does, or `useShallow` as in `camera-social/camera.tsx`.",
    },
    {
      id: "tic-tac-toe-39",
      type: "mcq",
      level: 3,
      topics: ["TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "`handlePlay` builds `[...history.slice(0, currentMove + 1), nextSquares]`. Someone rewrites it in two ways. Which one does TypeScript catch at compile time?",
      code: [
        "// A",
        "setHistory(history.slice(0, currentMove + 1).concat(nextSquares));",
        "// B",
        "setHistory([...history.slice(0, currentMove + 1), ...nextSquares]);",
      ].join("\n"),
      choices: [
        "Only B: spreading the board produces `(SquareValue | Squares)[]`, which isn't assignable to `Updater<Squares[]>`. A compiles, because `concat` also accepts single elements, yet it appends nine \"boards\"",
        "Only A: `concat` is strictly typed to take arrays of the element type",
        "Both, because `Updater<Squares[]>` rejects anything that isn't `Squares[]`",
        "Neither, because `history` is inferred as `any[]`",
      ],
      answer: 0,
      explain:
        "`Array.prototype.concat` has an overload `concat(...items: (T | ConcatArray<T>)[])`, where `T` is `Squares`. That makes `nextSquares` type-check as one element `T`, but at runtime `concat` flattens it into nine separate entries. The spread version gives an array with a union element type, which `setHistory` rejects. The write-up names `concat` as one of the few places where the types don't protect you. `history` isn't `any[]`, thanks to `Array<SquareValue>(9)`.",
    },
    {
      id: "tic-tac-toe-40",
      type: "explain",
      level: 3,
      topics: ["Zustand", "React Hooks"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`handlePlay` reads `history` and `currentMove` from the render closure and then makes **two** setter calls. Explain the trade-off, and describe how you'd move \"play a move\" into a single store action with `set((state) => ...)`. Why is that more robust?",
      model:
        "Right now `Game` computes `nextHistory` from values captured during render, then calls `setHistory` and `setCurrentMove` one after the other. Between those two calls the store briefly holds the new history with the old index, and subscribers are notified twice. React batches the re-renders inside the event, so this works. But the logic is spread across a component and relies on the closure being current. A single action like `play: (nextSquares) => set((state) => { const h = [...state.history.slice(0, state.currentMove + 1), nextSquares]; return { history: h, currentMove: h.length - 1 }; })` reads the **latest** store state, changes both fields in one atomic update, and notifies once. It also moves the game rules out of the view, so `Game` only calls `play`, and the rules can be tested through `useGameStore.getState()` with no rendering. This is also what the `Updater` function form is for: computing from `prev` and not from a captured value.",
      rubric: [
        "Notes that the values come from the render closure and that there are two separate `set` calls / notifications",
        "Says there's a brief in-between state (new history, old `currentMove`) and that React batching hides it",
        "Proposes one action using `set((state) => ...)` that updates both fields at once",
        "Gives a benefit: reads the latest state, one notification, logic out of the view, or testable through `getState()`",
      ],
      explain:
        "The general idea: put state transitions that touch several fields together in the store, as one atomic `set` that reads the current state. That keeps components thin, and it's the same reason React recommends functional updaters or reducers when the next state depends on the previous one.",
    },
    {
      id: "tic-tac-toe-41",
      type: "explain",
      level: 3,
      topics: ["Accessibility", "React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "Each `Square` gets `accessibilityRole=\"button\"`, an `accessibilityLabel` from `squareLabel(index, value)` and `accessibilityState={{ disabled }}`. The move buttons get a role and `selected`, and the status `Text` has `accessibilityLiveRegion=\"polite\"`. Explain what a VoiceOver or TalkBack user would experience without these props, what each one adds, and why `Board` (not `Square`) computes the label and `disabled`.",
      model:
        "Without them, a `Pressable` is still focusable (`accessible` defaults to true), but it isn't announced as a button. An empty square has no text, so it's read as an unlabelled element, and a filled one only says \"X\" or \"O\" with no position. The user can't tell which cell they're on, or that a taken cell or a finished game won't respond. The role makes each target announce as a button. The label (\"Row 2, column 3, empty\") gives position and contents. `disabled` (taken square or a winner exists) says the tap does nothing. `selected` marks the move currently on screen. The live region makes Android read the new status (\"Next player: O\", \"Winner X\") after each move, since the status changes away from where focus is. `Board` computes the label and `disabled` because it knows the index and the `winner`. `Square` stays a dumb component that receives plain `label` and `disabled` props, so it needs no game knowledge and `squareLabel` can be unit-tested on its own.",
      rubric: [
        "Says that without the props, squares aren't announced as buttons and empty squares have no readable label or position",
        "Explains role (button), label (position and contents) and state (`disabled`, `selected`)",
        "Explains the live region: status changes get announced without moving focus",
        "Says `Board` computes the label and `disabled` so `Square` stays dumb, and the pure `squareLabel` is testable",
      ],
      explain:
        "On mobile, a visual grid tells a screen reader nothing by itself. Each touch target needs a role, a label and state. These props map to native accessibility traits on iOS and Android, so React Native code needs them just as much as web code needs ARIA. `accessibilityLiveRegion` is Android-only. On iOS you'd call `AccessibilityInfo.announceForAccessibility` for the same effect.",
    },
    {
      id: "tic-tac-toe-42",
      type: "mcq",
      level: 2,
      topics: ["Architecture", "Testing"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/__tests__/game.test.ts", "AGENTS.md"],
      prompt:
        "The store and components stay in the route file, but `calculateWinner`, `countRemainingTurns`, `calculateStatus` and `squareLabel` live in `src/projects/tic-tac-toe/utils/game.ts`. What's the main reason?",
      choices: [
        "Every file under `src/app/` is a route, so a test file can't live there. Pure helpers in a slice can be imported and unit-tested by `__tests__/game.test.ts` without rendering anything",
        "Expo Router refuses to bundle a route file that exports more than one function",
        "The React Compiler only optimises functions that live outside `src/app/`",
        "Zustand's `combine` can't call functions defined in the same file",
      ],
      answer: 0,
      explain:
        "AGENTS.md says unit tests live in `src/projects/<slug>/__tests__/`, never under `src/app/`, because any file there becomes a route. A helper can only be tested if a test can import it, and before the move these helpers weren't exported at all. Pure functions with no React or store dependency are the cheapest thing to test, so they're the first thing to pull out of a screen. Route files *may* export other things (they just shouldn't), and neither the compiler nor `combine` cares where a function is defined.",
    },
  ],
});

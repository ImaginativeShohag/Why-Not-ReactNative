QUIZ.register({
  slug: "tic-tac-toe",
  number: "06",
  title: "Tic-tac-toe with Zustand & Reanimated",
  doc: "../06-tic-tac-toe.html",
  summary:
    "Trains the production tic-tac-toe slice: a typed persist(combine(...)) store with the game rules inside it (scoring once, undo against the computer, guarded time travel, hydration), selectors and re-renders, derived state, an easy/medium/minimax CPU and its exhaustive test, Reanimated 4 shared values, SVG draw-on strokes and layout animations with reduced motion, a self-owned palette, haptics, dumb components, flexbox, keys, accessibility, and how a single-screen project is registered in the launcher.",
  questions: [
    // ---------------------------------------------------------------- L1
    {
      id: "tic-tac-toe-01",
      type: "mcq",
      level: 1,
      topics: ["Zustand", "Architecture"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "Open `src/app/projects/tic-tac-toe/index.tsx`. Where does the game state (`history`, `currentMove`, `scores`, …) actually live? Follow the `useGameStore` import before answering.",
      choices: [
        "In a module-scope Zustand store, `useGameStore`, created with `create(persist(combine(...)))` in `src/projects/tic-tac-toe/stores/gameStore.ts`; the screen reads it through one selector per field",
        "In `useState` inside `TicTacToeScreen`, passed down to `Board` as props",
        "In a React context provider mounted by the project's `_layout.tsx`",
        "In a store created at the top of the route file, next to the screen",
      ],
      answer: 0,
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
      ],
      explain:
        "`useGameStore` is created once, at module scope, in `stores/gameStore.ts`: `create(persist(combine(initialState, (set, get) => ({ ...actions })), { ...options }))`. The route file is a thin screen. It selects each field and action with `useGameStore((state) => state.x)`, derives the view, and wires the dumb components. There is no `_layout.tsx` for this project.\n\n**Why it is built this way.** The rules (`play`, `undo`, `jumpTo`, scoring) live in the store, so they can be unit-tested through `useGameStore.getState()` (`__tests__/gameStore.test.ts`) with nothing rendered. `persist` saves the round and the scores to AsyncStorage.\n\n**Failure mode if you used `useState`:** the game would reset every time the screen unmounts, nothing would survive a restart, and the rules would sit in a component where only a render test can reach them.",
    },
    {
      id: "tic-tac-toe-02",
      type: "text",
      level: 1,
      topics: ["Zustand", "TypeScript"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "Which Zustand middleware, imported from `zustand/middleware`, takes the `initialState` object and the actions creator, so the store's type is inferred with no hand-written interface? Type the function name. Read the imports at the top of `gameStore.ts`.",
      accept: ["combine", "combine()", /^combine\s*\(?\)?$/i],
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
      ],
      explain:
        "`combine(initialState, (set, get) => actions)` merges the plain initial object with whatever the creator returns, and infers the store type from both. That is why `useGameStore` needs no `GameState` interface, and why `get()` inside `play` already knows `history`, `currentMove` and `scores`.\n\n**Design decision.** State is declared once as data and behaviour as functions, with the compiler checking every selector against that shape. A hand-written interface would be a second copy that can drift from the real one.\n\n**Related.** `persist` wraps `combine`, not the other way round: `combine` builds the state type, and `persist` only adds storage on top of it. With `combine` you also skip the curried `create<T>()(...)` form, because the state type is already created for you.",
    },
    {
      id: "tic-tac-toe-03",
      type: "mcq",
      level: 2,
      topics: ["TypeScript", "Zustand"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "The store's initial state writes `mode: \"cpu\" as Mode` and `difficulty: \"medium\" as Difficulty`. What would go wrong with plain `mode: \"cpu\"`? Hover `mode` in your editor and compare what TypeScript infers with and without the assertion.",
      code: [
        "const initialState = {",
        "  ...freshRound(),",
        "  mode: \"cpu\" as Mode,",
        "  difficulty: \"medium\" as Difficulty,",
        "  scores: { pvp: noScores(), cpu: noScores() } as ScoresByMode,",
        "  hapticsEnabled: true,",
        "};",
      ].join("\n"),
      choices: [
        "A string literal in an object property widens to `string`, so `combine` would infer `mode: string`, and passing the selected `mode` to `statusText(view, mode)` or `canJumpTo(move, mode)` would no longer type-check",
        "`combine` throws at runtime if a field has no explicit type",
        "`persist` can only serialise fields that carry a type assertion",
        "Without it, `mode` would be inferred as the literal `\"cpu\"`, so `setMode(\"pvp\")` would be rejected",
      ],
      answer: 0,
      links: [
        { title: "TypeScript: Everyday types (literal types)", url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" },
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
      ],
      explain:
        "`combine` infers the whole store type from `initialState`. In a mutable object, `\"cpu\"` widens to `string`, so `mode` would be typed `string`. The screen then passes it to functions that want a `Mode` (`statusText`, `canJumpTo`, `nextMode`, the `MODE_LABELS[mode]` lookup), and those calls stop compiling. The assertion narrows the field to the union `\"pvp\" | \"cpu\"`.\n\n`as ScoresByMode` is different: the inferred `{ pvp: Scores; cpu: Scores }` is already the same shape as `Record<Mode, Scores>`, so the assertion mostly gives the field its name. It does matter once: `play` indexes it with `scores[mode]`, and the named `Record<Mode, Scores>` type documents that every `Mode` has a tally. `history` needs nothing, because `emptyBoard()` is declared to return `Squares`.\n\n**Design decision.** When a store's type is inferred, the initial object is the type declaration, so it has to be written as precisely as a type would be. The runtime value is unchanged; this is purely for the type checker.",
    },
    {
      id: "tic-tac-toe-04",
      type: "multi",
      level: 1,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "In `TicTacToeScreen`, which of these values are **computed during render** and not stored in the Zustand store? Select all that apply. Mark every `const` the screen computes from other values, then compare with the `initialState` in `gameStore.ts`.",
      choices: [
        "`view` (from `deriveGame(history, currentMove)`)",
        "`boardDisabled`",
        "`bannerMark`",
        "`thinking` (returned by `useCpuTurn`)",
        "`scores`",
        "`currentMove`",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: You might not need an effect", url: "https://react.dev/learn/you-might-not-need-an-effect" },
      ],
      explain:
        "The store holds `history`, `currentMove`, `mode`, `difficulty`, `scores` and `hapticsEnabled`. Everything else is derived while rendering: `deriveGame` returns the `GameView` (`squares`, `next`, `win`, `isDraw`, `isOver`), `boardDisabled` is `!hydrated || view.isOver || cpuTurn`, `bannerMark` picks the winner or whoever is next, and `useCpuTurn` computes `thinking` from the view instead of keeping it in state. (The screen's one `useState`, `boardArea`, is a measured layout height, not game state.)\n\n**Why `scores` is stored.** It counts results across rounds. A new round throws `history` away, so the scores can't be worked out from the current state: they are real data, not a derivation.\n\n**Failure mode otherwise.** A stored `winner` or `isDraw` is a second source of truth. `undo`, `jumpTo` and `newRound` would each have to keep it in step, and one that forgets shows a stale result.",
    },
    {
      id: "tic-tac-toe-05",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "Nothing stores whose turn it is. `nextPlayer(moveIndex)` returns `\"X\"` or `\"O\"` from one condition. Type that condition exactly, as it appears in `utils/game.ts`.",
      accept: [
        "moveIndex % 2 === 0",
        "moveIndex % 2 == 0",
        /^moveIndex\s*%\s*2\s*===?\s*0;?$/i,
      ],
      hint: "It only depends on the index of the move being viewed. X plays the even moves.",
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
      ],
      explain:
        "`return moveIndex % 2 === 0 ? \"X\" : \"O\";`. X moves on even indices, and the empty board is move 0. `deriveGame` sets `next: nextPlayer(currentMove)`, and the store uses the same function in `undo` (`nextPlayer(target) === CPU`) and through `canJumpTo`.\n\n**Why derive it.** If the turn were stored next to `currentMove`, `play`, `undo`, `jumpTo` and `newRound` would all have to set it. Derived, it is right after any time travel with no extra code.\n\n**Tested.** `game.test.ts` pins `[0, 1, 2, 3, 8].map(nextPlayer)` to `[\"X\", \"O\", \"X\", \"O\", \"X\"]`.",
    },
    {
      id: "tic-tac-toe-06",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling", "React Fundamentals"],
      files: ["src/projects/tic-tac-toe/components/ActionBar.tsx"],
      prompt:
        "`ActionBar`'s Undo button renders `<Text style={[styles.label, { color: palette.text }]}>Undo</Text>` inside its `Pressable`. What happens if you drop the `<Text>` and put the string `Undo` straight inside the `Pressable`, as you would inside a web `<button>`?",
      choices: [
        "React Native throws \"Text strings must be rendered within a <Text> component\" when the button renders",
        "It works, but the label loses its font styling",
        "TypeScript rejects it at compile time",
        "The label is drawn, but screen readers can't see it",
      ],
      answer: 0,
      links: [
        { title: "React Native: Text", url: "https://reactnative.dev/docs/text" },
        { title: "React Native: Pressable", url: "https://reactnative.dev/docs/pressable" },
      ],
      explain:
        "In React Native every visible string needs a `<Text>` ancestor. `View` and `Pressable` can't hold raw strings, so the first render throws \"Text strings must be rendered within a <Text> component\". It is a runtime error, not a type error.\n\n**Design consequence.** The rule splits styling in two: box styles (`height`, `borderRadius`, `borderWidth`, `flexDirection`, `gap`) go on the `Pressable` (`styles.button`), and text styles (`fontSize`, `fontWeight`, colour) on the `Text` (`styles.label`).\n\nThe marks on the board avoid the issue entirely: a `Square` renders an SVG `XMark` or `OMark`, not a letter.",
    },
    {
      id: "tic-tac-toe-09",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling"],
      files: ["src/projects/tic-tac-toe/components/Board.tsx", "src/projects/tic-tac-toe/components/Square.tsx"],
      prompt:
        "How does `Board` lay the nine squares out as a 3×3 grid? Read `styles.cells`, the `View` around it, and the `size` each `Square` gets. Don't guess from the web.",
      choices: [
        "`flexDirection: \"row\"` and `flexWrap: \"wrap\"` inside a `View` exactly `grid` wide, with each `Square` sized `cell = grid / 3`, so every row fills at three squares and wraps",
        "`display: \"grid\"` with `gridTemplateColumns: \"repeat(3, 1fr)\"`",
        "Three nested row `View`s, each mapped over a slice of `squares`",
        "A `FlatList` with `numColumns={3}`",
      ],
      answer: 0,
      links: [
        { title: "React Native: Layout with Flexbox", url: "https://reactnative.dev/docs/flexbox" },
        { title: "React Native: Layout props", url: "https://reactnative.dev/docs/layout-props" },
      ],
      explain:
        "Layout in React Native is Yoga flexbox, with no CSS Grid. `Board` computes `const grid = size - PADDING * 2; const cell = grid / 3;`, wraps everything in `<View style={{ width: grid, height: grid }}>`, and maps all nine squares into `styles.cells` (`flexDirection: \"row\"`, `flexWrap: \"wrap\"`). Each `Square` sets `style={{ width: size, height: size }}` with `size={cell}`, so three fit per row and the fourth wraps.\n\n**Why one flat map.** The square index stays the array index, which `squareLabel(index, value)`, `onPress(index)` and `win.line.includes(index)` all rely on. Nested rows would need slicing, and a `FlatList` brings virtualisation for nine cells.\n\n**The grid lines** are separate absolutely positioned `View`s at `cell * k - LINE / 2`, so they don't take part in the wrap at all.",
    },
    {
      id: "tic-tac-toe-10",
      type: "text",
      level: 1,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The screen's `styles.column` is just `{ gap: 12 }`, yet the scoreboard, banner, board, buttons and timeline stack **top to bottom**. What is React Native's default `flexDirection` that causes this? Type the value.",
      accept: ["column", "\"column\"", "flexDirection: column", "flexDirection: \"column\""],
      links: [
        { title: "React Native: Layout with Flexbox", url: "https://reactnative.dev/docs/flexbox" },
      ],
      explain:
        "Every React Native `View` is a flex container with `flexDirection: \"column\"` by default (on the web the default is `row`). So `styles.column` only adds `gap: 12` between children, and they stack vertically.\n\nThe components that need a row say so explicitly: `ActionBar`'s `styles.row`, `Scoreboard`'s `styles.row`, `DifficultyBars`' `styles.row`, the screen's `styles.headerButtons` and `StatusBanner`'s `styles.pill` all set `flexDirection: \"row\"`.\n\n**Failure mode.** Porting web CSS and assuming `row` leaves you with stacked buttons and score tiles.",
    },
    {
      id: "tic-tac-toe-11",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "In the store's `play` action, why does the code copy the board with `const nextSquares: Squares = view.squares.slice();` before writing `nextSquares[index] = view.next;`? What would `history[currentMove]` contain if you skipped the copy?",
      choices: [
        "So the board in `history` is never mutated: a new array is a new reference, which keeps every past board intact for time travel and lets Zustand and React detect the change",
        "Because arrays that come from a Zustand store are frozen and throw when written to",
        "Because `.slice()` deep-clones nested objects, which the board needs",
        "Because `persist` can only save arrays it has never seen before",
      ],
      answer: 0,
      links: [
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
        { title: "MDN: Array.prototype.slice", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice" },
      ],
      explain:
        "`view.squares` is `history[currentMove]`. Copying first keeps every board in `history` an untouched snapshot: undo, the timeline and `moveSquare` all compare or show past boards. `.slice()` is a shallow copy, which is enough because squares hold primitives (`\"X\"`, `\"O\"`, `null`). Zustand doesn't freeze state; mutation is allowed by the language but breaks both change detection and the stored history.\n\n**Failure mode if you mutate.** See question tic-tac-toe-37: two history entries end up sharing one array, so the previous move already shows the new mark.",
    },
    {
      id: "tic-tac-toe-12",
      type: "order",
      level: 1,
      topics: ["Zustand", "React Fundamentals"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "Put the steps of the store's `play(index)` in the order the code runs them. Open `play` in `gameStore.ts` and rebuild the order from the code, not from memory.",
      items: [
        "Read `history`, `currentMove`, `mode` and `scores` with `get()` and derive the current `view`",
        "Return early if `view.isOver` or the square is already filled",
        "Copy `view.squares` with `slice()` and write `view.next` at `index`",
        "Build `nextHistory` from `history.slice(0, currentMove + 1)` plus the new board",
        "Derive `result` from `nextHistory`, bump the current mode's tally (`scores[mode]`) on a win or draw, and build `nextScores`",
        "Call `set` once with `history`, `currentMove` and `scores`",
      ],
      links: [
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
      ],
      explain:
        "`play` is the one place a move becomes legal. It reads the latest state with `get()`, guards (finished round or taken square), copies and writes the board, cuts any future (`slice(0, currentMove + 1)`, where `+ 1` keeps the board on screen), then scores the result of the new board and writes everything in **one** `set`.\n\n**Why one `set`.** Subscribers see the new board, the new index and the new score together, and `persist` saves one consistent snapshot. `currentMove` is `nextHistory.length - 1`, which always points at the board that was just added.\n\n**Failure mode.** Appending to the full `history` after a rewind keeps the old future, and the timeline would mix moves from two games.",
    },
    {
      id: "tic-tac-toe-13",
      type: "text",
      level: 1,
      topics: ["React Fundamentals", "Testing"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/__tests__/game.test.ts"],
      prompt:
        "X, O and X have each played one square. What number does `countRemainingTurns(squares)` return? Read what it filters on in `utils/game.ts`, then check the matching test.",
      accept: ["6", "six"],
      links: [
        { title: "MDN: Array.prototype.filter", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter" },
        { title: "Jest: Expect", url: "https://jestjs.io/docs/expect" },
      ],
      explain:
        "`countRemainingTurns` returns `squares.filter((square) => !square).length`, the number of **empty** squares, which is also the number of turns left: 9 minus 3 gives 6.\n\n**Who uses it.** `deriveGame` calls a full board with no line a draw (`const isDraw = !win && countRemainingTurns(squares) === 0;`), and the minimax `score` in `utils/ai.ts` returns 0 when it reaches 0 with no winner.\n\n**Tested.** The `countRemainingTurns` block in `__tests__/game.test.ts` pins 9, 7 and 0 for three boards.",
    },
    {
      id: "tic-tac-toe-14",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/app/_layout.tsx", "src/shared/config/projects.ts"],
      prompt:
        "Open `src/app/_layout.tsx` and look at the `PROJECTS.map(...)`. Why does the tic-tac-toe screen show the root Stack's native header, while the store, journal and other projects don't? Read the map line by line.",
      choices: [
        "Its entry has `singleScreen: true`, so the root declares `projects/tic-tac-toe/index` with `options={{ title }}`; the other projects are declared with `headerShown: false` because their own `_layout.tsx` Stacks draw their headers",
        "The tic-tac-toe file sets `export const options = { headerShown: true }`",
        "Expo Router always shows a header for routes named `index`",
        "The launcher pushes it with `router.push(route, { header: true })`",
      ],
      answer: 0,
      links: [
        { title: "Expo Router: Core concepts", url: "https://docs.expo.dev/router/basics/core-concepts/" },
        { title: "Expo Router: Stack", url: "https://docs.expo.dev/router/advanced/stack/" },
      ],
      explain:
        "Multi-screen projects are declared as `projects/<slug>` with `headerShown: false`, and their nested Stack in `src/app/projects/<slug>/_layout.tsx` draws its own headers. Tic-tac-toe has no `_layout.tsx` (its folder holds only `index.tsx`), so the root Stack shows it directly: `singleScreen: true` makes the root declare `projects/tic-tac-toe/index` with the registry `title` (\"Tic-Tac-Toe\").\n\n**Why the flag exists.** It keeps the launcher and the root layout free of per-project knowledge: both just map over `PROJECTS`.\n\n**Common wrong ideas.** Expo Router has no route-level `options` export, and the launcher just calls `router.push(item.route)`.",
    },
    {
      id: "tic-tac-toe-15",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts"],
      prompt:
        "In the `PROJECTS` registry, which optional boolean field marks tic-tac-toe as a single route rather than a project with its own stack? Type the field name. The field's doc comment in `src/shared/config/projects.ts` answers it.",
      accept: ["singleScreen", "singleScreen: true"],
      links: [
        { title: "Expo Router: Core concepts", url: "https://docs.expo.dev/router/basics/core-concepts/" },
      ],
      explain:
        "`singleScreen?: boolean` is documented in the `Project` type as \"A single route (projects/<slug>/index) instead of a project stack.\" The root layout reads it to choose the `Stack.Screen` name and passes the entry's `title` as that screen's header title.\n\n**Design decision.** One optional flag in a typed registry is cheaper and safer than special-casing the slug in the layout. A new single-route project needs one registry entry and one route file.\n\n**Failure mode.** Without the flag the root would declare `projects/tic-tac-toe`, which is not a route node (there is no layout), so the screen would get default options and the registry `title` wouldn't apply.",
    },
    {
      id: "tic-tac-toe-61",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling", "Platform Differences"],
      files: ["src/projects/tic-tac-toe/utils/palette.ts", "src/shared/hooks/use-color-scheme.ts", "AGENTS.md"],
      prompt:
        "How does tic-tac-toe choose its light or dark colours? Read `useTicTacToePalette` and the comment above `TicTacToePalette`, then the theming rule in `AGENTS.md`.",
      choices: [
        "`useTicTacToePalette()` reads the shared `useColorScheme()` and returns `colorScheme === \"dark\" ? dark : light`; the screen passes the `palette` object to every component as a prop, and nothing calls `Appearance.setColorScheme`",
        "It calls `Appearance.setColorScheme(\"dark\")` when the screen mounts and resets it to `\"unspecified\"` when it unmounts",
        "It wraps the screen in `ThemedView` / `ThemedText`, which read `DarkTheme` from the root `ThemeProvider`",
        "It keeps the palette in the Zustand store so it is persisted with the game",
      ],
      answer: 0,
      links: [
        { title: "React Native: useColorScheme", url: "https://reactnative.dev/docs/usecolorscheme" },
        { title: "React Native: Appearance", url: "https://reactnative.dev/docs/appearance" },
      ],
      explain:
        "The project owns its colours: two `TicTacToePalette` objects (`light`, `dark`) and a hook that picks one. Components never look a colour up themselves; they get `palette` as a prop, so they stay dumb and previewable in either theme.\n\n**Narrowing.** React Native's colour scheme can be `\"light\"`, `\"dark\"`, `\"unspecified\"` or null, so code compares against `\"dark\"` and treats everything else as light rather than indexing with the raw value.\n\n**Why not `Appearance.setColorScheme`.** It is process-wide: it re-themes the launcher and every other project, and resetting it to `\"unspecified\"` can leave a stale scheme behind. `AGENTS.md` makes this a rule: give the project its own palette instead.",
    },
    {
      "id": "tic-tac-toe-63",
      "type": "text",
      "level": 1,
      "topics": [
        "Layout & Styling"
      ],
      "files": [
        "src/projects/tic-tac-toe/components/MoveTimeline.tsx",
        "AGENTS.md"
      ],
      "prompt": "`MoveTimeline` is a horizontal `ScrollView` inside the screen's column. Which style property and value in its `styles.scroll` stops it growing to fill that column? Type it as `property: value`.",
      "accept": [
        "flexGrow: 0",
        "flexGrow:0",
        "flex-grow: 0",
        /^flexGrow\s*:?\s*0;?$/i
      ],
      "links": [
        {
          "title": "React Native: ScrollView",
          "url": "https://reactnative.dev/docs/scrollview"
        },
        {
          "title": "React Native: Layout props",
          "url": "https://reactnative.dev/docs/layout-props"
        }
      ],
      "explain": "`scroll: { flexGrow: 0 }`, with the comment \"A horizontal ScrollView in a column grows to fill it otherwise.\" A `ScrollView` is a flex container that grows along its parent's main axis by default, so a horizontal one in a vertical column takes up the leftover height instead of being as tall as its chips. `AGENTS.md` lists the same rule for chip rows.\n\n**Related.** The chip spacing lives on `contentContainerStyle` (`gap: 8`), because the style of the scroll view itself doesn't lay out its children. The effect with `scrollToEnd({ animated: !reduceMotion })` keeps the newest move in view whenever the history grows.\n\nUnder React Native 0.88 strict types, scrollRef is useRef<ScrollViewInstance>(null); ScrollView is the component, while ScrollViewInstance exposes scrollToEnd."
    },
    {
      id: "tic-tac-toe-52",
      type: "mcq",
      level: 1,
      topics: ["Reanimated", "React Compiler"],
      files: ["src/projects/tic-tac-toe/components/OMark.tsx", "AGENTS.md"],
      prompt:
        "Every animated component in this slice writes `progress.set(withTiming(1, …))` and reads `progress.get()` inside `useAnimatedStyle` / `useAnimatedProps`. None of them writes `progress.value = …`. Why? Read the React Compiler rules in `AGENTS.md`.",
      choices: [
        "A shared value is returned by a hook (`useSharedValue`), and the React Compiler forbids mutating a hook's return value; Reanimated 4's `get()` / `set()` methods are the compiler-safe way to read and write it",
        "`.value` was removed in Reanimated 4",
        "`set()` runs the animation on the JS thread, while `.value` would run it on the UI thread",
        "`get()` and `set()` re-render the component, which `useAnimatedStyle` needs",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: useSharedValue", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue" },
        { title: "React: Rules of React", url: "https://react.dev/reference/rules" },
      ],
      explain:
        "`AGENTS.md`: \"Don't mutate a value returned from a hook. Call a method instead.\" Assigning `progress.value = x` is exactly that, as far as the compiler can tell, so the repo uses `progress.set(x)` and `progress.get()`. `.value` still exists; the methods do the same thing in a form the compiler accepts.\n\n**What a shared value is.** A mutable box that lives on both the JS and the UI thread. Writing it never re-renders React. Animated styles and props that read it with `get()` update on the UI thread every frame.\n\n**Pattern here.** `useSharedValue(reduceMotion ? 1 : 0)` picks the starting value once, on mount, and an effect then sets it to an animation such as `withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) })`.",
    },

    // ---------------------------------------------------------------- L2
    {
      id: "tic-tac-toe-19",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals", "Testing"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/__tests__/game.test.ts"],
      prompt:
        "Two-player mode. X makes the ninth move, which fills the last empty square **and** completes a diagonal. What does the banner say, and which test pins it? Trace `deriveGame` and `statusText` by hand.",
      code: [
        "if (view.win) {",
        "  if (mode === \"cpu\")",
        "    return view.win.winner === HUMAN ? \"You win!\" : \"Computer wins\";",
        "  return `${view.win.winner} wins!`;",
        "}",
        "if (view.isDraw) return \"It's a draw\";",
      ].join("\n"),
      choices: ["`X wins!`", "`It's a draw`", "`O to play`", "`You win!`"],
      answer: 0,
      links: [
        { title: "TypeScript: Narrowing", url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html" },
        { title: "Jest: Expect", url: "https://jestjs.io/docs/expect" },
      ],
      explain:
        "`deriveGame` computes `const isDraw = !win && countRemainingTurns(squares) === 0;`, so a full board **with** a line is not a draw. `statusText` checks `view.win` first and, in pvp mode, returns `` `${view.win.winner} wins!` `` = `X wins!`.\n\n**Pinned twice.** `deriveGame` \"counts a win on the ninth square as a win, not a draw\" (`isDraw` false, `isOver` true), and `statusText` \"prefers the winner, even on the ninth square\" (board `XOXOXOOXX` gives `\"X wins!\"`).\n\n**Why it matters beyond the banner.** `play` scores from the same `result`: a win adds to `X` in the current mode's tally, and only `result.isDraw` adds a draw, so the ninth-square win is never counted as both.",
    },
    {
      id: "tic-tac-toe-20",
      type: "order",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/Board.tsx", "src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "Two-player mode: a player taps an empty square. Put the steps from the tap to the updated screen in order. Follow one press with go-to-definition on each callback.",
      items: [
        "`Square`'s `Pressable` calls its `onPress` prop: the `() => onPress(index)` arrow `Board` made for that square",
        "`Board`'s `onPress` is the screen's `play`, the store action selected with `useGameStore((state) => state.play)`",
        "`play` checks the move, builds the next board and history, and calls `set` once",
        "Zustand merges the partial state and notifies subscribers; each selector result is compared with `Object.is`",
        "`TicTacToeScreen` re-renders and calls `deriveGame(history, currentMove)` again",
        "`Board` receives the new `squares`, and the new `Square` renders an `XMark` or `OMark` that draws itself on",
      ],
      links: [
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
        { title: "React: Sharing state between components", url: "https://react.dev/learn/sharing-state-between-components" },
      ],
      explain:
        "Data flows down (screen to `Board` to `Square`, through props) and events flow up (callbacks). Only the screen talks to the store, and the store decides whether the move is legal. Zustand's hook feeds React's `useSyncExternalStore`, which re-renders the screen because its `history` and `currentMove` selectors now return new values.\n\n**Why it is built as a loop.** One owner, one direction. `Board` can render any board without knowing about the store, which is what time travel relies on.\n\n**Failure mode.** If `Square` wrote to the store itself, the rules would be split between components and the same press could be handled in two places.",
    },
    {
      id: "tic-tac-toe-21",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/__tests__/gameStore.test.ts"],
      prompt:
        "Two-player mode. Five moves have been played with no winner, so `history.length === 6` and `currentMove === 5`. The player taps the timeline chip for move 2, then taps an empty square. What are `history.length` and `currentMove` afterwards? Do the arithmetic with the real `slice` and `length - 1` expressions in `play`.",
      choices: [
        "`history.length === 4`, `currentMove === 3`",
        "`history.length === 7`, `currentMove === 6`",
        "`history.length === 7`, `currentMove === 3`",
        "`history.length === 3`, `currentMove === 2`",
      ],
      answer: 0,
      links: [
        { title: "MDN: Array.prototype.slice", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice" },
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
      ],
      explain:
        "`jumpTo(2)` only sets `currentMove = 2`. The next `play` keeps `history.slice(0, 3)` (boards 0, 1 and 2), appends the new board to get length 4, and sets `currentMove: nextHistory.length - 1`, which is 3. Moves 3 to 5 of the old timeline are dropped.\n\n**Tested.** \"throws the future away after a jump back\" plays three moves, jumps to 1, plays square 8, and expects length 3, `currentMove` 2, O on square 8 and square 2 empty again.\n\n**Design decision.** \"A new branch replaces the future\" is how every undo stack behaves. It falls out of two small rules: `jumpTo` never touches `history`, and `play` always slices at `currentMove + 1`.",
    },
    {
      id: "tic-tac-toe-22",
      type: "order",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/projects/tic-tac-toe/components/MoveTimeline.tsx", "src/projects/tic-tac-toe/stores/gameStore.ts", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Two-player mode, mid-game: the player taps the timeline chip for move 2. Put what happens in order. Read `MoveTimeline`, then `jumpTo` in the store.",
      items: [
        "The chip's `Pressable` calls `onSelect(2)`, which the screen wired to the store's `jumpTo`",
        "`jumpTo` returns early for an out-of-range move, a move `canJumpTo` rejects, or a finished round",
        "`jumpTo` calls `set({ currentMove: move })`; `history` is left as it is, later boards included",
        "The screen re-renders, and `deriveGame(history, 2)` gives the board after move 2 with X to play",
        "`MoveTimeline` marks chip 2 as selected and fades the later chips as `future`, still pressable",
      ],
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
      ],
      explain:
        "Time travel only moves an index. `jumpTo` never touches `history`, so you can jump forward again until a new move is played; only then does `play` cut the future off. The turn comes out right with no extra code, because `next` is derived from `currentMove`.\n\n**Guards in the store, not the UI.** The chip is already disabled when the round is over or the move is not selectable, but `jumpTo` checks the range, `canJumpTo(move, mode)` and `isOver` itself, so a caller can't bypass the rules.\n\n**In the chip.** `future = move > currentMove` only lowers the opacity; `locked` and `selected` decide `disabled`.",
    },
    {
      id: "tic-tac-toe-25",
      type: "mcq",
      level: 2,
      topics: ["Zustand"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "`undo` ends with `set({ currentMove: Math.max(0, target) })`, an object with **only** `currentMove`. What happens to `history`, `scores` and the actions? Compare it with the full state, then look at how `play` writes `scores`.",
      choices: [
        "They're kept: Zustand's `set` shallow-merges the partial object into the current state",
        "They're removed: you have to spread `...get()` or `history` becomes `undefined`",
        "`history` is kept, but the actions are dropped and recreated by `combine` on the next render",
        "`persist` throws because the partial doesn't match the saved shape",
      ],
      answer: 0,
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
      ],
      explain:
        "Zustand's `setState` merges the partial into the current state unless you pass `replace: true`, so everything not named is kept. That is why `undo`, `jumpTo`, `setHapticsEnabled` and `resetScores` each name only what they change, and `setMode` can write `{ mode, ...freshRound() }`.\n\n**Only one level deep.** The merge is shallow, so a nested object is replaced, not merged. That is why `play` copies both levels by hand: `nextTally = { ...tally, draw: tally.draw + 1 }` (or `{ ...tally, [winner]: tally[winner] + 1 }`) keeps `X` and `O`, and `{ ...scores, [mode]: nextTally }` keeps the other mode's tally. Returning `{ scores: { [mode]: { draw: 1 } } }` would wipe the other mode and the other two counts. `resetScores` follows the same rule with `{ ...state.scores, [state.mode]: noScores() }`.\n\n**Failure mode.** Believing the merge is deep and writing a partial nested object silently resets the other keys.",
    },
    {
      id: "tic-tac-toe-28",
      type: "mcq",
      level: 2,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The `ScrollView`'s `styles.content` has `alignItems: \"center\"`, and the column inside it is `<View style={[styles.column, styles.fill, { width: columnWidth }]}>` with `const columnWidth = Math.min(width - 32, 380);`. Why does the column need that explicit `width`?",
      choices: [
        "`alignItems: \"center\"` centres the column and also stops it stretching, so without a width it would only be as wide as its content; `width: columnWidth` pins it to the widest the board may be, and the controls inside (which stretch by default) line up with the board's edges",
        "`alignItems: \"center\"` is ignored in a `ScrollView`, so the width is the only way to centre",
        "Without a width the column would overflow the screen on every phone",
        "`gap` only works on a `View` with an explicit width",
      ],
      answer: 0,
      links: [
        { title: "React Native: Layout with Flexbox", url: "https://reactnative.dev/docs/flexbox" },
        { title: "React Native: useWindowDimensions", url: "https://reactnative.dev/docs/usewindowdimensions" },
      ],
      explain:
        "In a column, `alignItems` controls the cross axis (horizontal). The default `\"stretch\"` makes children as wide as the parent; `\"center\"` centres them **at their own width**. So the column must be told how wide to be. Giving it `columnWidth` makes the `Scoreboard`, `StatusBanner` slot, `ActionBar` and the horizontal `MoveTimeline` (all stretched inside the column, whose own `alignItems` is the default) as wide as the widest board.\n\n**The size itself.** `useWindowDimensions()` gives the window width; `width - 32` leaves the 16-point horizontal padding, and `380` caps it on tablets. It updates on rotation. The board itself is `boardSize = Math.max(MIN_BOARD, Math.min(columnWidth, boardArea))`: never wider than the column, and smaller when the measured height left for it is (question tic-tac-toe-67).\n\n**Failure mode.** Without the width, each row would size to its content, and the timeline could become as wide as all its chips.",
    },
    {
      id: "tic-tac-toe-29",
      type: "mcq",
      level: 2,
      topics: ["Layout & Styling"],
      files: ["src/projects/tic-tac-toe/components/Board.tsx"],
      prompt:
        "`Board` gets `size={380}`. The card has `padding: PADDING` (12) and `width: size`. What are `grid` and `cell`, and why does the code subtract `PADDING * 2`? Ignore the hairline border.",
      choices: [
        "`grid` is 356 and `cell` about 118.67: React Native's `width` includes padding (border-box), so the card's content box is `size - PADDING * 2` wide and the 3×3 grid has to fit inside it",
        "`grid` is 380 and `cell` about 126.67: padding is added outside `width`, so nothing needs subtracting",
        "`grid` is 356 and `cell` about 118.67, but only because the shadow needs the extra room",
        "`grid` is 368 and `cell` about 122.67: padding is applied to one side only",
      ],
      answer: 0,
      links: [
        { title: "React Native: Layout props", url: "https://reactnative.dev/docs/layout-props" },
        { title: "React Native: View", url: "https://reactnative.dev/docs/view" },
      ],
      explain:
        "`const grid = size - PADDING * 2;` gives 380 − 24 = 356, and `const cell = grid / 3;` about 118.67. In React Native `width` always includes padding and borders, like CSS `box-sizing: border-box`, so 12 points on each side come out of the 380.\n\n**Failure mode if you used `size`.** The inner `View` would be 24 points wider and taller than the card's content box. It starts at the padding edge, so it would spill out past the right and bottom of the card, and the board would look off-centre.\n\n**Same numbers elsewhere.** `WinLine` gets `size={grid}`, and the grid lines sit at `cell * k - LINE / 2`, so everything inside the card is measured from `grid`, never from `size`.",
    },
    {
      id: "tic-tac-toe-30",
      type: "multi",
      level: 2,
      topics: ["React Fundamentals", "Reanimated"],
      files: ["src/projects/tic-tac-toe/components/Board.tsx", "src/projects/tic-tac-toe/components/MoveTimeline.tsx", "src/projects/tic-tac-toe/components/StatusBanner.tsx"],
      prompt:
        "Which statements about the `key`s in this slice are true? Select all that apply. Read the React docs on keys, then check how each list or element can change.",
      choices: [
        "`key={index}` on the nine `Square`s is safe: a square never moves, so index `i` is always the same cell",
        "`key={move}` on the timeline chips is safe: `history` only grows or is cut at the end, so index `n` is always move `n`",
        "`key={text}` on the `StatusBanner` pill makes each new status a new `Animated.View`, so the old pill plays `exiting` while the new one plays `entering`",
        "`key={win.line.join(\"-\")}` on `WinLine` makes a different line a new component, so its shared value starts again and the stroke draws on afresh",
        "React Native ignores `key` for children of a plain `View`",
        "The React Compiler rewrites index keys into stable IDs",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "React: Rendering lists (keys)", url: "https://react.dev/learn/rendering-lists" },
        { title: "Reanimated: Entering/Exiting animations", url: "https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations" },
      ],
      explain:
        "Keys tell React which child is which between renders. Index keys break when items are inserted, removed or reordered, because state then attaches to the wrong item. Neither list here does that: the board has nine fixed positions, and `play` only truncates and appends at the **end** of `history`.\n\n**Keys as a remount switch.** A key also works on a single element: change it and React unmounts the old one and mounts a new one. `StatusBanner` uses `key={text}` so each status gets its own `FadeInDown` / `FadeOutUp`, with the pill `position: \"absolute\"` so the two overlap instead of stacking. `WinLine` uses the line as a key so `useSharedValue(...)` starts from 0 again.\n\nReact Native uses keys exactly like React DOM, and the compiler doesn't touch them.",
    },
    {
      id: "tic-tac-toe-31",
      type: "mcq",
      level: 2,
      topics: ["Zustand", "Architecture"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "Play three moves, force-quit the app, launch it again and open Tic-Tac-Toe. What does the board show, and why? Read the second argument to `persist(...)`.",
      choices: [
        "The same three-move game: `persist` saved `history`, `currentMove` and the rest under `tic-tac-toe/game` in AsyncStorage on every `set`, and restores it on launch",
        "An empty board: a module-scope store only lives as long as the JS runtime",
        "An empty board: `partialize` leaves `history` out, so only the scores survive",
        "The same game, because `combine` writes to AsyncStorage by default",
      ],
      answer: 0,
      links: [
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
        { title: "Zustand: Persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" },
      ],
      explain:
        "Without `persist`, the second choice would be right: a Zustand store is a module-level object, so it outlives an unmounted screen but not a cold launch. Here `persist` writes the `partialize`d state (`history`, `currentMove`, `mode`, `difficulty`, `scores`, `hapticsEnabled`) to AsyncStorage after every change and merges it back in on launch, so the round, the mode and the scores all survive.\n\n**The catch.** AsyncStorage is asynchronous, so for a moment after launch the store holds the defaults. The screen keeps the board disabled until `useGameHydrated()` is true (question tic-tac-toe-46).\n\n`combine` has nothing to do with storage; it only builds the state type.",
    },
    {
      id: "tic-tac-toe-43",
      type: "multi",
      level: 2,
      topics: ["Zustand"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "Read the options object passed to `persist(...)`. Which statements are true? Select all that apply.",
      code: [
        "{",
        "  name: \"tic-tac-toe/game\",",
        "  version: 2,",
        "  storage: createJSONStorage(() => AsyncStorage),",
        "  migrate: migrateGame,",
        "  // Data only: actions are recreated by `combine` on every launch.",
        "  partialize: ({",
        "    history,",
        "    currentMove,",
        "    mode,",
        "    difficulty,",
        "    scores,",
        "    hapticsEnabled,",
        "  }) => ({",
      ].join("\n"),
      choices: [
        "`name` is the storage key the saved state lives under",
        "`createJSONStorage(() => AsyncStorage)` adapts the async key-value store, serialising state to JSON on write and parsing it on read",
        "`partialize` picks the data fields to save; the actions are left out and recreated by `combine` on every launch",
        "`version: 2` is saved with the data; a save stamped with an older version is passed through `migrate` (here `migrateGame`) before it is merged",
        "`persist` writes only once, when the app goes to the background",
        "Without `partialize`, `persist` would throw, because functions can't be turned into JSON",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
        { title: "Zustand: Persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" },
      ],
      explain:
        "True: `name` is the AsyncStorage key; `createJSONStorage` turns a `getItem` / `setItem` storage into one that stores JSON strings; `partialize` lists the data to save (the comment says why actions are left out); and `version` is stored next to the state, so a save from an older version goes through `migrate` first. It is 2 because the scores changed shape: version 1 kept one shared tally, version 2 keeps one per mode (question tic-tac-toe-65).\n\nFalse: `persist` writes after **every** `set`, not on backgrounding. And `JSON.stringify` silently drops functions, so leaving out `partialize` wouldn't throw; `partialize` makes the saved shape explicit and keeps it stable when new fields or actions are added.\n\n**Why the key is namespaced.** AsyncStorage is shared by every project in the app, so `tic-tac-toe/game` can't collide with the store's cart or the podcast queue.",
    },
    {
      id: "tic-tac-toe-44",
      type: "text",
      level: 2,
      topics: ["Zustand", "Testing"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/__tests__/gameStore.test.ts"],
      prompt:
        "vs-CPU mode. The human (X) played square 0, the CPU 4, the human 8 and the CPU 2, so `currentMove` is 4 and it's the human's turn. The human taps Undo. What is `currentMove` afterwards? Trace `undo` with the real numbers.",
      code: [
        "let target = currentMove - 1;",
        "// Against the computer, step back past its reply to the human's turn.",
        "if (mode === \"cpu\" && nextPlayer(target) === CPU) target -= 1;",
        "set({ currentMove: Math.max(0, target) });",
      ].join("\n"),
      accept: ["2", "two"],
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Jest: Expect", url: "https://jestjs.io/docs/expect" },
      ],
      explain:
        "`target` starts at 3. `nextPlayer(3)` is `\"O\"`, which is `CPU`, so `target` drops to 2: the board after the human's move 0 and the CPU's move 4, with X to play. The test \"returns to the human's turn after the CPU replied\" asserts exactly `currentMove` 2 and `next` X.\n\n**Why skip the CPU's turn.** Landing on move 3 would leave O to play, so `useCpuTurn` would reply 450 ms later and the undo would look like it did nothing (or played a different reply).\n\n**The other case.** If the CPU is still thinking (`currentMove` 3), `target` is 2 and `nextPlayer(2)` is X, so undo removes the human's last move, and the pending CPU timer is cleared by the effect cleanup. `Math.max(0, …)` is a floor so the index can never go negative.",
    },
    {
      id: "tic-tac-toe-45",
      type: "mcq",
      level: 2,
      topics: ["Zustand", "Architecture"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/components/MoveTimeline.tsx"],
      prompt:
        "In vs-CPU mode the timeline shows chips for moves 1 and 3, but they can't be pressed. `canJumpTo` is `mode === \"pvp\" || nextPlayer(move) === HUMAN`. Why block the boards where it's the CPU's turn? Read the doc comment above `canJumpTo`.",
      choices: [
        "Landing on a board where O is to move would make `useCpuTurn` reply at once, and that `play` would cut every later move off the timeline",
        "The CPU's boards aren't saved in `history`, so there is nothing to show",
        "`pickMove` can only play on the latest board",
        "Jumping to an odd move would count the result twice in `scores`",
      ],
      answer: 0,
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
      ],
      explain:
        "The comment says it: \"landing on the CPU's turn would make it reply at once and throw the rest of the timeline away.\" Every board is in `history`, but on an odd move `next` is O, the CPU timer starts, and its `play` truncates `history` at that move. Restricting time travel to the human's turns keeps the timeline browsable.\n\n**Enforced twice, decided once.** The screen passes `isSelectable={(move) => canJumpTo(move, mode)}`, so `MoveTimeline` shows those chips locked, and the store's `jumpTo` checks `canJumpTo(move, mode)` too. The rule is one pure function in `utils/game.ts` that both use, with its own test: `[0, 1, 2, 3]` gives `[true, false, true, false]` in cpu mode and all `true` in pvp.\n\nThe store test \"only lands on the human's turns\" shows `jumpTo(1)` being ignored.",
    },
    {
      id: "tic-tac-toe-47",
      type: "multi",
      level: 2,
      topics: ["Minimax", "Testing"],
      files: ["src/projects/tic-tac-toe/utils/ai.ts", "src/projects/tic-tac-toe/__tests__/ai.test.ts"],
      prompt:
        "Read `pickMove` in `utils/ai.ts`. Which statements about the three difficulties are true? Select all that apply.",
      choices: [
        "`easy` returns any empty square, picked with `random`",
        "`medium` takes its own winning square first, then blocks the opponent's, then plays at random",
        "`hard` scores every empty square with minimax and picks among the best-scoring moves with `random`",
        "Every level returns -1 when the board is full or already has a winner",
        "`medium` blocks before it looks for its own win",
        "`easy` may return a filled square, which `play` then ignores",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Jest: Expect", url: "https://jestjs.io/docs/expect" },
      ],
      explain:
        "`pickMove` first returns -1 for a won board (`findWinningLine`) or a full one (`emptySquares` is empty). Then `easy` is `pickRandom(empty, random)`; `medium` checks `findImmediateWin(squares, cpu)`, then `findImmediateWin(squares, opponent(cpu))`, then random; and `hard` is `pickRandom(bestMoves(squares, cpu), random)`.\n\n**Order matters for medium.** Winning beats blocking: the test \"takes an immediate win at medium and hard\" uses `XX.OO.X..`, where O can win at 5 while X threatens 2, and expects 5.\n\n**Easy never picks a filled square.** It only chooses from `emptySquares`, and \"only ever picks empty squares at easy\" sweeps `random` from 0 to 1 to check it. `random` defaults to `Math.random` but is injectable, which is what makes these tests deterministic.",
    },
    {
      id: "tic-tac-toe-50",
      type: "mcq",
      level: 2,
      topics: ["React Hooks", "Minimax"],
      files: ["src/projects/tic-tac-toe/hooks/useCpuTurn.ts", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "vs-CPU mode. The human plays, and while the CPU is \"thinking\" (its 450 ms timer is pending) the human taps Undo. What stops the CPU from playing its now stale move?",
      code: [
        "useEffect(() => {",
        "  if (mode !== \"cpu\" || isOver || next !== CPU) return;",
        "  const timer = setTimeout(() => {",
        "    const index = pickMove(squares, CPU, difficulty);",
        "    if (index !== -1) play(index);",
        "  }, CPU_DELAY_MS);",
        "  return () => clearTimeout(timer);",
        "}, [squares, next, isOver, mode, difficulty, play]);",
      ].join("\n"),
      choices: [
        "`undo` changes `currentMove`, so `squares` and `next` change; React runs the old effect's cleanup (`clearTimeout(timer)`) before the new run, which sees it's X's turn and schedules nothing",
        "`play` rejects the CPU's move because the square it picked is now taken",
        "`setTimeout` callbacks are cancelled automatically when the component re-renders",
        "`pickMove` notices the board changed and returns -1",
      ],
      answer: 0,
      links: [
        { title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" },
        { title: "React: Synchronizing with effects", url: "https://react.dev/learn/synchronizing-with-effects" },
      ],
      explain:
        "Each effect run owns one timer, and its cleanup clears that timer. When any dependency changes (an undo, a new round, a mode or difficulty switch), React calls the cleanup first, so a timer scheduled for an old board can never fire. Unmounting the screen runs the cleanup too.\n\n**Why the other choices fail.** The CPU's stale square might well be empty on the rewound board, so `play` would accept it; re-renders don't cancel timers; and `pickMove` is a pure function of the board it was given, with no idea the store moved on.\n\n**`play` in the deps.** It's an action created once by `combine`, so its reference never changes and never restarts the timer by itself.",
    },
    {
      id: "tic-tac-toe-53",
      type: "multi",
      level: 2,
      topics: ["Reanimated"],
      files: ["src/projects/tic-tac-toe/components/XMark.tsx", "src/projects/tic-tac-toe/components/WinLine.tsx", "src/projects/tic-tac-toe/components/Scoreboard.tsx", "src/projects/tic-tac-toe/components/ActionBar.tsx", "src/projects/tic-tac-toe/components/OMark.tsx", "src/projects/tic-tac-toe/components/StatusBanner.tsx"],
      prompt:
        "Reanimated animations are built by composing small functions (`withTiming`, `withSpring`, `withDelay`, `withSequence`, `withRepeat`). Which statements match the components? Select all that apply.",
      choices: [
        "`XMark` delays its second stroke with `withDelay(140, withTiming(1, { duration: 180, easing }))`, so the X draws as two strokes, one after the other",
        "`WinLine` wraps its draw in `withDelay(220, …)`, so the line starts once the last mark has drawn",
        "A score tile's bump is `withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 }))`: a quick grow, then a springy settle",
        "`ActionBar`'s \"Play again\" pulse uses `withRepeat(…, -1)` to loop forever, and its effect cleanup calls `cancelAnimation(pulse)`",
        "`OMark` draws its ring with `withSpring` on `progress` and pops in with `withTiming` on `scale`",
        "The three thinking dots in `StatusBanner` bounce in sync because they share one shared value",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Reanimated: withTiming", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming" },
        { title: "Reanimated: withSpring", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring" },
        { title: "Reanimated: withDelay", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withDelay" },
        { title: "Reanimated: withSequence", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence" },
        { title: "Reanimated: withRepeat", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat" },
      ],
      explain:
        "True: the X's two strokes are staggered with `withDelay(140, …)`; the win line waits `220` ms; the tile bump chains a timing and a spring with `withSequence`; and the pulse repeats with `-1` (forever) and is cancelled in the cleanup and whenever the round is no longer over.\n\nFalse: `OMark` is the other way round, `withTiming` (340 ms, ease-out) draws the ring and `withSpring(1, { damping: 11, stiffness: 240 })` pops the scale. Each `Dot` has its **own** `lift` shared value and starts with `withDelay(delay, withRepeat(…))`, where `delay={i * 120}` staggers them into a wave.\n\n**Rule of thumb in this code.** `withTiming` for things with a known length (strokes, fades), `withSpring` for things that should feel physical (pops, settles, the header buttons' press).",
    },
    {
      id: "tic-tac-toe-54",
      type: "mcq",
      level: 2,
      topics: ["Reanimated"],
      files: ["src/projects/tic-tac-toe/components/OMark.tsx"],
      prompt:
        "`OMark` animates `strokeDashoffset` through `useAnimatedProps` on `const AnimatedCircle = Animated.createAnimatedComponent(Circle);`. Why not `useAnimatedStyle` on a plain `Circle`?",
      code: [
        "const circleProps = useAnimatedProps(() => ({",
        "  strokeDashoffset: circumference * (1 - progress.get()),",
        "}));",
      ].join("\n"),
      choices: [
        "`strokeDashoffset` is a prop of the SVG element, not a style, so it needs `useAnimatedProps`; and only a component wrapped with `createAnimatedComponent` accepts `animatedProps` and can be updated from the UI thread without re-rendering React",
        "`useAnimatedStyle` doesn't work on iOS",
        "`createAnimatedComponent` is what makes the circle respond to touches",
        "`useAnimatedProps` re-renders the component every frame, which SVG needs",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: useAnimatedProps", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps" },
        { title: "Reanimated: createAnimatedComponent", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent" },
      ],
      explain:
        "`useAnimatedStyle` drives `style`. SVG attributes such as `strokeDashoffset` are ordinary props, so they go through `useAnimatedProps`, and the result is passed as `animatedProps={circleProps}`. `createAnimatedComponent` is what lets a third-party component (`Circle` from `react-native-svg`) take `animatedProps` and be updated natively each frame, with no React render.\n\n**The draw-on trick.** `strokeDasharray={circumference}` makes one dash exactly as long as the ring. An offset of `circumference` slides that dash fully out of view; an offset of 0 shows all of it. So `circumference * (1 - progress.get())` reveals the ring as `progress` goes 0 to 1. `rotation={-90}` around the centre makes it start at 12 o'clock instead of 3. `XMark` and `WinLine` use the same trick on `Path`s, with their own `length`.",
    },
    {
      id: "tic-tac-toe-55",
      type: "mcq",
      level: 2,
      topics: ["Reanimated", "Performance"],
      files: ["src/projects/tic-tac-toe/components/Square.tsx", "src/projects/tic-tac-toe/components/ActionBar.tsx"],
      prompt:
        "`Square` shrinks on press with a shared value (`press.set(withSpring(0.9, { damping: 15, stiffness: 400 }))` in `onPressIn`), while `ActionBar`'s buttons use Pressable's style function (`transform: [{ scale: pressed && !reduceMotion ? 0.96 : 1 }]`). What's the practical difference?",
      choices: [
        "The style function jumps straight to 0.96 when React re-renders the `Pressable`; the shared value springs smoothly on the UI thread with no re-render, and `useAnimatedStyle` multiplies it with the win `pulse` (`scale: press.get() * pulse.get()`)",
        "The style function doesn't work on Android",
        "The shared value is needed because a disabled `Pressable` still reports `pressed`",
        "There is none: both animate the scale the same way",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: useAnimatedStyle", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle" },
        { title: "React Native: Pressable", url: "https://reactnative.dev/docs/pressable" },
      ],
      explain:
        "`style={({ pressed }) => …}` is plain React state: the `Pressable` re-renders with `pressed` true and the new transform applies at once, with no animation. That is fine for secondary buttons. The square is the main touch target, so it gets a spring: `onPressIn` springs `press` to 0.9, `onPressOut` springs it back to 1, and both run on the UI thread.\n\n**Composing.** `contentStyle` reads several shared values in one worklet: `opacity: fade.get()` and `scale: press.get() * pulse.get()`, so the press squash and the winning pulse combine without fighting.\n\n**Reduced motion.** `onPressIn` does nothing when `reduceMotion` is on, but `onPressOut` always resets to 1 (instantly with reduce motion), so a square can never be left shrunk.",
    },
    {
      id: "tic-tac-toe-57",
      type: "mcq",
      level: 2,
      topics: ["Reanimated", "Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/StatusBanner.tsx", "src/projects/tic-tac-toe/components/MoveTimeline.tsx"],
      prompt:
        "Switch the mode from \"2 players\" to \"vs CPU\". The difficulty button appears in the header and a new round starts. Which layout animations does the slice still use, and why does the screen's content need no `layout` transition? Search for `entering`, `exiting` and `layout=`.",
      choices: [
        "Only `entering` / `exiting`: the `StatusBanner` pill (keyed by its text) and the `MoveTimeline` chips; nothing above the board mounts or unmounts in the page any more, because mode and difficulty live in the header, so the content never has to glide out of the way",
        "A `LinearTransition` on the column, so the board slides down when the difficulty button appears",
        "`FadeInDown` on the difficulty button, which also pushes the scoreboard down smoothly",
        "None at all: Reanimated layout animations were removed in version 4",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: Entering/Exiting animations", url: "https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations" },
        { title: "Reanimated: Layout transitions", url: "https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions" },
      ],
      explain:
        "Reanimated has two kinds of layout animation. `entering` / `exiting` run when a view mounts or unmounts; `layout` runs when a mounted view's **position or size** changes. The banner uses the first kind: the pill is keyed by `text`, so each status is a new view with `FadeInDown` in and `FadeOutUp` out. The timeline chips get `entering` (`FadeIn` for the first, `ZoomIn.springify()` for the rest).\n\n**Why no `layout` transition.** An earlier screen had a difficulty row that mounted under the mode control and pushed everything down, so the column needed `LinearTransition` to glide. Now the difficulty button is rendered by `headerRight`, inside the navigation bar, and the page's content is a plain `View`: switching mode changes nothing above the board.\n\n**Reduced motion.** Each `entering` / `exiting` is `reduceMotion ? undefined : …`, so with reduce motion on, the views just appear."
    },
    {
      id: "tic-tac-toe-59",
      type: "multi",
      level: 2,
      topics: ["Reanimated", "Accessibility"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/XMark.tsx", "src/projects/tic-tac-toe/components/WinLine.tsx", "src/projects/tic-tac-toe/components/MoveTimeline.tsx"],
      prompt:
        "How does the slice honour the system's Reduce Motion setting? Select all that apply. Start from `useReducedMotion()` in the screen and follow `reduceMotion` into the components.",
      choices: [
        "The screen calls `useReducedMotion()` once and passes `reduceMotion` to every component as a plain prop",
        "Layout animations are turned off by passing `undefined` to `entering`, `exiting` and `layout`",
        "Marks and the win line start their shared values at 1 (`useSharedValue(reduceMotion ? 1 : 0)`), so they appear fully drawn",
        "`MoveTimeline` still scrolls to the newest chip, but with `scrollToEnd({ animated: !reduceMotion })`",
        "With Reduce Motion on, the winning line isn't drawn at all",
        "Each component calls `AccessibilityInfo.isReduceMotionEnabled()` itself",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Reanimated: useReducedMotion", url: "https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion" },
        { title: "React Native: AccessibilityInfo", url: "https://reactnative.dev/docs/accessibilityinfo" },
      ],
      explain:
        "One reader, many consumers: `const reduceMotion = useReducedMotion();` in the screen, then a `reduceMotion` prop everywhere, which keeps the components dumb and lets a preview force either mode.\n\nEach component then picks an end state instead of a motion: `entering={reduceMotion ? undefined : …}`, shared values that start at their final value, `progress.set(1)` instead of `withTiming`, `glow.set(reduceMotion ? target : withTiming(target, …))`, no pulse or bump, and the dots don't bounce. The winning line is still shown (instantly), because it carries information, not decoration.\n\n**Why not `AccessibilityInfo` per component.** It is async and event-based; `useReducedMotion` reads the setting synchronously, and passing it down means every animation agrees.",
    },
    {
      id: "tic-tac-toe-62",
      type: "multi",
      level: 2,
      topics: ["Haptics", "React Hooks", "Platform Differences"],
      files: ["src/projects/tic-tac-toe/hooks/useGameHaptics.ts", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Read `useGameHaptics`. Which statements are true? Select all that apply.",
      choices: [
        "`previousRef` starts at the first render's `moveCount`, so mounting the screen fires nothing",
        "A change of exactly +1 counts as a move (light impact, success on a win, warning on a draw); any other change, such as an undo, a jump back or a new round, is a `selectionAsync` tick",
        "The ref is updated **before** the `enabled` check, so moves made while haptics are off never buzz later when they're switched back on",
        "`fire()` attaches `.catch(() => {})`, so a device without haptics never surfaces an unhandled promise rejection",
        "On web the hook calls `Haptics.impactAsync`, which falls back to `navigator.vibrate`",
        "The store's `play` action triggers the haptics, so they always match the move",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Expo: Haptics", url: "https://docs.expo.dev/versions/latest/sdk/haptics/" },
        { title: "React: useRef", url: "https://react.dev/reference/react/useRef" },
      ],
      explain:
        "The hook reacts to the move count, not to taps: `const previousRef = useRef(moveCount);` then, in the effect, return if unchanged, store the new count, return if `!enabled || Platform.OS === \"web\"`, and pick the feedback from `moveCount - previous` plus `won` / `isDraw`.\n\n**Web.** The hook returns early, and the screen passes `onToggleHaptics={Platform.OS === \"web\" ? undefined : setHapticsEnabled}`, so `ActionBar` hides the toggle (`{onToggleHaptics && (…)}`).\n\n**Muted while loading.** The screen calls `useGameHaptics(hapticsEnabled && hydrated, currentMove, view)`, so restoring a saved game only moves the ref. Haptics stay out of the store, which keeps `play` pure and testable without mocking `expo-haptics`. The ref is read and written only inside the effect, never during render, as the React Compiler requires.",
    },
    {
      id: "tic-tac-toe-64",
      type: "multi",
      level: 2,
      topics: ["Accessibility"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/HeaderIconButton.tsx", "src/projects/tic-tac-toe/components/ActionBar.tsx", "src/projects/tic-tac-toe/components/StatusBanner.tsx", "src/projects/tic-tac-toe/components/WinLine.tsx", "src/projects/tic-tac-toe/components/Scoreboard.tsx"],
      prompt:
        "Which accessibility statements about the controls are true? Select all that apply. Search each component for `accessibility` and `importantForAccessibility`.",
      choices: [
        "The header's icon-only buttons are `accessibilityRole=\"button\"` with a label naming the current value (`` `Mode: ${MODE_LABELS[mode]}` ``, `` `Difficulty: ${DIFFICULTY_LABELS[difficulty]}` ``) and an `accessibilityHint` saying a tap starts a new round",
        "The haptics toggle is `accessibilityRole=\"switch\"` with `accessibilityState={{ checked: hapticsEnabled }}`, so it is read as on or off",
        "`StatusBanner` sets `accessibilityLiveRegion=\"polite\"`, so Android announces a new status without moving focus",
        "`WinLine` is hidden from screen readers with `accessibilityElementsHidden` and `importantForAccessibility=\"no-hide-descendants\"`; the banner already announces the winner",
        "Each score tile is a `Pressable` with `accessibilityRole=\"button\"`",
        "Squares rely on the visible mark alone; they have no `accessibilityLabel`",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "React Native: Accessibility", url: "https://reactnative.dev/docs/accessibility" },
      ],
      explain:
        "True: the header buttons have no visible text, so the label carries the current value and the hint says what a tap does (including the new round); the haptics button is a switch with a `checked` state rather than a button whose icon you'd have to interpret; the banner is a polite live region; and the decorative win line is hidden on both platforms (`accessibilityElementsHidden` for iOS, `importantForAccessibility` for Android).\n\nFalse: a score tile is a non-interactive `Animated.View` with `accessible` and `accessibilityLabel={`${label}: ${count}`}` (\"You: 2\"), so it is read as one element and not as a button. And every `Square` has `accessibilityLabel={label}` from `squareLabel(index, value)`, such as \"Row 2, column 3, X\".\n\n**Live regions on iOS.** `accessibilityLiveRegion` is Android-only; VoiceOver users hear the new status when they move to the banner.",
    },
    {
      id: "tic-tac-toe-34",
      type: "explain",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/stores/gameStore.ts"],
      prompt:
        "The store keeps `history` and `currentMove`, but not the winner, the winning line, whether it's a draw, or whose turn it is. Those come from `deriveGame(history, currentMove)` every time. Explain why, and what bug a stored `winner` would invite. Name one store action that would have to update it.",
      model:
        "Everything in the `GameView` is fully determined by the board at `currentMove`: `next` is `nextPlayer(currentMove)`, `win` is `findWinningLine(squares)`, `isDraw` is no line and no empty squares, and `isOver` is either of those. Storing any of them creates a second source of truth that every action must keep in step: `play` would set the winner, but `undo` and `jumpTo` would have to clear or recompute it, and `newRound`, `setMode` and `setDifficulty` would have to reset it. One action that forgets leaves the banner or the board lock showing a stale result. Deriving it during render (and inside the store's actions, which also call `deriveGame`) removes that class of bug and keeps the persisted state small. It is cheap: nine squares and eight lines. `scores` is the exception that proves the rule: it can't be derived from the current round, so it is stored.",
      rubric: [
        "Says the view (`next`, `win`, `isDraw`, `isOver`) can be fully derived from `history[currentMove]`",
        "Names the risk of redundant state: two values that can fall out of sync",
        "Gives a concrete action that would need updating, such as `undo`, `jumpTo` or `newRound`",
        "Notes that the store's own actions call `deriveGame` too, or that `scores` is stored because it can't be derived",
      ],
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: You might not need an effect", url: "https://react.dev/learn/you-might-not-need-an-effect" },
      ],
      explain:
        "Everything in the `GameView` is fully determined by the board at `currentMove`. Storing any of it creates a second source of truth: `play` would set a winner, but `undo`, `jumpTo`, `newRound`, `setMode` and `setDifficulty` would each have to clear or recompute it, and one that forgets shows a stale result or leaves the board locked.\n\n`deriveGame` is called in render and inside the store's actions (`play`, `undo`, `jumpTo` all derive `isOver` before acting), so screen and rules always agree.\n\n**The exception.** `scores` is stored because it accumulates across rounds and can't be recomputed from the current `history`.",
    },
    {
      id: "tic-tac-toe-35",
      type: "explain",
      level: 2,
      topics: ["Architecture", "React Fundamentals"],
      files: ["src/projects/tic-tac-toe/components/Board.tsx", "src/projects/tic-tac-toe/components/HeaderIconButton.tsx", "src/projects/tic-tac-toe/components/ActionBar.tsx", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "No file in `src/projects/tic-tac-toe/components/` imports `useGameStore`; they take plain data, a `palette` and callbacks. Explain why this design is better, using at least two concrete components as examples, and how it matches the repo's rule that components stay dumb. Grep the components folder for `stores/` before writing.",
      model:
        "The components are presentational: props in, callbacks out. Only `TicTacToeScreen` knows about the store; it selects fields and actions, derives the view and passes plain values down. `Board` takes `squares`, `win`, `disabled`, `onPress` and `size`, so it can draw any board, current or past, which is what time travel needs, and the screen decides when it is locked (hydrating, round over, CPU's turn). `HeaderIconButton` takes an icon as `children`, an `onPress` and a `popKey`, and is used twice, for the mode and the difficulty, which only works because it doesn't know which value it cycles; the screen decides that with `nextMode` / `nextDifficulty`. `ActionBar` takes an optional `onToggleHaptics`, so the screen can hide the toggle on web just by passing `undefined`. The components import only types (`Squares`, `TicTacToePalette`) and pure helpers such as `squareLabel`, so they can be previewed or tested with fixed data and no store, and their colours and motion come in as `palette` and `reduceMotion`. This is a repo-wide rule: components take plain data and callbacks, never a store or view model, and screens own the state.",
      rubric: [
        "Says the components receive props and callbacks and never read the store; the screen owns the store",
        "Uses `Board` (any board, time travel, `disabled` decided by the screen) or a similar concrete example",
        "Uses `HeaderIconButton` reused for mode and difficulty (or `DifficultyBars` taking plain colours), or the optional `onToggleHaptics`, as a reuse example",
        "Mentions previewing or testing with fixed data, or `palette` / `reduceMotion` arriving as props",
        "Cites the repo rule that components are dumb and screens own state",
      ],
      links: [
        { title: "React: Sharing state between components", url: "https://react.dev/learn/sharing-state-between-components" },
        { title: "React: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
      ],
      explain:
        "Only the screen touches the store. `Board` draws whatever `squares` it gets and calls `onPress(index)`; the screen decides `disabled` (`!hydrated || view.isOver || cpuTurn`). `HeaderIconButton` is reused for the mode and the difficulty because it only knows `children`, `onPress`, `popKey` and its labels; `DifficultyBars` takes a `level` and two colours, not the palette. `ActionBar` hides the haptics toggle when `onToggleHaptics` is omitted.\n\n**What this buys.** Reuse, previews with fixed data, and no hidden dependency on a provider tree. Even the theme and motion setting arrive as props (`palette`, `reduceMotion`).\n\n**Repo rule.** Components take plain data and callbacks, never a store or view model; screens own state.",
    },
    {
      id: "tic-tac-toe-36",
      type: "explain",
      level: 2,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts", "src/app/_layout.tsx", "src/app/index.tsx", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Trace how tapping the \"Tic-Tac-Toe\" card in the launcher reaches `TicTacToeScreen`. Explain why the root layout declares `projects/tic-tac-toe/index` for this project but `projects/<slug>` for the others. Follow `route` from the registry to the file on disk.",
      model:
        "The launcher (`src/app/index.tsx`) maps over `PROJECTS` and calls `router.push(item.route)`, which is `/projects/tic-tac-toe`. Expo Router resolves that URL from the file tree to `src/app/projects/tic-tac-toe/index.tsx`, whose default export is `TicTacToeScreen`. The root `Stack` names screens by route node. Other projects have a `_layout.tsx` in their folder, so `projects/<slug>` is a nested navigator node, and the root hides its header there. Tic-tac-toe has no layout, so there's no `projects/tic-tac-toe` node; the leaf route is `projects/tic-tac-toe/index`, and the `Stack.Screen` must use that name or it matches nothing. The `singleScreen` flag in the registry lets `_layout.tsx` choose between the two names and pass the registry `title` as the header, so neither the launcher nor the root hardcodes the project.",
      rubric: [
        "Launcher maps `PROJECTS` and pushes `route` (`/projects/tic-tac-toe`)",
        "The URL resolves through the file tree to `projects/tic-tac-toe/index.tsx` and its default export",
        "No `_layout.tsx` means no `projects/tic-tac-toe` navigator node, so the screen name is `.../index`",
        "`singleScreen` drives the choice in `_layout.tsx`, and the header (with the registry title) stays visible",
      ],
      links: [
        { title: "Expo Router: Core concepts", url: "https://docs.expo.dev/router/basics/core-concepts/" },
        { title: "Expo Router: Stack", url: "https://docs.expo.dev/router/advanced/stack/" },
      ],
      explain:
        "The launcher calls `router.push(item.route)`; Expo Router resolves `/projects/tic-tac-toe` from the file tree to `src/app/projects/tic-tac-toe/index.tsx` (`export default function TicTacToeScreen()`).\n\n**Why two names.** Projects with a `_layout.tsx` are a nested navigator node, `projects/<slug>`, whose header the root hides. Tic-tac-toe has no layout, so the node is the leaf `projects/tic-tac-toe/index`, and `singleScreen` makes the root use that name with `options={{ title }}`.\n\n**Failure mode.** A `Stack.Screen` whose name matches no route node does nothing except trigger a warning, because routes come from files, not from `Stack.Screen` declarations.",
    },
    {
      id: "tic-tac-toe-42",
      type: "mcq",
      level: 2,
      topics: ["Architecture", "Testing"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/__tests__/game.test.ts", "AGENTS.md"],
      prompt:
        "The route file only wires the store and hooks to components. The rules, AI, store, hooks, components and tests all live under `src/projects/tic-tac-toe/`. What's the main reason none of them sit next to the route? Read the Routing rules in `AGENTS.md`.",
      choices: [
        "Every file under `src/app/` is a reachable route, so non-route components, hooks and tests must live in a slice; there, pure modules like `utils/game.ts` and `utils/ai.ts` can be imported and unit-tested with nothing rendered",
        "Expo Router refuses to bundle a route file that imports more than one module",
        "The React Compiler only optimises files outside `src/app/`",
        "Zustand stores can't be created in a file that also exports a component",
      ],
      answer: 0,
      links: [
        { title: "Expo: Unit testing with Jest", url: "https://docs.expo.dev/develop/unit-testing/" },
        { title: "Expo Router: Core concepts", url: "https://docs.expo.dev/router/basics/core-concepts/" },
      ],
      explain:
        "`AGENTS.md`: \"Any file under `src/app/` is a reachable route. Non-route components must live in a slice\", and unit tests live in `src/projects/<slug>/__tests__/`, never under `src/app/`. A `game.test.ts` beside the route would become a route Expo Router tries to bundle.\n\n**What the split buys.** `__tests__/game.test.ts`, `ai.test.ts` and `gameStore.test.ts` import pure modules and the store directly. The rules, the AI and the store are tested with no rendering; the screen is just wiring.\n\nRun them with `npx jest --no-watchman src/projects/tic-tac-toe`.",
    },

    {
      id: "tic-tac-toe-65",
      type: "mcq",
      level: 2,
      topics: ["Zustand", "Testing"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/__tests__/gameStore.test.ts"],
      prompt:
        "A phone still has a save from before scores were split by mode: AsyncStorage holds `{ state: { mode: \"cpu\", scores: { X: 4, O: 2, draw: 1 }, … }, version: 1 }`. The new build has `version: 2` and `migrate: migrateGame`. What does the store hold after hydration, and why?",
      code: [
        "export function migrateGame(persisted: unknown, version: number) {",
        "  const state = (persisted ?? {}) as Record<string, unknown>;",
        "  if (version < 2) {",
        "    const mode: Mode = state.mode === \"pvp\" ? \"pvp\" : \"cpu\";",
        "    const old = (state.scores as Scores | undefined) ?? noScores();",
        "    const scores: ScoresByMode = { pvp: noScores(), cpu: noScores() };",
        "    scores[mode] = old;",
        "    return { ...state, scores };",
        "  }",
        "  return state;",
        "}",
      ].join("\n"),
      choices: [
        "`scores.cpu` is `{ X: 4, O: 2, draw: 1 }` and `scores.pvp` is all zeros: `persist` sees the stored version 1 is older than 2, passes the saved state through `migrateGame(persisted, 1)`, and merges the result",
        "Both tallies are `{ X: 4, O: 2, draw: 1 }`, because the old tally is copied into every mode",
        "The old object is merged as is, so `scores` is `{ X: 4, O: 2, draw: 1 }` and `scores[mode]` is `undefined`",
        "The save is thrown away and the store starts from `initialState`, because the versions don't match",
      ],
      answer: 0,
      links: [
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
        { title: "Zustand: Persisting store data (migrations)", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" },
      ],
      explain:
        "`persist` stores `version` next to the state. On hydration, if the stored version differs from the option, it calls `migrate(persistedState, storedVersion)` and merges what that returns. `migrateGame` sees `version < 2`, reads the active `mode` (`\"cpu\"`), and puts the shared v1 tally there; the other mode starts at `noScores()`. The doc comment says why: a shared tally \"can't be split by mode, so it moves to the mode that was active.\"\n\n**Why it matters.** Without the bump and the migration, the old flat object would be merged in, `scores[mode]` would be `undefined`, and the screen would crash as soon as `Scoreboard` reads `scores.X`. When versions differ and **no** `migrate` is given, Zustand logs an error and ignores the save, so the player would lose it.\n\n**Testable.** `migrateGame` is an exported pure function, so `gameStore.test.ts` calls it directly: a v1 `{ mode: \"pvp\", scores: { X: 3, O: 1, draw: 2 } }` comes back with that tally under `pvp`, and a v2 save is returned unchanged (`toBe(v2)`).",
    },
    {
      id: "tic-tac-toe-66",
      type: "multi",
      level: 2,
      topics: ["Zustand", "Architecture"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/Scoreboard.tsx", "src/projects/tic-tac-toe/__tests__/gameStore.test.ts"],
      prompt:
        "Scores are kept per mode (`ScoresByMode = Record<Mode, Scores>`). Which statements are true? Select all that apply. Read `play`, `resetScores`, the screen's `<Scoreboard>` props and the \"scores per mode\" test.",
      code: [
        "const tally = scores[mode];",
        "let nextTally = tally;",
        "if (result.win) {",
        "  const { winner } = result.win;",
        "  nextTally = { ...tally, [winner]: tally[winner] + 1 };",
        "} else if (result.isDraw) {",
        "  nextTally = { ...tally, draw: tally.draw + 1 };",
        "}",
        "const nextScores = { ...scores, [mode]: nextTally };",
      ].join("\n"),
      choices: [
        "A result is counted only in the tally of the mode it was played in; the other mode's tally is carried over by `...scores`",
        "`resetScores` clears only the current mode: `{ ...state.scores, [state.mode]: noScores() }`",
        "The screen passes `scores={scores[mode]}`, so `Scoreboard` still takes one plain `{ X, O, draw }` object and knows nothing about modes' storage",
        "The reset confirmation names the mode it clears (\"vs CPU\" or \"two-player\"), because the other tally survives",
        "Switching mode with `setMode` resets both tallies, since a new round starts",
        "`noScores` is a shared constant object, so both modes point at the same tally",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Zustand: Updating state", url: "https://zustand.docs.pmnd.rs/learn/guides/updating-state.html" },
        { title: "TypeScript: Record<Keys, Type>", url: "https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type" },
      ],
      explain:
        "The type comment says why: \"a two-player win isn't a win against the CPU.\" `play` reads `scores[mode]`, builds a new tally, and writes it back with `{ ...scores, [mode]: nextTally }`, copying both levels because Zustand's merge is shallow. `resetScores` does the same with `noScores()` for `state.mode` only. The \"scores per mode\" test wins a two-player round, switches to `cpu`, resets there, and expects `scores.pvp` still at `{ X: 1, O: 0, draw: 0 }`.\n\n**Dumb component.** The screen selects the whole `scores` and passes `scores[mode]`, so `Scoreboard`'s `scores` prop stays `{ X: number; O: number; draw: number }`. Its alert reads `` `This clears the ${which} wins and draws.` `` with `which` from `mode`.\n\nFalse: `setMode` writes `{ mode, ...freshRound() }`, which doesn't touch `scores`. And `noScores` is a **function** (`(): Scores => ({ X: 0, O: 0, draw: 0 })`), so each call returns a new object; a shared constant would be safe here only because nothing mutates it, but the factory removes the question.",
    },

    // ---------------------------------------------------------------- L3
    {
      id: "tic-tac-toe-23",
      type: "multi",
      level: 3,
      topics: ["Zustand", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`TicTacToeScreen` subscribes with one selector per field or action, such as `useGameStore((state) => state.history)`. Which statements about re-renders are true? Select all that apply.",
      choices: [
        "Each selector hook re-renders the screen only when its selected value changes by `Object.is`",
        "Selecting actions such as `play` or `undo` never causes a re-render, because `combine` creates them once and their references never change",
        "Calling `jumpTo(currentMove)` still calls `set`, but every selected value stays `Object.is`-equal, so the screen doesn't re-render",
        "Zustand deep-compares arrays, so an equal-looking copy of `history` would be skipped",
        "`useGameStore()` with no selector behaves the same as these selectors",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
        { title: "Zustand: useShallow", url: "https://zustand.docs.pmnd.rs/reference/hooks/use-shallow.html" },
        { title: "MDN: Object.is", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is" },
      ],
      explain:
        "True: Zustand hands `() => selector(getState())` to `useSyncExternalStore`, which compares snapshots with `Object.is`; actions are created once in the `combine` creator; and `jumpTo` with the current move merges an identical `currentMove`, so no selected value changes (the chip for the move on screen is disabled anyway).\n\nFalse: there is no deep compare, so an equal-looking copy is a new reference and does re-render. And `useGameStore()` with no selector returns the whole state object, which is replaced on every `set`, so it re-renders on any change.\n\n**Design decision.** One selector per field is the simplest correct subscription. `useShallow` is the tool if you want one destructured object (question tic-tac-toe-38).",
    },
    {
      id: "tic-tac-toe-32",
      type: "multi",
      level: 3,
      topics: ["React Compiler", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/Board.tsx", "app.config.ts"],
      prompt:
        "The slice has no `useMemo`, `useCallback` or `React.memo`. Which statements are true for this repo? Select all that apply. Open `app.config.ts`, search for `reactCompiler`, then read the compiler intro page.",
      choices: [
        "The React Compiler is switched on with `experiments.reactCompiler: true` in `app.config.ts`",
        "The compiler can cache computed values and JSX, including `Board`'s inline `() => onPress(index)` arrows and the screen's `isSelectable` arrow, based on their inputs",
        "The compiler assumes render is pure and that props and state are never mutated, so writing into `view.squares` in place would break its assumptions",
        "`Square` must still be wrapped in `React.memo` or the compiler skips it",
        "With the compiler on, Zustand selectors are no longer needed",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "React Compiler: Introduction", url: "https://react.dev/learn/react-compiler/introduction" },
        { title: "Expo: React Compiler", url: "https://docs.expo.dev/guides/react-compiler/" },
        { title: "React: Rules of React", url: "https://react.dev/reference/rules" },
      ],
      explain:
        "True: `experiments: { typedRoutes: true, reactCompiler: true }` turns it on; it memoises values and JSX automatically from their inputs; and it relies on the Rules of React (pure render, no mutation of props, state or hook results). False: no `React.memo` is required, and the compiler doesn't replace selectors, which still decide when `useSyncExternalStore` re-renders the screen.\n\n**What it changes in the code.** The rules show up as habits: `view.squares.slice()` before writing, shared values written with `.set()` instead of `.value =`, refs touched only inside effects, and `thinking` derived during render rather than set from an effect (question tic-tac-toe-51).",
    },
    {
      id: "tic-tac-toe-37",
      type: "mcq",
      level: 3,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/components/MoveTimeline.tsx"],
      prompt:
        "Predict: someone \"simplifies\" `play` to write into the board in place. Two-player mode, two moves played. X plays a third move. What goes wrong?",
      code: [
        "const nextSquares: Squares = view.squares; // no slice()",
        "nextSquares[index] = view.next;",
        "const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];",
      ].join("\n"),
      choices: [
        "The board still updates (`nextHistory` is a new array), but `history[2]` and `history[3]` are now the same array: undo or the move-2 chip still shows the new X, and `moveSquare` finds no difference, so chip 3's label falls back to just `3`",
        "Nothing re-renders, because Zustand sees the same `squares` reference and skips the update",
        "TypeScript rejects the assignment because store state is read-only",
        "It behaves exactly as before, because `.slice()` was only an optimisation",
      ],
      answer: 0,
      links: [
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
        { title: "React: Rules of React", url: "https://react.dev/reference/rules" },
      ],
      explain:
        "`view.squares` is `history[currentMove]`, so writing into it changes the past snapshot itself. `nextHistory` is still a **new** outer array, so the `history` selector changes and the screen re-renders, which hides the bug. But two entries now share one array.\n\n**Where it shows.** Undo (or jumping to move 2) shows the X that was supposedly played later. `moveSquare(history, 3)` compares `history[2]` with `history[3]`, finds no changed square and returns -1, and `moveChipLabel` then returns just `` `${move}` `` instead of `3 · X B2`.\n\nTypeScript doesn't stop you, because the arrays aren't typed `readonly`. Immutability here is a habit, not a compiler guarantee, which is why `play` does `slice()` first.",
    },
    {
      id: "tic-tac-toe-38",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "React Hooks"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/projects/camera-social/camera.tsx"],
      prompt:
        "In Zustand v5, what happens if the screen subscribes like this, with no `useShallow`? Compare it with the one-field selectors in `TicTacToeScreen` and with `useShallow` in `camera-social/camera.tsx`.",
      code: [
        "const { history, currentMove } = useGameStore((state) => ({",
        "  history: state.history,",
        "  currentMove: state.currentMove,",
        "}));",
      ].join("\n"),
      choices: [
        "The selector returns a new object on every call, so `useSyncExternalStore` sees a changed snapshot each time and React fails with an infinite loop (\"Maximum update depth exceeded\")",
        "It works, but the screen re-renders on every store change, the same as with no selector",
        "Zustand shallow-compares object results by default, so it behaves like two separate selectors",
        "TypeScript rejects the selector because it returns a new type",
      ],
      answer: 0,
      links: [
        { title: "Zustand: Prevent rerenders with useShallow", url: "https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow.html" },
        { title: "Zustand: useShallow", url: "https://zustand.docs.pmnd.rs/reference/hooks/use-shallow.html" },
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
      ],
      explain:
        "Zustand v5 passes `() => selector(getState())` to React's `useSyncExternalStore` as the snapshot getter, and React requires it to return a cached value when nothing changed. A new object literal is never `Object.is`-equal to the last one, so React keeps re-rendering until it reports \"Maximum update depth exceeded\". v4 only re-rendered too often; v5 fails loudly.\n\n**Fixes.** Separate selectors, as the screen does, or wrap the selector in `useShallow` (from `zustand/react/shallow`), as `camera-social/camera.tsx` does. `useShallow` returns the previous object while each top-level field is still `Object.is`-equal.",
    },
    {
      id: "tic-tac-toe-39",
      type: "mcq",
      level: 3,
      topics: ["TypeScript"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "`play` builds `[...history.slice(0, currentMove + 1), nextSquares]`. Someone rewrites that line in two ways. Which one does TypeScript catch at compile time? Read the MDN `concat` page.",
      code: [
        "// A",
        "const nextHistory = history.slice(0, currentMove + 1).concat(nextSquares);",
        "// B",
        "const nextHistory = [...history.slice(0, currentMove + 1), ...nextSquares];",
      ].join("\n"),
      choices: [
        "Only B: spreading the board gives `(SquareValue | Squares)[]`, which `deriveGame(nextHistory, …)` and the `history` field reject. A compiles, because `concat` also accepts single elements, yet at runtime it appends nine values instead of one board",
        "Only A: `concat` is strictly typed to take arrays of the element type",
        "Both, because `combine` checks every `set` against `Squares[]`",
        "Neither, because `history` is inferred as `any[]`",
      ],
      answer: 0,
      links: [
        { title: "MDN: Array.prototype.concat", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat" },
        { title: "TypeScript: Everyday types", url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" },
      ],
      explain:
        "`concat`'s signature is `concat(...items: (T | ConcatArray<T>)[])` with `T` = `Squares`. `nextSquares` is a `Squares`, so TypeScript reads it as **one element**, and A compiles. At runtime `concat` flattens array arguments, so it appends nine separate values, and `deriveGame` then reads a single `\"X\"` or `null` as a board.\n\nB spreads the board, producing `(SquareValue | Squares)[]`, which isn't assignable to the `Squares[]` that `deriveGame` takes and that `combine` inferred for `history`.\n\n**Design decision.** Prefer the spread-and-append form, where the shape of what you add is visible. This is one of the few places where the types don't save you.",
    },
    {
      id: "tic-tac-toe-40",
      type: "explain",
      level: 3,
      topics: ["Zustand", "Architecture"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/projects/tic-tac-toe/__tests__/gameStore.test.ts"],
      prompt:
        "`play` adds the win or draw to `scores` in the **same** `set` as the winning move. A teammate suggests a `useEffect` in the screen instead: \"when `view.win` becomes non-null, call `addWin(view.win.winner)`\". Explain why the store's approach counts each result exactly once, and how the effect version would double-count. Read the comment above the scoring code and the \"scores\" tests.",
      model:
        "In the store, the score is computed from `result`, the derived view of the new board, and written with the board in one `set`, so subscribers and `persist` always see a board and a score that agree. It can only happen once because a finished round is locked: `play` returns early when `view.isOver`, `undo` and `jumpTo` are no-ops once the round has a result, so the winning move can't be replayed, rewound or played again. The tests \"counts a win exactly once\" and \"counts a draw exactly once\" try exactly that (more plays, undo, jumpTo) and expect the score to stay at 1. An effect watching `view.win` would fire whenever the screen sees a won board, not when a game is won: after a cold launch the restored won board hydrates and the effect counts it again; leaving and reopening the screen remounts it and counts it again; in development Strict Mode runs effects twice. Fixing that needs extra 'already counted' state, which is a second source of truth. Keeping it in the action also makes it testable through `getState()` with nothing rendered.",
      rubric: [
        "Says the score is computed from the new board's result and written in the same `set`, so board and score stay consistent (and persisted together)",
        "Explains the lock: `play`, `undo` and `jumpTo` are no-ops after a result, so the scoring path can't run twice",
        "Gives a concrete double-count for the effect version: rehydration, remounting the screen, or Strict Mode",
        "Mentions the tests that pin it, or that the rule is testable through `getState()` without rendering",
      ],
      links: [
        { title: "React: You might not need an effect", url: "https://react.dev/learn/you-might-not-need-an-effect" },
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
      ],
      explain:
        "The comment says it: \"Count the result in the same `set` as the winning move, exactly once: a finished round can't be played, undone or rewound.\" The score comes from the event (a move that ends the round), not from what's on screen.\n\nAn effect keyed on `view.win` reacts to **seeing** a won board, which happens again after rehydration, on remount, and twice under Strict Mode in development. React's guidance applies: logic caused by a user action belongs in the action, not in an effect.\n\n`gameStore.test.ts` checks that more plays, an undo and a jump after the win leave `scores.pvp` at `{ X: 1, O: 0, draw: 0 }`.",
    },
    {
      id: "tic-tac-toe-41",
      type: "explain",
      level: 3,
      topics: ["Accessibility", "React Fundamentals"],
      files: ["src/projects/tic-tac-toe/components/Board.tsx", "src/projects/tic-tac-toe/components/Square.tsx", "src/projects/tic-tac-toe/components/MoveTimeline.tsx", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "Each `Square` gets `accessibilityRole=\"button\"`, `accessibilityLabel={label}` and `accessibilityState={{ disabled }}`; each timeline chip gets a role, a label such as \"Go to move 3 · X B2\" and `accessibilityState={{ selected, disabled: locked }}`. Explain what a VoiceOver or TalkBack user would experience without these props, what each one adds, and why `Board` (not `Square`) computes the label and `disabled`.",
      model:
        "Without them, a `Pressable` is still focusable but isn't announced as a button. A square draws an SVG mark, not text, so it would be read as an unlabelled element, empty or not, with no position. The user couldn't tell which cell they're on, what's in it, or that a taken cell, the CPU's turn or a finished round won't respond. The role makes each target announce as a button. The label from `squareLabel(index, value)` (\"Row 2, column 3, empty\") gives position and contents. `disabled` says the tap does nothing. On the timeline, the label names the move, mark and cell, `selected` marks the move on screen, and `disabled` marks chips you can't travel to (CPU turns, finished round). `Board` computes the label and `disabled` (`disabled || value !== null`) because it knows the index, the value and whether the whole board is locked. `Square` stays a dumb component that receives plain `label` and `disabled`, so it needs no game knowledge, and `squareLabel` is a pure function with its own unit test.",
      rubric: [
        "Says that without the props squares aren't announced as buttons, and an SVG mark gives no readable label or position",
        "Explains role (button), label (position and contents) and state (`disabled`, `selected`)",
        "Explains the timeline chip label and its `selected` / `disabled` states",
        "Says `Board` computes the label and `disabled` so `Square` stays dumb, and the pure `squareLabel` is tested",
      ],
      links: [
        { title: "React Native: Accessibility", url: "https://reactnative.dev/docs/accessibility" },
      ],
      explain:
        "A square holds an SVG, so without a label a screen reader has nothing to say. The role announces a button, the label (\"Row 2, column 3, empty\") gives position and contents, and `disabled` says the tap does nothing (taken square, the CPU's turn, hydrating, or round over). Chips say where they go (\"Go to move 3 · X B2\", \"Go to game start\"), which is selected, and which are locked.\n\n**Design decision.** `Board` computes `label={squareLabel(index, value)}` and `disabled={disabled || value !== null}`; `Square` just renders them. `game.test.ts` pins `squareLabel(5, \"O\")` to `\"Row 2, column 3, O\"`.",
    },
    {
      id: "tic-tac-toe-46",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "React Hooks"],
      files: ["src/projects/tic-tac-toe/stores/gameStore.ts", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The screen keeps the board disabled until `useGameHydrated()` is true. Why is that needed, and why is the hook written with `useSyncExternalStore`?",
      code: [
        "export function useGameHydrated(): boolean {",
        "  return useSyncExternalStore(",
        "    useGameStore.persist.onFinishHydration,",
        "    useGameStore.persist.hasHydrated,",
        "  );",
        "}",
      ].join("\n"),
      choices: [
        "AsyncStorage is asynchronous, so the store starts with the defaults and the saved game is merged in later; a move made before then would be overwritten. `onFinishHydration` is the subscribe function (it returns an unsubscribe) and `hasHydrated` the snapshot, so the screen re-renders the moment loading finishes, with no effect or extra state",
        "`persist` blocks the JS thread until it has loaded, so the board is only disabled for one frame; `useSyncExternalStore` is just shorter than `useState`",
        "`hasHydrated()` throws until hydration finishes, and `useSyncExternalStore` catches the error",
        "`persist` keeps its state on the native side, and `useSyncExternalStore` is the only way to read native memory",
      ],
      answer: 0,
      links: [
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
      ],
      explain:
        "On launch the store is created with `initialState` (an empty board, cpu mode), and `persist` reads AsyncStorage in the background. When the read finishes it merges the saved state over the defaults. A tap in that gap would play on the default board and then vanish, so `boardDisabled` starts with `!hydrated`.\n\n**Why `useSyncExternalStore`.** \"Has the store hydrated?\" is state that lives outside React. `persist` already exposes a subscription (`onFinishHydration(listener)` returns an unsubscribe function) and a synchronous read (`hasHydrated()`), which is exactly the `subscribe` / `getSnapshot` pair React wants. No `useEffect` plus `setState` (which the React Compiler rules discourage), and no flash of a wrong value on the first render.\n\n**Also used for haptics.** `useGameHaptics(hapticsEnabled && hydrated, …)` stays muted while the saved game loads.",
    },
    {
      id: "tic-tac-toe-48",
      type: "mcq",
      level: 3,
      topics: ["Minimax"],
      files: ["src/projects/tic-tac-toe/utils/ai.ts", "src/projects/tic-tac-toe/__tests__/ai.test.ts"],
      prompt:
        "The minimax `score` returns `10 - depth` for a CPU win and `depth - 10` for a loss. Why subtract the depth, instead of a flat `10` and `-10`?",
      code: [
        "const win = findWinningLine(squares);",
        "if (win) return win.winner === cpu ? 10 - depth : depth - 10;",
        "if (countRemainingTurns(squares) === 0) return 0;",
      ].join("\n"),
      choices: [
        "So a faster win scores higher than a slower one, and a slower loss higher than a faster one; with flat scores every winning move would tie, and the CPU could pass up an immediate win for a longer one",
        "To stop the recursion from running forever",
        "To prune branches so the search is faster",
        "So that a draw scores higher than any win",
      ],
      answer: 0,
      links: [
        { title: "Jest: Expect", url: "https://jestjs.io/docs/expect" },
      ],
      explain:
        "Minimax assumes both sides play perfectly: the CPU maximises the score, the opponent minimises it (`best = turn === cpu ? Math.max(best, value) : Math.min(best, value)`). Every winning line would be worth 10 with flat scores, so a move that wins now and a move that wins in three turns would tie, and `random` could pick the slow one. Subtracting the depth breaks the tie in favour of the quickest win and, when losing, the longest resistance.\n\n**Tested.** \"takes an immediate win at medium and hard\" calls hard with `() => 0` and `() => 0.99` (the first and last of the tied best moves) and expects square 5 both times. Depth scoring is what keeps that true in positions where a slower forced win also exists.\n\n**Termination** comes from the board filling up (at most nine plies), not from the depth. `bestMoves` copies `squares.slice()` first, so the search writes and undoes moves on its own board, never on the store's.",
    },
    {
      id: "tic-tac-toe-49",
      type: "explain",
      level: 3,
      topics: ["Minimax", "Testing"],
      files: ["src/projects/tic-tac-toe/__tests__/ai.test.ts", "src/projects/tic-tac-toe/utils/ai.ts"],
      prompt:
        "The test \"hard never loses\" calls `opponentWins(emptyBoard(), \"X\", cpu, random)` and expects 0, for the CPU as O and as X, with three `random` functions. Explain how `opponentWins` works, why this amounts to a proof rather than a sample, and why `random` is injected. Read `opponentWins` and `bestMoves` before writing.",
      model:
        "`opponentWins` walks the whole game tree from a position. At a finished board it returns 1 if the opponent won and 0 otherwise. On the CPU's turn it asks `pickMove(squares, cpu, \"hard\", random)` for one move, checks the square was empty, plays it on a copy and recurses. On the opponent's turn it tries every empty square and sums the results. So the return value is the number of finished games, over every possible line of opponent play, in which the opponent beats the CPU. Asserting 0 from the empty board, both with the opponent moving first (CPU as O) and with the CPU moving first (CPU as X), means no sequence of moves at all beats hard. That is an exhaustive check, which is feasible because tic-tac-toe has fewer than 9! move sequences. `random` is injected because `hard` picks among equally good moves (`bestMoves`) with it; with `Math.random` the test would be non-deterministic. Fixed functions (`() => 0`, `() => 0.5`, `() => 0.99`) make each run repeatable and cover the first, middle and last tied move. The limitation is that those are three tie-break policies, not every possible random sequence.",
      rubric: [
        "Explains the recursion: every opponent move is tried, and the CPU's move comes from `pickMove(..., \"hard\", random)`",
        "Says the count is opponent wins over all lines, so 0 means no line beats hard (exhaustive, both as X and as O)",
        "Explains that `random` breaks ties in `bestMoves` and is injected to make the test deterministic",
        "Notes that the three seeds cover first, middle and last tie choices (or the limitation that they're three policies)",
      ],
      links: [
        { title: "Jest: Globals (test.each)", url: "https://jestjs.io/docs/api" },
      ],
      explain:
        "`opponentWins` enumerates every opponent reply at every opponent turn and lets `hard` answer on its turns. It also asserts `squares[move]` is null, so a hard move is always legal. A total of 0 from the empty board, as O and as X, is a proof by exhaustion that hard is unbeatable for that tie-break policy.\n\n**Determinism.** `pickMove(…, random = Math.random)` takes `random` as a parameter, and `pickRandom` maps it to `Math.min(items.length - 1, Math.floor(random() * items.length))`. So `() => 0` always takes the first tied move and `() => 0.99` the last. The same injection makes the easy and medium tests repeatable.",
    },
    {
      id: "tic-tac-toe-51",
      type: "mcq",
      level: 3,
      topics: ["React Compiler", "React Hooks"],
      files: ["src/projects/tic-tac-toe/hooks/useCpuTurn.ts", "AGENTS.md"],
      prompt:
        "`useCpuTurn` returns `thinking`, computed as `const thinking = mode === \"cpu\" && !isOver && next === CPU;` during render. Why not `const [thinking, setThinking] = useState(false)` and call `setThinking(true)` at the top of the effect, before scheduling the timer?",
      choices: [
        "`thinking` is fully determined by the arguments, so deriving it is always in step; calling `setState` synchronously in an effect body costs an extra render with a stale value first, and the React Compiler rules in `AGENTS.md` forbid it",
        "Custom hooks can't call `useState`",
        "`setTimeout` callbacks can't call a state setter",
        "`thinking` has to come from the Zustand store to be persisted",
      ],
      answer: 0,
      links: [
        { title: "React: You might not need an effect", url: "https://react.dev/learn/you-might-not-need-an-effect" },
        { title: "React Compiler: Introduction", url: "https://react.dev/learn/react-compiler/introduction" },
      ],
      explain:
        "The hook's doc comment: \"Returns `thinking`, derived during render rather than kept in state.\" It is true exactly when the effect is about to schedule the CPU's move, and both read the same `mode`, `isOver` and `next`. Storing it would add a second source of truth, a render where the banner says the CPU is thinking but no dots show, and a reset that has to happen on undo, new round and unmount.\n\n`AGENTS.md`: \"Don't call `setState` synchronously in a `useEffect` body. Derive the value during render.\"\n\n**Where it's used.** `StatusBanner` shows bouncing dots when `thinking` is true, and the screen's `cpuTurn = mode === \"cpu\" && (thinking || view.next === CPU)` disables the board.",
    },
    {
      id: "tic-tac-toe-56",
      type: "mcq",
      level: 3,
      topics: ["Reanimated", "Layout & Styling"],
      files: ["src/projects/tic-tac-toe/components/WinLine.tsx", "src/projects/tic-tac-toe/components/Board.tsx"],
      prompt:
        "`WinLine` gets `line = [0, 1, 2]` (the top row) and `size = 300`. Work out what `winLineEndpoints` returns. Round to one decimal place.",
      code: [
        "const start = cellCenter(line[0], size);",
        "const end = cellCenter(line[2], size);",
        "const dx = end.x - start.x;",
        "const dy = end.y - start.y;",
        "const distance = Math.hypot(dx, dy);",
        "const overshoot = size / 3 / 2.6;",
      ].join("\n"),
      choices: [
        "`x1 ≈ 11.5`, `x2 ≈ 288.5`, `y1 = y2 = 50`, `length ≈ 276.9`",
        "`x1 = 50`, `x2 = 250`, `y1 = y2 = 50`, `length = 200`",
        "`x1 = 0`, `x2 = 300`, `y1 = y2 = 50`, `length = 300`",
        "`x1 ≈ 11.5`, `x2 ≈ 288.5`, `y1 = y2 = 50`, `length = 200`",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: useAnimatedProps", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps" },
        { title: "MDN: Math.hypot", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/hypot" },
      ],
      explain:
        "Each cell is 100 points, so the centres of cells 0 and 2 are (50, 50) and (250, 50). `distance` is 200, `overshoot` is 100 / 2.6 ≈ 38.5, and the unit vector is (1, 0). So `x1 = 50 − 38.5 ≈ 11.5`, `x2 = 250 + 38.5 ≈ 288.5`, and `length = distance + overshoot * 2 ≈ 276.9`. For a diagonal the same unit vector `(dx, dy) / distance` spreads the overshoot over both axes.\n\n**Why `length` must include the overshoot.** The path is drawn with `strokeDasharray={length}` and `strokeDashoffset: length * (1 - progress.get())`. If the dash were only `distance` long, the path's ends would show at `progress` 0 and the line would never quite reach its tips.\n\n`winLineEndpoints` is exported and pure, so the geometry can be checked without rendering. `size` is `Board`'s `grid`, not the card's `size`.",
    },
    {
      id: "tic-tac-toe-60",
      type: "mcq",
      level: 3,
      topics: ["Reanimated", "Performance"],
      files: ["AGENTS.md", "src/projects/tic-tac-toe/components/Square.tsx"],
      prompt:
        "Someone refactors `Square`'s animated style into a small worklet helper with a default parameter. Jest and a debug build look fine. What happens in a Release build? Read the worklet rule in `AGENTS.md`.",
      code: [
        "const MIN_SCALE = 0.9;",
        "",
        "function clampScale(scale: number, min = MIN_SCALE) {",
        "  \"worklet\";",
        "  return Math.max(min, scale);",
        "}",
        "",
        "const contentStyle = useAnimatedStyle(() => ({",
        "  transform: [{ scale: clampScale(press.get() * pulse.get()) }],",
        "}));",
      ].join("\n"),
      choices: [
        "The worklets plugin doesn't capture a module constant referenced only from a default parameter, so `MIN_SCALE` is undefined on the UI runtime and the Release build aborts; Jest misses it because it runs on the JS thread. Resolve the default inside the body instead",
        "Nothing: worklets capture every module-scope constant automatically",
        "TypeScript rejects default parameters in a function marked `\"worklet\"`",
        "The style silently falls back to scale 1, with no crash",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: Worklets", url: "https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets" },
      ],
      explain:
        "`AGENTS.md`: \"In a `\"worklet\"` function, don't reference module constants only from a default parameter (`max = MAX_ZOOM_FACTOR`): the worklets plugin doesn't capture them, the value is undefined on the UI runtime, and a Release build aborts. Resolve the default in the body. Jest won't catch it — it runs on the JS thread.\"\n\n**The fix.** `function clampScale(scale: number, min?: number) { \"worklet\"; const floor = min ?? MIN_SCALE; … }`, so the constant appears in the body and gets captured.\n\n**Why the real `Square` is safe.** Its `useAnimatedStyle` callbacks only read shared values (`press.get() * pulse.get()`, `fade.get()`), and they reference everything they need in the body.",
    },
    {
      id: "tic-tac-toe-67",
      type: "explain",
      level: 3,
      topics: ["Layout & Styling", "Platform Differences"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/components/Board.tsx"],
      prompt:
        "Earlier versions sized the board from the width alone (`Math.min(width - 32, 380)`), then from the window height minus a fixed guess for the controls, and at rest the move timeline ended up under the home indicator even with `paddingBottom: insets.bottom`. Explain how the screen now sizes the board: where `boardArea` comes from, why the board renders inside an absolutely positioned overlay, what `MIN_BOARD` is for, and what `insets.bottom + 16` fixes.",
      code: [
        "const [boardArea, setBoardArea] = useState(0);",
        "const boardSize = Math.max(MIN_BOARD, Math.min(columnWidth, boardArea));",
        "// …",
        "<View",
        "  style={styles.boardArea}",
        "  onLayout={(event) =>",
        "    setBoardArea(Math.floor(event.nativeEvent.layout.height))",
        "  }",
        ">",
        "  {/* Measured first, so the board never renders at a wrong size. It",
        "      sits in an overlay so it never props the area open: the area's",
        "      height comes from the free space alone and can shrink again. */}",
        "  {boardArea > 0 && (",
        "    <View style={styles.boardOverlay}>",
      ].join("\n"),
      model:
        "The board no longer guesses how much height is free. The content container and the column have `flexGrow: 1`, and `styles.boardArea` is a `View` with `flexGrow: 1` and `minHeight: MIN_BOARD` between the banner and the action bar, so it takes whatever height the controls above and below leave. Its `onLayout` stores that height in `boardArea` (an event handler, so the `setState` is fine), and the board's size is `Math.max(MIN_BOARD, Math.min(columnWidth, boardArea))`: as wide as the column allows, no taller than the free space, and never below 240. Only when the free space is smaller than `MIN_BOARD` (a short phone, landscape) does the page get taller than the screen and scroll. The board is rendered only after the first measurement (`boardArea > 0`), so it never flashes at a wrong size. It sits in `styles.boardOverlay`, which is `StyleSheet.absoluteFill` and centres it; an absolute child doesn't contribute to its parent's size, so the area's height comes from the free space alone. If the board were a normal child, a large board would prop the area open, the next `onLayout` would report that height back, and the area could never shrink again (for example after rotating back to portrait). `pointerEvents: \"box-none\"` lets touches reach the squares. Finally, `useSafeAreaInsets()` adds `insets.bottom + 16` as the scroll content's bottom padding, because the ScrollView draws under the home indicator. Padding on scroll content sits at the end of the scroll, so with a guessed size that made the content slightly taller than the screen, the padding was below the fold and the timeline sat behind the indicator at rest. A guess can't know the header, the insets or the device. With a measured area the content is exactly the screen's height, the padding takes its share first, and the board gets what is left.",
      rubric: [
        "Says `boardArea` is the measured height of a `flexGrow: 1` area, reported by `onLayout`, and the board size is the minimum of that and the column width",
        "Explains the overlay: an absolutely positioned child doesn't size its parent, so the measured area can shrink again instead of being propped open by the board",
        "Explains `MIN_BOARD` as the floor below which the page scrolls instead of shrinking the board further",
        "Explains `insets.bottom + 16` keeps the timeline clear of the home indicator, and why it only works at rest when the content fits the screen (padding on scroll content is at the end of the scroll), which a fixed height guess broke",
        "Mentions the board only renders once measured (`boardArea > 0`) or that `setBoardArea` in `onLayout` is an event, not an effect",
      ],
      links: [
        { title: "React Native: View (onLayout)", url: "https://reactnative.dev/docs/view#onlayout" },
        { title: "React Native: Layout props (position)", url: "https://reactnative.dev/docs/layout-props" },
        { title: "Expo: Safe areas", url: "https://docs.expo.dev/develop/user-interface/safe-areas/" },
      ],
      explain:
        "The comments in the screen give the design: \"The board takes whatever height is left between the controls above and below it, so a whole round fits on one screen. Only when that is too small (a short phone, landscape) does it keep MIN_BOARD and let the page scroll\", and \"It sits in an overlay so it never props the area open: the area's height comes from the free space alone and can shrink again.\"\n\n**Measure, then size.** `styles.boardArea` (`flexGrow: 1`, `minHeight: MIN_BOARD`) grows into the free height; `onLayout` reports it; `boardSize = Math.max(MIN_BOARD, Math.min(columnWidth, boardArea))`. `Board`'s card is `width: size, height: size` with `alignSelf: \"center\"`.\n\n**Why an overlay.** An absolutely positioned child (`StyleSheet.absoluteFill`) takes no part in its parent's flex sizing. As a normal child, the board's own height would become the area's minimum, and the measurement would feed back into itself.\n\n**Safe area.** `contentContainerStyle` adds `{ paddingBottom: insets.bottom + 16 }` with the comment \"Keep the timeline clear of the home indicator.\"",
    },
    {
      id: "tic-tac-toe-68",
      type: "multi",
      level: 2,
      topics: ["Architecture", "Expo Router", "TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/__tests__/game.test.ts"],
      prompt:
        "Mode and difficulty are now icon buttons in the header's top-right corner, and each tap moves to the next value. Which statements are true? Select all that apply. Read the inline `<Stack.Screen options>` in the screen and the helpers it calls.",
      code: [
        "const MODES: readonly Mode[] = [\"pvp\", \"cpu\"];",
        "const DIFFICULTIES: readonly Difficulty[] = [\"easy\", \"medium\", \"hard\"];",
        "",
        "/** The header's mode button toggles: two players ↔ vs computer. */",
        "export function nextMode(mode: Mode): Mode {",
        "  return MODES[(MODES.indexOf(mode) + 1) % MODES.length];",
        "}",
        "",
        "/** The header's difficulty button cycles easy → medium → hard → easy. */",
        "export function nextDifficulty(difficulty: Difficulty): Difficulty {",
        "  return DIFFICULTIES[",
        "    (DIFFICULTIES.indexOf(difficulty) + 1) % DIFFICULTIES.length",
        "  ];",
        "}",
      ].join("\n"),
      choices: [
        "The buttons are rendered by a `headerRight` function in the screen's inline `<Stack.Screen options>`, because the header belongs to the root Stack and Expo Router has no route-level `options` export",
        "`% MODES.length` wraps the last value back to the first, so `nextDifficulty(\"hard\")` is `\"easy\"`, and `game.test.ts` pins the whole cycle",
        "The cycling rule is a pure function in `utils/game.ts`, so it is tested without rendering and `HeaderIconButton` doesn't need to know what it cycles",
        "The difficulty button is rendered only when `mode === \"cpu\"`, and a tap calls `setDifficulty(nextDifficulty(difficulty))`, which also starts a fresh round",
        "`headerRight` is evaluated once when the route mounts, so the icons keep showing the first mode until the screen remounts",
        "Moving the controls to the header was needed because `ScrollView` can't contain a pressable row",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Expo Router: Stack (configuring the header)", url: "https://docs.expo.dev/router/advanced/stack/" },
        { title: "MDN: Remainder (%)", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder" },
      ],
      explain:
        "The inline `Stack.Screen` is part of the screen's render, so its `options` (and the `headerRight` closure over `mode` and `difficulty`) update every time the screen renders: the icons always show the current values. The screen comment gives the reason for the move: \"Mode and difficulty live up here as one-tap cycling icons, which leaves the whole page below for the board.\"\n\n**Rules stay pure.** `nextMode` and `nextDifficulty` are index + 1, wrapped with `%`; `difficultyLevel` maps the difficulty to 1–3 bars. The test \"nextMode and nextDifficulty\" checks the toggle, the full easy → medium → hard → easy cycle and the bar levels. `MODE_LABELS` / `DIFFICULTY_LABELS` are `Record<Mode, string>` / `Record<Difficulty, string>`, so a new value without a label is a compile error.\n\nFalse: `headerRight` is not frozen at mount, and a `ScrollView` can hold any pressable. The `setMode` / `setDifficulty` actions still start a fresh round, which the buttons' `accessibilityHint` says.",
    },
    {
      id: "tic-tac-toe-69",
      type: "mcq",
      level: 3,
      topics: ["Reanimated", "React Hooks"],
      files: ["src/projects/tic-tac-toe/components/HeaderIconButton.tsx", "src/projects/tic-tac-toe/components/Scoreboard.tsx"],
      prompt:
        "`HeaderIconButton` pops its icon whenever `popKey` changes. Someone deletes `previousKeyRef` and the first two lines of the effect, so it reads `if (reduceMotion) return; scale.set(withSequence(…));`. What changes for the user?",
      code: [
        "const scale = useSharedValue(1);",
        "const press = useSharedValue(1);",
        "const previousKeyRef = useRef(popKey);",
        "",
        "useEffect(() => {",
        "  if (previousKeyRef.current === popKey) return;",
        "  previousKeyRef.current = popKey;",
        "  if (reduceMotion) return;",
        "  scale.set(",
        "    withSequence(",
        "      withTiming(0.6, { duration: 90 }),",
        "      withSpring(1, { damping: 9, stiffness: 260 }),",
        "    ),",
        "  );",
        "}, [popKey, reduceMotion, scale]);",
      ].join("\n"),
      choices: [
        "The icons pop every time the screen opens (the effect runs on mount) and again whenever Reduce Motion is switched off (it is a dependency), not only when the value changes; the ref is what limits the pop to real changes of `popKey`",
        "Nothing: an effect never runs on mount, only when a dependency changes",
        "The pop stops working altogether, because the effect then has no way to see `popKey`",
        "The React Compiler rejects the effect, because it calls `scale.set` without a ref",
      ],
      answer: 0,
      links: [
        { title: "React: useRef", url: "https://react.dev/reference/react/useRef" },
        { title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" },
        { title: "Reanimated: withSequence", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence" },
      ],
      explain:
        "An effect runs after the first render as well as after a dependency changes. `previousKeyRef` starts at the first `popKey`, so on mount the comparison is equal and the effect returns; only a different `popKey` gets past it. It is updated **before** the `reduceMotion` check, so a change made while Reduce Motion is on is recorded, and switching it off later re-runs the effect without replaying a pop.\n\n**Why a ref, not state.** The previous key is bookkeeping read and written inside the effect; it is never rendered, and storing it with `setState` in the effect body is the pattern `AGENTS.md` says to avoid.\n\n**Same pattern elsewhere.** `Scoreboard`'s `Tile` bumps its count with `previousRef` and the same three lines, and `useGameHaptics` uses a ref so the first render doesn't buzz.",
    },
  ],
});

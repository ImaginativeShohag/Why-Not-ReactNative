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
        "Open `src/app/projects/tic-tac-toe/index.tsx`. Where does the game state (`history`, `currentMove`) actually live? Search the file for `create(` before answering.",
      choices: [
        "In a module-scope Zustand store, `useGameStore`, created with `create(combine(...))` at the top of the route file",
        "In `useState` inside the `Game` component, passed down to `Board` as props",
        "In a React context provider mounted by the project's `_layout.tsx`",
        "In a persisted store under `src/projects/tic-tac-toe/stores/`",
      ],
      answer: 0,
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Zustand: Tutorial, Tic-Tac-Toe", url: "https://zustand.docs.pmnd.rs/learn/guides/tutorial-tic-tac-toe" },
      ],
      explain:
        "`useGameStore` is created once, at module scope, with `create(combine(initialState, actions))`. There is no `_layout.tsx` and no `stores/` folder: the store, `Board` and `Square` all live in the route file, and the small `src/projects/tic-tac-toe/` slice only holds the pure helpers (`utils/game.ts`) and their tests.\n\n**Why it is built this way.** Project 06 is a warm-up for the store pattern the other projects use at scale, so the state is a module-level singleton and `Game` reads it through selector hooks. It does not own it with `useState`, and nothing is persisted.\n\n**Failure mode if you put it in `useState`:** time travel would still work, but the state would reset every time the screen unmounts, and `Board` could no longer be a dumb component fed from one owner.\n\nYou meet this in the write-up at \"Lifting state up\" and again in \"How it sits in the launcher\".",
    },
    {
      id: "tic-tac-toe-02",
      type: "text",
      level: 1,
      topics: ["Zustand", "TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Which Zustand middleware, imported from `zustand/middleware`, wraps the initial state object and the actions creator, so that the store's type is inferred with no hand-written interface? Type the function name. Read the imports at the top of the route file, or the `combine` page in the Zustand docs.",
      accept: ["combine", "combine()", /^combine\s*\(?\)?$/i],
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
      ],
      explain:
        "`combine(initialState, (set) => actions)` merges the plain initial object with whatever the creator returns, and infers the store type from both. That is why `useGameStore` needs no `GameState` interface.\n\n**Design decision.** State is declared as data (`history`, `currentMove`) and behaviour as functions, in one place, with the compiler checking every selector against that shape. A hand-written interface would be a second copy of the shape that can drift from the real one.\n\n**Related trap.** The Zustand TypeScript guide recommends `create<T>()(...)` for stores written without `combine`. With `combine` you do not use the curried form, because `combine` already creates the state type; annotating it fights the inference (see question tic-tac-toe-26).\n\n**Where to meet it:** \"Setup: the four types\" and \"Taking turns\" in the write-up. In the Zustand docs, look at the `combine` page for the same pattern.",
    },
    {
      id: "tic-tac-toe-03",
      type: "mcq",
      level: 1,
      topics: ["TypeScript", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "The store's initial state is `history: [Array<SquareValue>(9).fill(null)]`. Why does the code write `Array<SquareValue>(9)` instead of plain `Array(9)`? Hover `history` in your editor (or read the write-up's setup section) and compare what TypeScript infers with and without the generic.",
      choices: [
        "`Array(9).fill(null)` infers `any[]`, which would quietly switch off type checking for every board, selector and setter built from it",
        "`Array(9)` creates a sparse array that `.fill()` cannot fill on Hermes",
        "`combine` throws at runtime if the initial state has no explicit generic",
        "Without the generic the array would hold `undefined` instead of `null`",
      ],
      answer: 0,
      links: [
        { title: "MDN: Array.prototype.fill", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill" },
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
      ],
      explain:
        "`Array(9).fill(null)` infers `any[]`. Because `combine` infers the store type from the initial object, that `any` would spread through `history`, every `squares` prop, every selector and every setter, and TypeScript would silently stop checking the whole board.\n\n`Array<SquareValue>(9).fill(null)` infers `SquareValue[]`, so `history` becomes `SquareValue[][]`, the same structure as `Squares[]`. The other options are wrong: `.fill()` works on `Array(9)` in every engine, `combine` never needs an explicit generic at runtime, and the generic exists only for the type checker.\n\n**Why it matters for the build.** This single annotation is what makes the rest of the tutorial need almost no annotations. If you forget it, nothing breaks at runtime, you just lose the safety net, which is the worst kind of mistake because nothing tells you.\n\nIn the write-up it is the first warning in \"Setup: the four types\", and the first row of the conversion table.",
    },
    {
      id: "tic-tac-toe-04",
      type: "multi",
      level: 1,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "In the final code, which of these values are **computed during render** and not stored in the Zustand store? Select all that apply. Open `Game` and `Board` and mark every `const` computed from other values. Which ones are NOT in the `combine` initial state?",
      choices: [
        "`xIsNext`",
        "`currentSquares`",
        "`winner`",
        "`status`",
        "`history`",
        "`currentMove`",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
      ],
      explain:
        "Only `history` and `currentMove` are in the `combine` initial state. Everything else is derived while rendering: `Game` computes `xIsNext` (`currentMove % 2 === 0`) and `currentSquares` (`history[currentMove]`), and `Board` computes `winner`, `remainingTurns`, `player` and `status` with the pure helpers from `utils/game.ts`.\n\n**Design decision.** Store the minimum, derive the rest. The write-up arrives at this in \"Final cleanup\": it first stores `xIsNext`, then deletes it once `currentMove` is enough.\n\n**Failure mode otherwise.** Every stored derived value is a second source of truth. `jumpTo` or a future `reset` action that forgets to update it leaves the UI showing the wrong player or a stale status, and the compiler cannot tell you.\n\nDerived values are cheap here (nine squares), and the React Compiler can cache them anyway, so there is no performance reason to store them.",
    },
    {
      id: "tic-tac-toe-05",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Game` no longer stores whose turn it is. Write the exact boolean expression it uses to compute `xIsNext`. Open `Game` and find the line that decides whose turn it is. Type it exactly.",
      accept: [
        "currentMove % 2 === 0",
        "currentMove % 2 == 0",
        /^currentMove\s*%\s*2\s*===?\s*0;?$/i,
      ],
      hint: "It only depends on the index of the move being viewed.",
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
      ],
      explain:
        "`const xIsNext = currentMove % 2 === 0;`. X moves on even indices, and the empty board is move 0.\n\n**Why derive it.** Storing `xIsNext` next to `currentMove` means `handlePlay` has to flip it and `jumpTo` has to set it from the move parity. Deriving it means `jumpTo` sets only one value, and the turn is correct after time travel with no extra code.\n\n**Failure mode.** The write-up's first `jumpTo` snippet actually has a stale-read bug on purpose: it passes `currentMove % 2 === 0` using the value from before the update. That class of bug cannot exist once the value is derived during render.\n\nYou can see the progression in \"Adding time travel\" through \"Final cleanup\".",
    },
    {
      id: "tic-tac-toe-06",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling", "React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Square` renders `<Pressable><Text>{value}</Text></Pressable>`. What happens if you drop the `<Text>` and render `{value}` straight inside the `Pressable`, as the web tutorial does with `<button>`? Edit a copy of `Square` and try it, then read the React Native `Text` docs.",
      choices: [
        "React Native throws \"Text strings must be rendered within a <Text> component\" as soon as a square holds `X` or `O`",
        "It works, but the text loses its font styling",
        "TypeScript rejects it at compile time",
        "The string is drawn, but screen readers can't see it",
      ],
      answer: 0,
      links: [
        { title: "React Native: Text", url: "https://reactnative.dev/docs/text" },
        { title: "React Native: View", url: "https://reactnative.dev/docs/view" },
      ],
      explain:
        "In React Native every visible string needs a `<Text>` ancestor; `View` and `Pressable` cannot hold raw strings. Dropping the `Text` throws \"Text strings must be rendered within a <Text> component\".\n\n**Subtle part.** It is a runtime error, not a type error, and an empty square holds `null` (which renders nothing), so the crash only appears after the first move. Easy to miss if you only look at the initial screen.\n\n**Design consequence.** The rule splits styling in two: box styles (`width`, `height`, border, `alignItems`) go on the `Pressable` (`styles.square`) and text styles (`fontSize`, `fontWeight`, `fontFamily`) on the `Text` (`styles.squareText`).\n\nIn the write-up this is the warning in \"Building the board\", and the first rows of the DOM to React Native table at the end. Reproduce the crash yourself: remove the `Text` and play one move.",
    },
    {
      id: "tic-tac-toe-07",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "At the start of a game every square's `value` is `null`. What does `<Text style={styles.squareText}>{value}</Text>` show, and why does the square stay 40×40? Run the app, read `styles.square`, and find where the 40x40 comes from.",
      choices: [
        "Nothing is drawn, because React skips `null` children; the size comes from `styles.square` on the `Pressable`, not from the text",
        "The literal text \"null\", and the size comes from the font metrics",
        "An empty string, and the square collapses to 0×0 until a mark is placed",
        "It crashes, because `Text` children must be strings",
      ],
      answer: 0,
      links: [
        { title: "React Native: View", url: "https://reactnative.dev/docs/view" },
        { title: "React Native: Layout props", url: "https://reactnative.dev/docs/layout-props" },
      ],
      explain:
        "React renders `null`, `undefined` and booleans as nothing, so `<Text>{value}</Text>` with `value === null` draws an empty text, not the string \"null\". That is why `SquareValue = Player | null` works as a child with no conversion step.\n\nThe square keeps its size because `width` and `height` (`SQUARE_SIZE`) are set on the `Pressable` box in `styles.square`, so layout does not depend on its content.\n\n**Design decision.** Model \"empty\" as `null` in the type (not `\"\"` or `\" \"`). A filled square is then just a `Player`, the winner check is `squares[a] && ...`, and the render needs no `if`.\n\n**Failure mode otherwise.** Sizing the square by its text (for example with padding only) makes the grid jump as soon as a mark appears, and the `flexWrap` grid breaks. The write-up covers the box-model side in the border warning under \"Building the board\".",
    },
    {
      id: "tic-tac-toe-08",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Which React Native core component does this file use for every touchable element (the squares and the \"Go to move\" buttons)? Type the component name. Search the route file for the one touchable component it imports from `react-native`.",
      accept: ["Pressable", "<Pressable>", "<Pressable />"],
      links: [
        { title: "React Native: Pressable", url: "https://reactnative.dev/docs/pressable" },
      ],
      explain:
        "`Pressable` is React Native's general touch primitive. It takes `onPress`, and its `style` can be a function of `{ pressed }`. Lowercase DOM tags like `<button>` do not exist in React Native. `Square` and the move list in `Game` both use `Pressable` with a `Text` child.\n\n**Why not `TouchableOpacity` or `Button`?** `Pressable` is the current core component, it carries the `accessibilityRole`, `accessibilityLabel` and `accessibilityState` props this project adds in \"Make it accessible\", and it lets you style freely. The built-in `Button` cannot be styled to look like a square.\n\n**Failure mode.** Pasting the web tutorial's `<button>` crashes at first render on device (see the appendix, question tic-tac-toe-16).\n\nYou can compare the DOM and React Native versions side by side in the write-up's \"conversion table\".",
    },
    {
      id: "tic-tac-toe-09",
      type: "mcq",
      level: 1,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Look at `styles.board` and `styles.square`. How does the code lay the nine squares out as a 3×3 grid? Read `styles.board` and `styles.square`; do not guess from the web version.",
      choices: [
        "`flexDirection: \"row\"` and `flexWrap: \"wrap\"` on a container exactly `SQUARE_SIZE * 3` wide, so each row fills up at three squares and wraps",
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
        "Layout in React Native is Yoga flexbox only, with no CSS Grid. `Board` maps all nine squares into one `View` styled with `styles.board`: `flexDirection: \"row\"`, `flexWrap: \"wrap\"` and `width: SQUARE_SIZE * 3`. With 40-point squares, every fourth square wraps to a new line.\n\n**Why it must be an exact multiple.** The container width has to be exactly three squares wide. Even one point less pushes the third square onto the next row (see question tic-tac-toe-29, where a 1-point border does exactly that).\n\n**Alternatives and why they lose.** Three nested row views need slicing logic, and a `FlatList` with `numColumns` brings virtualisation overhead for nine cells. A flat map keeps `squares.map(...)` and the square index identical, which `squareLabel` and `handleClick` rely on.\n\nThe write-up derives this in \"Building the board\".",
    },
    {
      id: "tic-tac-toe-10",
      type: "text",
      level: 1,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Inside `Board`, the status `Text` sits **above** the grid, even though the wrapping `<View>` has no style. What is React Native's default `flexDirection` that causes this? Type the value. Check the React Native flexbox page for the default, then confirm it against `styles.game`.",
      accept: ["column", "\"column\"", "flexDirection: column", "flexDirection: \"column\""],
      links: [
        { title: "React Native: Layout with Flexbox", url: "https://reactnative.dev/docs/flexbox" },
        { title: "React Native: Layout props", url: "https://reactnative.dev/docs/layout-props" },
      ],
      explain:
        "Every React Native `View` is a flex container with `flexDirection: \"column\"` by default. On the web the default is `row`. That is why the status text sits above the grid inside an unstyled `View`, and why `styles.game` has to set `flexDirection: \"row\"` explicitly to put the board and the move list side by side.\n\n**Design decision.** The write-up wraps the status and grid in a `View`, not a fragment (`<>...</>`). A fragment cannot take a style, so the parent's `flexDirection` would decide the layout; in `Game` that is `row`, which would put the status beside the grid.\n\n**Failure mode.** Copying the web tutorial's fragment makes the status appear to the left of the board in the `row` parent.\n\nThis is the \"View where the web version used a fragment\" tip under \"Declaring a winner or draw\".",
    },
    {
      id: "tic-tac-toe-11",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "In `Board`'s `handleClick`, why does the code make a copy with `const nextSquares = squares.slice()` before writing `nextSquares[i] = player`? Look at `handleClick` and the history snippet in the write-up. What would `history[2]` contain if you skipped the copy?",
      choices: [
        "So the board in `history` is never mutated: a new array is a new reference, which keeps every past board intact for time travel and lets Zustand and React detect the change",
        "Because arrays that come from a Zustand store are frozen and throw when written to",
        "Because `.slice()` deep-clones nested objects, which the board needs",
        "To convert the array from `SquareValue[]` to `Player[]`",
      ],
      answer: 0,
      links: [
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
        { title: "MDN: Array.prototype.slice", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice" },
      ],
      explain:
        "Copying first keeps every board in `history` an untouched snapshot. A new array is a new reference, so Zustand and React can detect the change, and old entries stay valid for time travel. `.slice()` is only a shallow copy, but squares hold primitives (`\"X\"`, `\"O\"`, `null`), so shallow is enough. Zustand does not freeze state; mutation is allowed by the language but breaks both change detection and the stored history.\n\n**Design decision.** The write-up introduces `slice()` in \"Lifting state up\" before time travel exists, then pays it off in \"Adding time travel\": \"since you used `slice()`... you can store every past version\".\n\n**Failure mode if you mutate.** See question tic-tac-toe-37: two history entries end up sharing one array, and an earlier move shows a later move's mark.",
    },
    {
      id: "tic-tac-toe-12",
      type: "order",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Put the steps of `Game`'s `handlePlay(nextSquares)` in the order the code runs them. Open `handlePlay` in `Game` and rebuild the order from the code, not from memory.",
      items: [
        "Take `history.slice(0, currentMove + 1)`: the boards up to and including the one on screen",
        "Append `nextSquares` to build `nextHistory`",
        "Call `setHistory(nextHistory)`",
        "Call `setCurrentMove(nextHistory.length - 1)`",
      ],
      links: [
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
        { title: "MDN: Array.prototype.slice", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice" },
      ],
      explain:
        "`const nextHistory = [...history.slice(0, currentMove + 1), nextSquares]` drops any \"future\" boards, then adds the new one. `setCurrentMove` must run after `nextHistory` is built, because the new index is `nextHistory.length - 1`, which always points at the board that was just added.\n\n**Why `+ 1`.** `slice` excludes its end index, so `currentMove + 1` keeps the board on screen. Forgetting it would drop the board you are playing from.\n\n**Failure mode.** Appending to the full `history` after a rewind keeps the old future, and the move list would show moves from two timelines. The write-up lists this in \"Failure modes\".\n\nYou first meet the truncating version in \"Showing the past moves\".",
    },
    {
      id: "tic-tac-toe-13",
      type: "text",
      level: 1,
      topics: ["React Fundamentals"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "X, O and X have each played one square. What number does `countRemainingTurns(squares)` return? (Read what it counts.) Open `utils/game.ts` and read what `countRemainingTurns` filters on, then check the matching test.",
      accept: ["6", "six"],
      links: [
        { title: "MDN: Array.prototype.filter", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter" },
        { title: "Jest: Expect", url: "https://jestjs.io/docs/expect" },
      ],
      explain:
        "`countRemainingTurns` returns `squares.filter((square) => !square).length`, the number of **empty** squares. That is also the number of turns left, so 9 minus 3 gives 6. `calculateStatus` relies on it: `!remainingTurns` means the board is full, which with no winner is a draw.\n\n**Why this name, and why extract it.** A name like `calculateTurns` would sound like \"moves played\", the opposite of what it counts. `countRemainingTurns` says what the body does, and living in `utils/game.ts` makes it testable: the `countRemainingTurns` block in `__tests__/game.test.ts` pins 9, 7 and 0 for the three boards.\n\n**Failure mode.** A misleading name leads to an off-by-inversion bug in the draw check that tests with a mid-game board would not catch.\n\nSee \"Declaring a winner or draw\" and \"Extract the helpers\".",
    },
    {
      id: "tic-tac-toe-14",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/app/_layout.tsx", "src/shared/config/projects.ts"],
      prompt:
        "Open `src/app/_layout.tsx` and look at the `PROJECTS.map(...)`. Why does the tic-tac-toe screen show the root Stack's native header, while the store, journal and other projects don't? Read the `PROJECTS.map(...)` block in `src/app/_layout.tsx` line by line.",
      choices: [
        "Its entry has `singleScreen: true`, so the root declares `projects/tic-tac-toe/index` without `headerShown: false`; the other projects are declared with `headerShown: false` because their own `_layout.tsx` Stacks draw their headers",
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
        "Multi-screen projects are declared as `projects/<slug>` with `headerShown: false`, and their nested Stack in `src/app/projects/<slug>/_layout.tsx` takes over and draws its own headers. Tic-tac-toe has no `_layout.tsx`, so the root Stack shows it directly: `singleScreen: true` makes the root declare `projects/tic-tac-toe/index` with `options={{ title }}` from the registry entry. The root `screenOptions` also set `headerBackButtonDisplayMode: \"minimal\"`.\n\n**Why the flag exists.** It keeps the launcher and the root layout free of per-project knowledge: both just map over `PROJECTS`. Without a `title` option the header falls back to the raw route name.\n\n**Common wrong ideas.** Expo Router has no route-level `options` export, and the launcher just calls `router.push(item.route)`.\n\nSee \"How it sits in the launcher\".",
    },
    {
      id: "tic-tac-toe-15",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts"],
      prompt:
        "In the `PROJECTS` registry, which optional boolean field marks tic-tac-toe as a single route rather than a project with its own stack? Type the field name. Open `src/shared/config/projects.ts`; the field's doc comment answers it.",
      accept: ["singleScreen", "singleScreen: true"],
      links: [
        { title: "Expo Router: Core concepts", url: "https://docs.expo.dev/router/basics/core-concepts/" },
      ],
      explain:
        "`singleScreen?: boolean` is documented in the `Project` type as \"A single route (projects/<slug>/index) instead of a project stack.\" The root layout reads it to choose the `Stack.Screen` name and passes the entry's `title` as that screen's header title.\n\n**Design decision.** One optional flag in a typed registry is cheaper and safer than special-casing the slug in the layout. A new single-route project needs one registry entry and one route file.\n\n**Failure mode.** If the flag were missing, the root would declare `projects/tic-tac-toe`, which does not exist as a route node, so the screen would get default options and the registry `title` would not apply.\n\nThe launcher in `src/app/index.tsx` does not care either way: it pushes `route` (`/projects/tic-tac-toe`) for every entry. The write-up covers this under \"How it sits in the launcher\".",
    },
    {
      id: "tic-tac-toe-16",
      type: "mcq",
      level: 1,
      topics: ["React Fundamentals", "Platform Differences"],
      files: ["docs/06-tic-tac-toe.html", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The write-up's appendix covers someone who pastes the web tutorial's `<button onClick={...}>` into this route. What happens on iOS and Android? Read the write-up's appendix first, then decide what each environment does with the tag.",
      choices: [
        "`tsc` passes, but the first render throws \"View config getter callback for component `button` must be a function\", because no native view is registered under that name",
        "`tsc` fails because `button` is not a valid JSX element in React Native",
        "It renders a native system button with no styling",
        "It works on device but fails on the web target",
      ],
      answer: 0,
      links: [
        { title: "React Native: View", url: "https://reactnative.dev/docs/view" },
        { title: "Zustand: Tutorial, Tic-Tac-Toe", url: "https://zustand.docs.pmnd.rs/learn/guides/tutorial-tic-tac-toe" },
      ],
      explain:
        "A lowercase JSX tag is a host component. Fabric looks it up in `ReactNativeViewConfigRegistry`, which only knows natively registered views (`RCTView`, `RCTText`, ...), and finds nothing, so the first render throws. `@types/react` declares every DOM element, so `tsc` passes.\n\n**Why the write-up teaches this.** It is the biggest trap of porting the official Zustand tutorial. It is also a runtime error that the type system cannot see, which is why the project's checkpoint is \"run it\", not just \"typecheck\".\n\n**Reversed on the web.** There the DOM is real, so `npm run web` can look fine while devices crash on the same file.\n\n**Fix.** Use a real primitive (`Pressable`), not just a capital letter: renaming `<button>` to `<Button>` only changes the error.\n\nFull explanation: the \"appendix\" and the first row of the \"failure modes table\".",
    },
    {
      id: "tic-tac-toe-17",
      type: "multi",
      level: 1,
      topics: ["Layout & Styling", "Platform Differences"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "Which of these web-to-React-Native translations does the real file use? Select all that apply. Grep the file for `rem`, `calc`, `display`, `FlatList` and `Platform` to check each statement.",
      choices: [
        "Lengths are unitless numbers (`16`, `SQUARE_SIZE * 3`) and not `\"1rem\"` or `calc(...)`",
        "Styles live in `StyleSheet.create` and are referenced as `style={styles.x}`",
        "`gap` on the parent sets the spacing between children (`styles.game`, `styles.moves`)",
        "The font is chosen per platform with `Platform.select`",
        "`display: \"flex\"` is set on containers to turn flexbox on",
        "The move list is a `<FlatList>` to replace the web `<ol>`",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "React Native: StyleSheet", url: "https://reactnative.dev/docs/stylesheet" },
        { title: "React Native: Platform", url: "https://reactnative.dev/docs/platform" },
      ],
      explain:
        "True: lengths are unitless numbers (`16`, `SQUARE_SIZE * 3`), styles live in `StyleSheet.create`, `gap` sets the spacing in `styles.game` and `styles.moves`, and `Platform.select` chooses the font. False: `display: \"flex\"` is not needed because every `View` is already a flex container, and the move list is a plain `.map()` in a `View`, not a `FlatList`, since the history never gets long enough to need virtualisation.\n\n**Why these choices.** There are no CSS units or `calc()`, so arithmetic happens in JavaScript (`SQUARE_SIZE * 3`). `StyleSheet.create` types the objects against `ViewStyle` and `TextStyle`, so a misspelt `flexWrap` value fails at the declaration.\n\n**Failure mode.** Copying CSS strings such as `\"1rem\"` or `\"calc(3 * 2.5rem)\"` compiles in loose code but is rejected or ignored on device.\n\nThe mapping is tabulated in \"The conversion in one table\".",
    },
    {
      id: "tic-tac-toe-18",
      type: "text",
      level: 1,
      topics: ["Platform Differences", "Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`fontFamily: \"monospace\"` works on Android but not on iOS. Which React Native API does the file call to choose `\"Menlo\"` on iOS and `\"monospace\"` everywhere else? Type the call, as in `Object.method`. Search the file for `MONO` and find the call that defines it.",
      accept: ["Platform.select", "Platform.select()", /^Platform\.select\s*\(?.*\)?$/i],
      links: [
        { title: "React Native: Platform", url: "https://reactnative.dev/docs/platform" },
      ],
      explain:
        "`const MONO = Platform.select({ ios: \"Menlo\", default: \"monospace\" });` runs once at module scope. `Platform.select` returns the value for the current `Platform.OS` and falls back to `default`. Generic family names such as `\"monospace\"` resolve on Android but not on iOS, which needs a real font name.\n\n**Design decision.** For a one-value difference, `Platform.select` is the right tool. For bigger differences the repo uses `.ios.tsx` / `.android.tsx` files (for example `icon-symbol` and `icon-symbol.ios`).\n\n**Failure mode.** A bare `fontFamily: \"monospace\"` silently falls back to the system font on iOS, so the board looks different per platform, with no error to point at it.\n\nSee the \"Two React Native finishing touches\" tip under \"Final cleanup\".",
    },

    // ---------------------------------------------------------------- L2
    {
      id: "tic-tac-toe-19",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals"],
      files: ["src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "X makes the ninth move, which fills the last empty square **and** completes a diagonal. What does `calculateStatus` return? Trace the three `if` statements by hand with `winner = \"X\"` and `remainingTurns = 0`; then check the test file.",
      code: [
        "if (!winner && !remainingTurns) return \"Draw\";",
        "if (winner) return `Winner ${winner}`;",
        "return `Next player: ${player}`;",
      ].join("\n"),
      choices: ["`Winner X`", "`Draw`", "`Next player: O`", "`Winner O`"],
      answer: 0,
      links: [
        { title: "TypeScript: Narrowing", url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html" },
      ],
      explain:
        "`remainingTurns` is 0, but `winner` is `\"X\"`, so `!winner && !remainingTurns` is false and the second branch returns `Winner X`. A draw requires a full board **and no winner**.\n\n**Why the order and the guard matter.** Without the `!winner` in the first line, a winning last move would read `Draw`. The unit test \"prefers the winner, even on the last square\" (`calculateStatus(\"X\", 0, \"O\")` is `\"Winner X\"`) pins exactly this, next to the opposite case `calculateStatus(null, 0, \"X\")` is `\"Draw\"`.\n\n**Design decision.** This edge case is the reason the helper lives in `utils/game.ts`: a pure function can be tested for the last-square case without playing a game by hand.\n\nSee \"Declaring a winner or draw\", \"Extract the helpers\" and the failure modes table.",
    },
    {
      id: "tic-tac-toe-20",
      type: "order",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "A player taps an empty square during a game. Put the steps from the tap to the updated screen in order. Follow one press through the file with the editor's go-to-definition on each handler.",
      items: [
        "`Pressable`'s `onPress` calls the `onSquareClick` arrow that `Board` passed to that `Square`",
        "`Board.handleClick(i)` checks `squares[i] || winner`, then copies the board and writes `player` at `i`",
        "`onPlay(nextSquares)`, which is `Game.handlePlay`, builds `nextHistory` and calls `setHistory` and `setCurrentMove`",
        "Zustand merges the partial state and notifies subscribers; each selector result is compared with `Object.is`",
        "`Game` re-renders with the new `history` and `currentMove`, and computes `xIsNext` and `currentSquares` again",
        "`Board` receives the new `squares` and recomputes `winner`, `remainingTurns` and `status`",
      ],
      links: [
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
        { title: "React: Sharing state between components", url: "https://react.dev/learn/sharing-state-between-components" },
      ],
      explain:
        "Data flows down (`Game` to `Board` to `Square` through props) and events flow up (callbacks: `onSquareClick` to `handleClick` to `onPlay`). Only `Game` talks to the store. The store's `set` merges the partial state and calls listeners, and Zustand's hook feeds React's `useSyncExternalStore`, which re-renders `Game` because its `history` and `currentMove` selectors return new values.\n\n**Why it is built as a loop.** One owner, one direction. `Board` can render any board without knowing about the store, which is what time travel relies on.\n\n**Failure mode.** If `Square` wrote to the store itself, the rules (`squares[i] || winner`, alternating players) would be split between components, and the same click could be handled in two places.\n\nCompare this with the progression in \"Lifting state up\" and \"Lifting state up, again\".",
    },
    {
      id: "tic-tac-toe-21",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Five moves have been played, so `history.length === 6` and `currentMove === 5`. The player taps \"Go to move #2\", then taps an empty square. What are `history.length` and `currentMove` afterwards? Do the arithmetic with the actual `slice` and `length - 1` expressions from `handlePlay`.",
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
        "`jumpTo(2)` only sets `currentMove = 2`. The next `handlePlay` keeps `history.slice(0, 3)` (boards 0, 1 and 2), appends the new board to get length 4, and sets `currentMove = nextHistory.length - 1 = 3`. Moves 3 to 5 from the old timeline are dropped.\n\n**Design decision.** \"New branch replaces the future\" is the behaviour of every undo stack. It falls out of two small rules: `jumpTo` never touches `history`, and `handlePlay` always slices at `currentMove + 1`.\n\n**Failure mode.** If `handlePlay` appended to the whole history, you would get length 7 with `currentMove` 6, and the board shown after the new move would be built from a position the player never reached. The write-up lists this in \"Failure modes\".\n\nWork it through with real numbers before choosing: it is the best way to see why `+ 1` is there.",
    },
    {
      id: "tic-tac-toe-22",
      type: "order",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The player taps \"Go to move #2\" in the move list. Put what happens in order. Read `jumpTo` and the move list in `Game`; list exactly which store fields change when a button is pressed.",
      items: [
        "The move-list `Pressable` calls `jumpTo(2)` through its inline `onPress` arrow",
        "`jumpTo` calls `setCurrentMove(2)`; `history` stays the same, future boards included",
        "The store merges `{ currentMove: 2 }`, and `Game`'s `currentMove` selector returns a new value",
        "`Game` re-renders: `currentSquares = history[2]` and `xIsNext = true`",
        "`Board` shows the board as it was after move 2, and every \"Go to move\" button is still listed",
      ],
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
      ],
      explain:
        "Time travel here only moves an index. `jumpTo` never touches `history`, so you can jump forward again until a new move is played; only then does `handlePlay` cut the future off. `xIsNext` comes out right with no extra code because it is derived from `currentMove`.\n\n**Design decision.** Keeping `history` immutable and moving a pointer is cheaper and safer than copying or deleting boards. Each board is a snapshot, and `Board` is a pure function of the one it is given.\n\n**Failure mode.** If `jumpTo` also stored `xIsNext` (as the first draft did) you could jump to move 2 and still see \"Next player: O\" because the flag was set from a stale value. The write-up flags that bug in \"Showing the past moves\".\n\nThe state goes through the store, then `Game` re-renders, then `Board` re-derives its status from the new `squares` prop.",
    },
    {
      id: "tic-tac-toe-23",
      type: "multi",
      level: 3,
      topics: ["Zustand", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Game` subscribes with four separate selector hooks, such as `useGameStore((state) => state.history)`. Which statements about re-renders are true? Select all that apply. Read the Zustand `useShallow` page on how re-renders are decided, then check each claim against `Game`'s four selector lines.",
      choices: [
        "A selector hook re-renders the component only when its selected value changes by `Object.is`",
        "Selecting `setHistory` or `setCurrentMove` never causes a re-render, because those function references are created once in the `combine` creator and never change",
        "Tapping the button for the move already on screen (`setCurrentMove` with the same number) doesn't re-render `Game`, even though `set` still creates a new state object",
        "Zustand deep-compares arrays, so `setHistory` with an equal-looking copy of `history` would be skipped",
        "`useGameStore()` with no selector behaves the same as these four selectors",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
        { title: "Zustand: useShallow", url: "https://zustand.docs.pmnd.rs/reference/hooks/use-shallow.html" },
        { title: "MDN: Object.is", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is" },
      ],
      explain:
        "True: a selector hook re-renders only when its selected value changes by `Object.is`; actions are created once in the `combine` creator, so their references never change; and `setCurrentMove` with the same number leaves `currentMove` `Object.is`-equal, so `Game` does not re-render (even though `set` still builds a new state object).\n\nFalse: Zustand does not deep-compare, so an equal-looking copy of `history` is a new reference and does re-render. And `useGameStore()` with no selector returns the whole state object, which is replaced on every `set`, so it re-renders on any change.\n\n**Design decision.** One selector per field is the simplest correct subscription pattern for a few fields. Zustand passes `() => selector(getState())` to `useSyncExternalStore`, which compares snapshots with `Object.is`.\n\n**Failure mode.** Selecting the whole store makes every future field you add re-render `Game` too.",
    },
    {
      id: "tic-tac-toe-24",
      type: "text",
      level: 2,
      topics: ["Zustand", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/projects/camera-social/camera.tsx"],
      prompt:
        "Say you wanted to replace `Game`'s four selector calls with **one** call that returns `{ history, currentMove }` as an object. In Zustand v5, which helper must wrap that selector so it doesn't return a new object on every call? `src/app/projects/camera-social/camera.tsx` shows it in use. Type the helper name. Open the camera-social file named above and search it for the import from `zustand/react/shallow`.",
      accept: ["useShallow", "useShallow()", /^useShallow\s*\(?\)?$/i],
      links: [
        { title: "Zustand: useShallow", url: "https://zustand.docs.pmnd.rs/reference/hooks/use-shallow.html" },
        { title: "Zustand: Prevent rerenders with useShallow", url: "https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow.html" },
      ],
      explain:
        "`useShallow` (from `zustand/react/shallow`) remembers the last result and returns the same reference while each top-level field is still `Object.is`-equal. Camera & Social uses it for its capture-session fields.\n\n**Design decision.** The tic-tac-toe route avoids the problem by selecting each field separately, which is the simplest pattern when you only need a few fields. `useShallow` is the tool when you want one destructured object (see the stretch goal \"Selector hygiene\" in the write-up).\n\n**Failure mode.** Without it, a selector that builds a new object returns a fresh reference on every call, and in Zustand v5 that fails with an infinite-render error (question tic-tac-toe-38) instead of just re-rendering too often.\n\nLook at the real usage in the camera route and compare it with `Game`'s four selector calls. The write-up lists it under \"Stretch goals\".",
    },
    {
      id: "tic-tac-toe-25",
      type: "mcq",
      level: 2,
      topics: ["Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`setCurrentMove` calls `set((state) => ({ currentMove: ... }))`, returning an object with **only** `currentMove`. What happens to `history` and the two actions? Compare what `setCurrentMove` returns with the full state shape, then read the `setState` section of the Zustand docs.",
      choices: [
        "They're kept: Zustand's `set` shallow-merges the partial object into the current state",
        "They're removed: you have to spread `...state` or `history` becomes `undefined`",
        "`history` is kept, but the actions are dropped and recreated on the next render",
        "`combine` throws because the returned object doesn't match the full state type",
      ],
      answer: 0,
      links: [
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
      ],
      explain:
        "Zustand's `setState` merges the partial into the current state (`Object.assign({}, state, partial)`) unless you pass `replace: true`, so `history` and both actions are kept. Unlike React's class `setState` it only merges one level deep, so changing something nested still needs a spread inside it.\n\n**Design decision.** Every field here is top-level, which is why each action can return just the one key it changes, and why the actions stay tiny.\n\n**Failure mode.** Spreading `...state` out of habit is harmless but noisy. Believing you must, and then spreading a stale copy, can overwrite newer values. Believing the merge is deep, and returning a partial for a nested object, loses the sibling keys.\n\nYou meet the pattern in the store snippets throughout the write-up, starting at \"Lifting state up\".",
    },
    {
      id: "tic-tac-toe-26",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "The Zustand TypeScript guide recommends the curried `create<State>()(...)` form. Why does this file write `create(combine(...))` with no type argument? Check the Zustand TypeScript guide (the part about `combine`) before choosing.",
      choices: [
        "`combine` builds the state type itself (initial state merged with the returned actions), so a hand-written generic adds nothing and works against the inference",
        "The curried form was removed in Zustand v5",
        "The React Compiler can't analyse curried calls",
        "Type arguments are not allowed in `.tsx` files",
      ],
      answer: 0,
      links: [
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
        { title: "Zustand: combine middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/combine.html" },
      ],
      explain:
        "`combine<T, U>(initialState: T, creator)` builds the state type itself: the initial state merged with the actions the creator returns. A hand-written generic adds nothing and works against the inference.\n\nThe curried form `create<State>()(...)` exists for stores written without `combine`, where `set` and `get` cannot infer the state otherwise. It still exists in v5, and the Zustand docs say the same about `combine`, `redux` and other middleware that creates the state.\n\n**Design decision.** Declare the state once, as data. The write-up gives this as a note in \"Setup: the four types\" and as a row in the conversion table.\n\n**Failure mode.** Wrapping `combine` in `create<T>()(...)` compiles in simple cases but turns the middleware into a source of confusing type errors, and duplicates the shape in an interface that can drift.",
    },
    {
      id: "tic-tac-toe-27",
      type: "multi",
      level: 2,
      topics: ["TypeScript", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "About `type Updater<T> = T | ((prev: T) => T)` and the `typeof nextHistory === \"function\"` check in `setHistory` and `setCurrentMove`: select all that apply. Search the file for every call of `setHistory` and `setCurrentMove`: which branch of `Updater` do they use?",
      choices: [
        "It copies React's `setState` API: the setter takes either a new value or a function of the previous value",
        "The `typeof` check narrows correctly only because the value types (`Squares[]`, `number`) can never be called themselves",
        "In the current code, `Game` only ever passes plain values (`nextHistory`, `nextHistory.length - 1`, `nextMove`)",
        "If a store field ever held a function as state, this narrowing would stop telling the two cases apart",
        "Zustand requires every action to accept an updater function",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "TypeScript: Narrowing", url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html" },
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
      ],
      explain:
        "All of the first four. `Updater<T>` copies React's `setState` API; `typeof x === \"function\"` narrows correctly only because the value types (`Squares[]`, `number`) can never be called themselves; `Game` only ever passes plain values today; and a store field that held a function would break the narrowing. Zustand imposes no shape on actions, so the last choice is false: this pattern is the tutorial's own.\n\n**Why it is there at all.** The function branch reads the latest store value inside `set((state) => ...)`. It is unused by `handlePlay` and `jumpTo`, but it allows `setCurrentMove((m) => m + 1)` without a stale closure.\n\n**Failure mode.** Storing a callback as state needs a wrapper object or an explicit discriminator.\n\nSee the tip under \"Setup: the four types\".",
    },
    {
      id: "tic-tac-toe-28",
      type: "mcq",
      level: 2,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`styles.game` is `{ flexDirection: \"row\", alignItems: \"flex-start\", gap: 16, padding: 16 }`. After ten moves the move list is much taller than the board. What does `alignItems: \"flex-start\"` prevent? Play ten moves in the app, or reason from the React Native `alignItems` docs, then pick.",
      choices: [
        "The board column stretching along the cross axis to match the move list's height (the default is `alignItems: \"stretch\"`)",
        "The move list wrapping onto a second row",
        "The board and move list being centred horizontally",
        "The move buttons growing wider than their text",
      ],
      answer: 0,
      links: [
        { title: "React Native: Layout with Flexbox", url: "https://reactnative.dev/docs/flexbox" },
        { title: "React Native: Layout props", url: "https://reactnative.dev/docs/layout-props" },
      ],
      explain:
        "With `flexDirection: \"row\"` the cross axis is vertical, and the default `alignItems: \"stretch\"` makes every child as tall as the tallest one. `\"flex-start\"` keeps each child at its own natural height, pinned to the top. Wrapping is controlled by `flexWrap` and main-axis placement by `justifyContent`.\n\n**Design decision.** The move list grows with the game. Without `flex-start` the board column would stretch with it, which is invisible while the squares are fixed height but shifts the status text and any future background or border.\n\n**Failure mode.** Translating the web version's `display: flex; marginLeft: 1rem` literally leaves you with a stretching board and hand-tuned margins. The write-up replaces them with `gap: 16` and `alignItems: \"flex-start\"` (see the tip under \"Lifting state up, again\").",
    },
    {
      id: "tic-tac-toe-29",
      type: "mcq",
      level: 2,
      topics: ["Layout & Styling"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt: "Predict: what happens if you add a border to the grid container? Do the arithmetic: how many points of content width does the container have after the border?",
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
      links: [
        { title: "React Native: Layout props", url: "https://reactnative.dev/docs/layout-props" },
        { title: "React Native: View", url: "https://reactnative.dev/docs/view" },
      ],
      explain:
        "In React Native `width` always includes borders and padding (border-box). A 1-point border on each side leaves 118 points of content for three 40-point squares, so `flexWrap` moves the third square to the next line. The squares have fixed widths and do not shrink.\n\n**Design decision.** Put borders on the squares, keep the board container's width an exact multiple of `SQUARE_SIZE`, and add any frame on a wrapper `View` outside it. The write-up spells this out in the warning under \"Building the board\".\n\n**Why porting from the web trips on this.** The web original draws a border around the grid as well, and `width: calc(3 * 2.5rem)` there is the content box.\n\n**Failure mode.** A board that looks fine at 3 columns on one change and 2 on the next, and which `tsc` and the tests cannot see. It is listed in the \"failure modes table\".",
    },
    {
      id: "tic-tac-toe-30",
      type: "mcq",
      level: 2,
      topics: ["React Fundamentals", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Both lists use array indexes as keys. Each square's key is a template string made from `square-` and `squareIndex`, and each move button's key is `key={historyIndex}`. Why is that safe **here**, when index keys are usually a warning sign? Read the React docs on keys, then check how each list in the file can change.",
      choices: [
        "Neither list ever reorders or inserts in the middle: the board has nine fixed positions, and history only grows or is cut at the end, so an index always refers to the same slot or move",
        "React Native ignores `key` for children of a plain `View`",
        "Template-literal keys are hashed, so they're as good as stable IDs",
        "The React Compiler rewrites index keys into stable IDs",
      ],
      answer: 0,
      links: [
        { title: "React: Rendering lists (keys)", url: "https://react.dev/learn/rendering-lists" },
      ],
      explain:
        "Keys tell React which child is which between renders. Index keys break when items are inserted, removed or reordered before others, because state and identity then attach to the wrong item.\n\nHere neither list does that. Square `i` is always square `i`, and move `n` is always move `n`: `handlePlay` only truncates and appends at the **end** of `history`, and the board has nine fixed positions. React Native uses keys exactly like React DOM, and the compiler does not touch them.\n\n**Design decision.** Do not invent IDs where the index is the identity. The `square-` prefix is only for readability.\n\n**When it would become unsafe.** If you added a feature to reverse the move list or delete a middle move (a stretch goal worth trying), the index would no longer identify the same move. Then you would need a stable ID per history entry.",
    },
    {
      id: "tic-tac-toe-31",
      type: "mcq",
      level: 2,
      topics: ["Zustand", "Architecture"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/index.tsx"],
      prompt:
        "Play three moves, tap back to the launcher, then open Tic-Tac-Toe again. What does the board show, and why? Check where `create(` is called (module scope or inside a component) and what that means for lifetime.",
      choices: [
        "The same three-move game: `useGameStore` is created at module scope, so its state outlives the unmounted screen until the JS runtime reloads",
        "An empty board: popping the route unmounts `Game` and resets its state",
        "An empty board: Expo Router clears Zustand stores on navigation",
        "The same game, because `combine` persists to AsyncStorage by default",
      ],
      answer: 0,
      links: [
        { title: "Zustand: persist middleware", url: "https://zustand.docs.pmnd.rs/reference/middlewares/persist.html" },
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
      ],
      explain:
        "A Zustand store is a plain JS object owned by the module, not by a component. Unmounting `Game` only removes its subscription, so the state lives as long as the JS runtime does. `useState` would reset, because that state belongs to the component instance.\n\n**Design consequence.** Nothing is written to disk here. A cold launch starts a fresh game, and surviving restarts would need the `persist` middleware, which `src/projects/store/stores/cartStore.ts` uses with AsyncStorage.\n\n**Failure mode / gotcha.** A module-scope store is shared across navigations, which is convenient here, but a test that plays a game leaks into the next test unless you reset it. And a game \"stuck\" in a finished state after leaving the screen is by design, not a bug.\n\nThe write-up covers placement and lifetime in \"How it sits in the launcher\", and persistence as a \"stretch goal\".",
    },
    {
      id: "tic-tac-toe-32",
      type: "multi",
      level: 3,
      topics: ["React Compiler", "Performance"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "app.config.ts"],
      prompt:
        "The file has no `useMemo`, `useCallback` or `React.memo`. Which statements are true for this repo? Select all that apply. Open `app.config.ts`, search for `reactCompiler`, then read the compiler intro page.",
      choices: [
        "The React Compiler is switched on with `experiments.reactCompiler: true` in `app.config.ts`",
        "The compiler can cache computed values and JSX (including the inline `onSquareClick` arrows) based on their inputs, so hand-written memoisation isn't needed",
        "The compiler assumes render is pure and that props and state are never mutated, so writing into `squares` in place would break its assumptions",
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
        "True: the compiler is switched on with `reactCompiler: true` under `experiments` in `app.config.ts`; it caches computed values and JSX (including the inline `onSquareClick` arrows) based on their inputs; and it assumes render is pure and props and state are never mutated, so writing into `squares` in place would break its assumptions. False: no `React.memo` is required, and the compiler does not replace Zustand selectors, since selectors still decide when `useSyncExternalStore` re-renders `Game`.\n\n**Design decision.** Leave memoisation out and write code that follows the Rules of React. `squares.slice()` already respects them.\n\n**Failure mode.** In-place mutation (question tic-tac-toe-37) is both a time-travel bug and a compiler assumption violation, so the two problems appear together.\n\nThe same compiler rules apply to hooks and refs: don't mutate a value a hook returned, and don't read refs during render.",
    },
    {
      id: "tic-tac-toe-33",
      type: "order",
      level: 2,
      topics: ["Zustand", "React Fundamentals"],
      files: ["docs/06-tic-tac-toe.html", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "The write-up grows the store step by step. Put its shapes in order, from the first version to the final one in `index.tsx`. Skim the headings of the write-up for the store snippets, and order the shapes by when each field appears.",
      items: [
        "`{ squares }` with `setSquares`, read directly by `Board`",
        "`{ squares, xIsNext }`, adding `setXIsNext` to take turns",
        "`{ history, xIsNext }`, with `Board` now driven by props and `Game` owning the store",
        "`{ history, currentMove, xIsNext }`, adding `jumpTo` for time travel",
        "`{ history, currentMove }`, with `xIsNext` computed from `currentMove`",
      ],
      links: [
        { title: "Zustand: Tutorial, Tic-Tac-Toe", url: "https://zustand.docs.pmnd.rs/learn/guides/tutorial-tic-tac-toe" },
        { title: "React: Sharing state between components", url: "https://react.dev/learn/sharing-state-between-components" },
      ],
      explain:
        "Each step either lifts state higher or removes redundancy. First `squares` goes into a store, then `xIsNext` adds turns. Next, `Board` becomes prop-driven and `Game` owns `history`, so one place can hold every board. Then `currentMove` is added to view the past, and finally `xIsNext` is deleted because `currentMove % 2 === 0` already encodes it. The final store in `index.tsx` holds only `history` and `currentMove`.\n\n**Why the order is a good build order.** Every intermediate version plays correctly (apart from the deliberately broken `Board` between two snippets), so you can run the game at each \"Checkpoint\".\n\n**Failure mode if you skip a stage.** Adding history before lifting state forces `Board` to read the store directly, which is the version you then have to untangle.\n\nFollow the write-up's headings in sequence to see each shape.",
    },
    {
      id: "tic-tac-toe-34",
      type: "explain",
      level: 2,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "An earlier version of this code stored `xIsNext` in the store next to `currentMove`. Explain why the final code computes it instead, and what bug the stored version invites. Find where an older version of the write-up stores `xIsNext`, and name one code path that must update it.",
      model:
        "Whose turn it is can be fully worked out from `currentMove`: X plays on even indices, so `xIsNext = currentMove % 2 === 0`. Storing it as well creates two sources of truth that every code path must keep in sync. `handlePlay` had to flip it, and `jumpTo` had to set it from the move's parity. If any path forgets, for example a new \"reset\" action or a jump that skips the update, the board shows the wrong player's turn. Computing it during render removes that whole class of bugs and makes the store smaller (`history` and `currentMove` only). Computing it is free, and the React Compiler can cache it anyway.",
      rubric: [
        "Says `xIsNext` can be fully derived from `currentMove` (`% 2 === 0`)",
        "Names the risk of redundant state: two values that can fall out of sync",
        "Gives a concrete code path that would need updating, such as `jumpTo` or `handlePlay`",
        "Notes that the final store holds only `history` and `currentMove`",
      ],
      links: [
        { title: "React: Choosing the state structure", url: "https://react.dev/learn/choosing-the-state-structure" },
        { title: "React: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
      ],
      explain:
        "Whose turn it is can be fully worked out from `currentMove`: X plays on even indices, so `xIsNext = currentMove % 2 === 0`. Storing it as well creates two sources of truth that every code path must keep in sync. `handlePlay` had to flip it, and `jumpTo` had to set it from the move's parity. If any path forgets (a new \"reset\" action, or a jump that skips the update) the board shows the wrong player's turn.\n\nComputing it during render removes that whole class of bugs and makes the store smaller. It costs nothing, and the React Compiler can cache it anyway.\n\n**How it fits the build.** This is stage 7, \"Final cleanup\", and the pattern is the general rule: if a value can be computed from props or existing state, do not store it. The same thinking explains why `winner`, `status` and `currentSquares` are not stored either.",
    },
    {
      id: "tic-tac-toe-35",
      type: "explain",
      level: 2,
      topics: ["Architecture", "React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`Board` takes `{ xIsNext, squares, onPlay }` as props and never calls `useGameStore`, although it easily could. Explain why this design is better and how it matches the rule that components stay dumb. Check the props of `Board` and `Square` and whether either imports `useGameStore`.",
      model:
        "`Board` and `Square` are presentational (\"dumb\") components: plain data comes in, callbacks go out. `Game` is the only component that knows about the store. It decides which board to show (`history[currentMove]`) and what a move means (`handlePlay` cuts the history and appends). Because of that, `Board` can render any board, past or present, which is exactly what time travel needs. If it read the store directly, it would always show the latest state. The separation also makes `Board` reusable and easy to test or preview with fixed data and no store setup. This is a rule for the whole repo: components take plain data and callbacks, never a store or view model, and screens own the state.",
      rubric: [
        "Calls `Board` / `Square` presentational: props and callbacks, no store access",
        "Says `Game` owns the store and decides which board to show (`history[currentMove]`)",
        "Links prop-driven rendering to time travel, showing a past board",
        "Mentions reuse or testability with no store",
        "Cites the rule that components are dumb and screens own state",
      ],
      links: [
        { title: "React: Sharing state between components", url: "https://react.dev/learn/sharing-state-between-components" },
        { title: "React: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
      ],
      explain:
        "`Board` and `Square` are presentational: plain data comes in, callbacks go out. `Game` is the only component that knows about the store. It decides which board to show (`history[currentMove]`) and what a move means (`handlePlay`).\n\n**Why this is better.** `Board` can render any board, past or present, which is what time travel needs. If it read the store directly it would always show the latest state. It is also reusable and easy to test or preview with fixed data and no store setup.\n\n**Repo rule.** Components take plain data and callbacks, never a store or view model, and screens own the state. This is also why stage 9 passes `label` and `disabled` into `Square` rather than letting it call `squareLabel` or read the winner.\n\n**Failure mode.** Letting `Board` subscribe makes it impossible to show a past board without adding a second prop path.\n\nSee \"Lifting state up, again\".",
    },
    {
      id: "tic-tac-toe-36",
      type: "explain",
      level: 2,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts", "src/app/_layout.tsx", "src/app/index.tsx", "src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Trace how tapping the \"Tic-Tac-Toe\" card in the launcher reaches `Game`. Explain why the root layout declares `projects/tic-tac-toe/index` for this project but `projects/<slug>` for the others. Open the four files listed and follow `route` from the registry to the file on disk.",
      model:
        "The launcher (`src/app/index.tsx`) maps over `PROJECTS` and calls `router.push(item.route)`, which is `/projects/tic-tac-toe`. Expo Router resolves that URL from the file tree to `src/app/projects/tic-tac-toe/index.tsx`, whose default export is `Game`. The root `Stack` names screens by route node. Other projects have a `_layout.tsx` in their folder, so `projects/<slug>` is a nested navigator node, and the root hides its header there. Tic-tac-toe has no layout, so there's no `projects/tic-tac-toe` node. The leaf route is `projects/tic-tac-toe/index`, and the `Stack.Screen` must use that name or it matches nothing. The `singleScreen` flag in the registry is what lets `_layout.tsx` choose between the two names, so neither the launcher nor the root has to hardcode the project.",
      rubric: [
        "Launcher maps `PROJECTS` and pushes `route` (`/projects/tic-tac-toe`)",
        "The URL resolves through the file tree to `projects/tic-tac-toe/index.tsx`",
        "No `_layout.tsx` means no `projects/tic-tac-toe` navigator node, so the screen name is `.../index`",
        "`singleScreen` drives the choice in `_layout.tsx`, and the header stays visible",
      ],
      links: [
        { title: "Expo Router: Core concepts", url: "https://docs.expo.dev/router/basics/core-concepts/" },
        { title: "Expo Router: Stack", url: "https://docs.expo.dev/router/advanced/stack/" },
      ],
      explain:
        "The launcher (`src/app/index.tsx`) maps over `PROJECTS` and calls `router.push(item.route)`, which is `/projects/tic-tac-toe`. Expo Router resolves that URL from the file tree to `src/app/projects/tic-tac-toe/index.tsx`, whose default export is `Game`.\n\n**Why two names.** Other projects have a `_layout.tsx` in their folder, so `projects/<slug>` is a nested navigator node and the root hides its header there. Tic-tac-toe has no layout, so there is no `projects/tic-tac-toe` node; the leaf route is `projects/tic-tac-toe/index`, and the `Stack.Screen` must use that name. The `singleScreen` flag lets `_layout.tsx` choose between the two, so neither the launcher nor the root hardcodes a project.\n\n**Failure mode.** A `Stack.Screen` whose name matches no route node does nothing except trigger a warning, because routes come from files, not from `Stack.Screen` declarations.\n\nSee \"How it sits in the launcher\".",
    },

    // ---------------------------------------------------------------- L3
    {
      id: "tic-tac-toe-37",
      type: "mcq",
      level: 3,
      topics: ["React Fundamentals", "Zustand"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "Predict: someone \"simplifies\" `handleClick` to write into the board in place. On move 3 (`currentMove === 2`), what happens? Make the mutation in a scratch copy, play three moves, press \"Go to move #2\", and watch.",
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
      links: [
        { title: "React: Updating arrays in state", url: "https://react.dev/learn/updating-arrays-in-state" },
        { title: "React: Rules of React", url: "https://react.dev/reference/rules" },
      ],
      explain:
        "`squares` is `history[currentMove]`, so writing into it changes the past snapshot itself. `handlePlay` then appends that **same reference** inside a **new** outer array, so the `history` selector changes and `Game` re-renders, which hides the bug. Time travel breaks because two entries now share one array and \"Go to move #2\" shows move 3's mark.\n\nTypeScript does not stop you: props are not read-only unless you type them as `readonly SquareValue[]`.\n\n**Design decision.** Immutability is a convention the type system does not enforce here, so the habit (`slice()` then edit the copy) has to be taught early. The write-up states the reason at the point of use: \"since you used `slice()`... you can store every past version\" (\"Adding time travel\").\n\n**Failure mode.** A bug that only appears after a rewind, and the app still re-renders, which makes it hard to notice. Try it in a scratch copy.",
    },
    {
      id: "tic-tac-toe-38",
      type: "mcq",
      level: 3,
      topics: ["Zustand", "React Hooks"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/app/projects/camera-social/camera.tsx"],
      prompt: "In Zustand v5, what happens if `Game` subscribes like this, with no `useShallow`? Read the Zustand v5 page on selectors that return new objects, then compare `Game` with the snippet.",
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
      links: [
        { title: "Zustand: Prevent rerenders with useShallow", url: "https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow.html" },
        { title: "Zustand: useShallow", url: "https://zustand.docs.pmnd.rs/reference/hooks/use-shallow.html" },
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
      ],
      explain:
        "Zustand v5 passes `() => selector(getState())` to React's `useSyncExternalStore` as the snapshot getter, and React requires that getter to return a cached value when nothing changed. A new object literal is never `Object.is`-equal to the last one, so React keeps re-rendering until it reports \"Maximum update depth exceeded\". v4 used a custom equality hook and only re-rendered too often; v5 fails loudly.\n\n**Fixes.** Separate selectors, as `Game` does, or `useShallow`, as `camera-social/camera.tsx` does.\n\n**Design decision.** Four tiny selectors are boring and safe. `useShallow` is the tool for grouping.\n\n**Failure mode if you do not know this.** A migration from v4 that worked silently now throws, and the error points at React rather than the selector.\n\nThis is the \"Selector hygiene\" \"stretch goal\".",
    },
    {
      id: "tic-tac-toe-39",
      type: "mcq",
      level: 3,
      topics: ["TypeScript"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "docs/06-tic-tac-toe.html"],
      prompt:
        "`handlePlay` builds `[...history.slice(0, currentMove + 1), nextSquares]`. Someone rewrites it in two ways. Which one does TypeScript catch at compile time? Read the MDN `concat` page and the write-up's note on `history.concat([nextSquares])`.",
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
      links: [
        { title: "MDN: Array.prototype.concat", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat" },
        { title: "TypeScript: Everyday types", url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html" },
      ],
      explain:
        "`Array.prototype.concat` accepts both single elements and arrays of elements: its signature is `concat(...items: (T | ConcatArray<T>)[])` with `T` being `Squares`. So `history.concat(nextSquares)` type-checks as one element `T`, but at runtime `concat` flattens it, appending nine separate entries. The spread version (B) produces an array of a union element type, which `setHistory` rejects.\n\nThe write-up calls this out as \"one of the few places in this tutorial where types do not save you\" (\"Declaring a winner or draw\"). In the repo, `handlePlay` uses `[...history.slice(0, currentMove + 1), nextSquares]`, which has no such ambiguity.\n\n**Design decision.** Prefer the spread form over `concat` for append-one-item, so the shape of what you are adding is visible.\n\n**Failure mode.** A move list with nine buttons after one move, and no error. See \"Failure modes\".",
    },
    {
      id: "tic-tac-toe-40",
      type: "explain",
      level: 3,
      topics: ["Zustand", "React Hooks"],
      files: ["src/app/projects/tic-tac-toe/index.tsx"],
      prompt:
        "`handlePlay` reads `history` and `currentMove` from the render closure and then makes **two** setter calls. Explain the trade-off, and describe how you'd move \"play a move\" into a single store action with `set((state) => ...)`. Why is that more robust? Count the `set` calls and notifications caused by one tap in `Game`'s `handlePlay`, and read the Zustand docs on `set` before answering.",
      model:
        "Right now `Game` computes `nextHistory` from values captured during render, then calls `setHistory` and `setCurrentMove` one after the other. Between those two calls the store briefly holds the new history with the old index, and subscribers are notified twice. React batches the re-renders inside the event, so this works. But the logic is spread across a component and relies on the closure being current. A single action like `play: (nextSquares) => set((state) => { const h = [...state.history.slice(0, state.currentMove + 1), nextSquares]; return { history: h, currentMove: h.length - 1 }; })` reads the **latest** store state, changes both fields in one atomic update, and notifies once. It also moves the game rules out of the view, so `Game` only calls `play`, and the rules can be tested through `useGameStore.getState()` with no rendering. This is also what the `Updater` function form is for: computing from `prev` and not from a captured value.",
      rubric: [
        "Notes that the values come from the render closure and that there are two separate `set` calls / notifications",
        "Says there's a brief in-between state (new history, old `currentMove`) and that React batching hides it",
        "Proposes one action using `set((state) => ...)` that updates both fields at once",
        "Gives a benefit: reads the latest state, one notification, logic out of the view, or testable through `getState()`",
      ],
      links: [
        { title: "Zustand: Advanced TypeScript guide", url: "https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript.html" },
        { title: "React: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
      ],
      explain:
        "Right now `Game` computes `nextHistory` from values captured during render, then calls `setHistory` and `setCurrentMove` one after the other. Between the two calls the store briefly holds the new history with the old index, and subscribers are notified twice. React batches the re-renders inside the event handler, so it works, but the logic is spread across a component and depends on the closure being current.\n\nA single action such as `play: (nextSquares) => set((state) => { const h = [...state.history.slice(0, state.currentMove + 1), nextSquares]; return { history: h, currentMove: h.length - 1 }; })` reads the **latest** store state, updates both fields in one atomic `set`, and notifies once. It also moves the game rules out of the view, so they can be tested through `useGameStore.getState()` without rendering.\n\n**Trade-off.** More logic in the store, less in `Game`. That is the same reason React recommends functional updaters or reducers.\n\nThe write-up's stage 7 (Final cleanup) is where you derive `xIsNext`; the next step in that spirit is moving the move rule into the store.",
    },
    {
      id: "tic-tac-toe-41",
      type: "explain",
      level: 3,
      topics: ["Accessibility", "React Fundamentals"],
      files: ["src/app/projects/tic-tac-toe/index.tsx", "src/projects/tic-tac-toe/utils/game.ts"],
      prompt:
        "Each `Square` gets `accessibilityRole=\"button\"`, an `accessibilityLabel` from `squareLabel(index, value)` and `accessibilityState={{ disabled }}`. The move buttons get a role and `selected`, and the status `Text` has `accessibilityLiveRegion=\"polite\"`. Explain what a VoiceOver or TalkBack user would experience without these props, what each one adds, and why `Board` (not `Square`) computes the label and `disabled`. Search the file for every `accessibility*` prop and read the React Native accessibility docs before writing.",
      model:
        "Without them, a `Pressable` is still focusable (`accessible` defaults to true), but it isn't announced as a button. An empty square has no text, so it's read as an unlabelled element, and a filled one only says \"X\" or \"O\" with no position. The user can't tell which cell they're on, or that a taken cell or a finished game won't respond. The role makes each target announce as a button. The label (\"Row 2, column 3, empty\") gives position and contents. `disabled` (taken square or a winner exists) says the tap does nothing. `selected` marks the move currently on screen. The live region makes Android read the new status (\"Next player: O\", \"Winner X\") after each move, since the status changes away from where focus is. `Board` computes the label and `disabled` because it knows the index and the `winner`. `Square` stays a dumb component that receives plain `label` and `disabled` props, so it needs no game knowledge and `squareLabel` can be unit-tested on its own.",
      rubric: [
        "Says that without the props, squares aren't announced as buttons and empty squares have no readable label or position",
        "Explains role (button), label (position and contents) and state (`disabled`, `selected`)",
        "Explains the live region: status changes get announced without moving focus",
        "Says `Board` computes the label and `disabled` so `Square` stays dumb, and the pure `squareLabel` is testable",
      ],
      links: [
        { title: "React Native: Accessibility", url: "https://reactnative.dev/docs/accessibility" },
        { title: "React Native: AccessibilityInfo", url: "https://reactnative.dev/docs/accessibilityinfo" },
      ],
      explain:
        "Without the props, a `Pressable` is still focusable but is not announced as a button, an empty square has no text to read, and a filled one only says \"X\" or \"O\" with no position. The user cannot tell which cell they are on, or that a taken cell or a finished game will not respond.\n\nEach prop adds one thing: the role announces a button; the label (\"Row 2, column 3, empty\") gives position and contents; `disabled` says the tap does nothing; `selected` marks the move on screen; and the live region makes Android read \"Next player: O\" or \"Winner X\" after each move, since the status changes away from where focus is.\n\n**Design decision.** `Board` computes the label and `disabled` because it knows the index and the `winner`; `Square` stays a dumb component receiving plain `label` and `disabled`, and the pure `squareLabel` has its own unit test. `accessibilityLiveRegion` is Android-only; on iOS you would use `AccessibilityInfo.announceForAccessibility`.\n\nBuilt in \"Make it accessible\".",
    },
    {
      id: "tic-tac-toe-42",
      type: "mcq",
      level: 2,
      topics: ["Architecture", "Testing"],
      files: ["src/projects/tic-tac-toe/utils/game.ts", "src/projects/tic-tac-toe/__tests__/game.test.ts"],
      prompt:
        "The store and components stay in the route file, but `calculateWinner`, `countRemainingTurns`, `calculateStatus` and `squareLabel` live in `src/projects/tic-tac-toe/utils/game.ts`. What's the main reason? Run `ls` on the slice and open the test file before answering.",
      choices: [
        "Every file under `src/app/` is a route, so a test file can't live there. Pure helpers in a slice can be imported and unit-tested by `__tests__/game.test.ts` without rendering anything",
        "Expo Router refuses to bundle a route file that exports more than one function",
        "The React Compiler only optimises functions that live outside `src/app/`",
        "Zustand's `combine` can't call functions defined in the same file",
      ],
      answer: 0,
      links: [
        { title: "Expo: Unit testing with Jest", url: "https://docs.expo.dev/develop/unit-testing/" },
        { title: "Jest: Getting started", url: "https://jestjs.io/docs/getting-started" },
      ],
      explain:
        "Every file under `src/app/` is a route, so a test file cannot live there. Pure helpers in a slice can be imported and unit-tested by `__tests__/game.test.ts` without rendering anything. Tests live in `src/projects/<slug>/__tests__/`, never under `src/app/`.\n\n**Design decision.** A helper can only be tested if a test can import it, so it must be exported from a module outside the route file. Pure functions with no React or store dependency are the cheapest thing to test, so they are the first thing to pull out of a screen. The store and components stay in the route file because they are route-specific.\n\n**Failure mode.** Putting `game.test.ts` under `src/app/projects/tic-tac-toe/` makes Expo Router treat it as a route and try to bundle it.\n\nThe write-up builds this in \"Extract the helpers and test them\". Run `npx jest --no-watchman src/projects/tic-tac-toe` to check it.",
    },
  ],
});

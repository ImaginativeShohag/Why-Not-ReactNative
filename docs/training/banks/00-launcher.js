QUIZ.register({
  slug: "launcher",
  number: "00",
  title: "Launcher & shared infra",
  doc: "../00-launcher-restructure.html",
  summary:
    "Trains the parts of the repo that sit outside the six project slices: the registry-driven launcher, the root layout and its cold-start side effects, URL rewriting, the shared QueryClient/axios/theme layer, and the Expo config, EAS, Metro, TypeScript and Jest setup that every project builds on.",
  questions: [
    // ---------------------------------------------------------------- Level 1
    {
      id: "launcher-01",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/shared/config/projects.ts", "src/app/index.tsx", "src/app/_layout.tsx"],
      prompt:
        "Open `src/app/index.tsx` and `src/app/_layout.tsx`. You are adding a seventh project with its own stack under `src/app/projects/<slug>/`. Apart from creating that route folder, what is the **only** root-level change needed so the project shows up on the launcher **and** gets a root `Stack.Screen`?",
      choices: [
        "Add one entry to the `PROJECTS` array in `src/shared/config/projects.ts`",
        "Add a `<Stack.Screen name=\"projects/<slug>\" />` to the root layout and a `<ProjectListItem>` to `index.tsx`",
        "Register the project under `extra` in `app.config.ts` so the launcher can read it with expo-constants",
        "Add the slug to a `linking.config.screens` map so expo-router knows the route exists",
      ],
      answer: 0,
      explain:
        "Both the launcher list and the root `Stack` are generated from `PROJECTS`, so a new project is a data change, not a navigation edit.\n\n- **Why it was built this way:** the restructure (doc 00, Build order M4) exists so neither `index.tsx` nor `_layout.tsx` knows a project by name. If you hand-write `Stack.Screen` and `ProjectListItem` entries, every new project edits two files that can drift apart, and a project listed in one but not the other shows a row that opens a default-titled route.\n- **Why the distractors fail:** `extra` carries per-environment values, and expo-router has no linking map to fill in because routes come from the file tree.\n- **How you arrive at it yourself:** when you write the Home screen in M4 you will notice the root layout needs the same list. Extracting one typed array and mapping it twice is the natural fix.",
      links: [
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
        { title: "Expo Router: nesting navigators", url: "https://docs.expo.dev/router/advanced/nesting-navigators" },
      ],
      hint: "Look for `.map(` in both files. What array do they map over?",
    },
    {
      id: "launcher-02",
      type: "text",
      level: 1,
      topics: ["Architecture", "TypeScript"],
      files: ["src/shared/config/projects.ts"],
      prompt:
        "Open `src/shared/config/projects.ts`. Use `grep -rn \"\\.map(\" src/app/index.tsx src/app/_layout.tsx`, then follow the import. Type the name of the exported **constant** that both files map over.",
      accept: ["PROJECTS", "export const PROJECTS"],
      explain:
        "`PROJECTS: Project[]` is the registry that Home and the root layout both consume. Each entry has a `slug` (the React key and the root `Stack.Screen` name), a typed `route: Href` and an optional `singleScreen` flag.\n\n- **Why it matters for the whole app:** the composition root (`src/app/_layout.tsx`) is the one place allowed to see every project. Keeping it free of hardcoded project names is what lets the isolation rules stay enforceable.\n- **What breaks otherwise:** with a hand-maintained list in each file, adding a project means two edits, and forgetting one gives you a launcher row that opens an untitled, header-visible route.\n- **How you arrive at it:** in doc 00, section \"The Home / launcher screen\", the registry is the first thing you write in M4. A quick `grep -rn PROJECTS src/` shows every consumer.",
      links: [
        { title: "TSConfig reference", url: "https://www.typescriptlang.org/tsconfig/" },
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
      ],
    },
    {
      id: "launcher-03",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: ["src/app/_layout.tsx", "docs/00-launcher-restructure.html"],
      prompt:
        "A teammate adds `src/app/projects/store/components/PriceTag.tsx` (a default-exported component that expects props) and imports it into a store screen. They do **not** add any `Stack.Screen` for it. What actually happens?",
      choices: [
        "It becomes a real, reachable route (`/projects/store/components/PriceTag`) that a deep link can open, rendering without its props or providers",
        "Nothing: a file that is not declared with `Stack.Screen` is not a route",
        "Nothing: expo-router skips folders named `components`",
        "The bundle fails because a route file is imported by another route",
      ],
      answer: 0,
      explain:
        "Expo Router derives routes from the file tree. A `Stack.Screen` declaration only configures a route; it never creates or hides one. So `PriceTag.tsx` under `src/app/` is reachable at `/projects/store/components/PriceTag`, rendered with no props and none of the providers its parent screen supplies.\n\n- **Real failure mode:** this repo's profile sheet once lived under `src/app/` and crashed when its URL was opened, because `useBottomSheetModal()` throws outside the tab layout's provider.\n- **The rule that follows:** `src/app/` holds routes only; sheets, rows and helpers go in `src/projects/<slug>/` or `src/shared/`, and tests never go under `src/app/`.\n- **How you arrive at it:** doc 00 (Routing strategy and Failure modes #6) has you park a component under `src/app/` on purpose, open its URL and watch the crash. Doing it once makes the rule stick.",
      links: [
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
        { title: "Expo Router: src/app directory", url: "https://docs.expo.dev/router/reference/src-directory" },
      ],
    },
    {
      id: "launcher-04",
      type: "mcq",
      level: 1,
      topics: ["Expo Router"],
      files: ["src/app/_layout.tsx", "src/app/projects/offline-journal/_layout.tsx"],
      prompt:
        "In `src/app/_layout.tsx`, every non-`singleScreen` project gets a `Stack.Screen` named `projects/<slug>` with `options={{ headerShown: false }}`. Why hide the root header for these screens?",
      choices: [
        "Each project's own `_layout.tsx` renders its own `Stack` with headers, so a root header would stack a second header on top",
        "To hide the launcher's header while a project is open",
        "Deep links into a project only resolve when the root header is hidden",
        "Native headers are expensive, so the root turns them off for performance",
      ],
      answer: 0,
      explain:
        "Each project's `_layout.tsx` renders its own `Stack` with its own headers, titles and tint colors. The root entry `projects/<slug>` is just the container for that navigator, so its header is hidden to avoid a double header.\n\n- **Design decision:** the root layout owns one `Stack.Screen` per project and nothing about inside-the-project routes. That keeps project navigation self-contained, which is what the isolation rules need.\n- **What fails the other way:** if the root header stayed on, every screen in every project would render two stacked headers, and back-button behaviour would be ambiguous between the two stacks.\n- **Counter-case:** `singleScreen` projects (tic-tac-toe) have no inner Stack, so the root gives them a title and keeps the header.\n- **How you arrive at it:** build M4 in doc 00 and open a project; the second header appears immediately and `headerShown: false` is the fix.",
      links: [
        { title: "Expo Router: nesting navigators", url: "https://docs.expo.dev/router/advanced/nesting-navigators" },
        { title: "Expo Router: Stack", url: "https://docs.expo.dev/router/advanced/stack" },
      ],
    },
    {
      id: "launcher-05",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Expo Config & EAS"],
      files: ["package.json"],
      prompt:
        "There is no `App.tsx` or `index.js` in this repo. Find out what boots the app: open `package.json` and type the value of the field that names the entry module.",
      accept: ["expo-router/entry"],
      explain:
        "`\"main\": \"expo-router/entry\"` replaces the classic `App.tsx` / `index.js`. The entry registers the root component and builds the navigation tree from `src/app/`.\n\n- **Consequence for the architecture:** the entry evaluates `src/app/_layout.tsx` on every launch, including headless ones (a background task waking JS with no UI). Project layouts only evaluate when the user opens that project. That asymmetry is why task definitions, notification starters and share-intent routing live in the root layout (doc 00, \"Root-level side effects\").\n- **What breaks otherwise:** a `TaskManager.defineTask` placed in a project layout is simply absent on a headless launch, and the work is dropped.\n- **How you arrive at it:** when you scaffold the repo in doc 00 M1/M4, `main` is the first thing that tells you where module-scope code can run.",
      links: [
        { title: "Expo Router: installation", url: "https://docs.expo.dev/router/installation" },
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
      ],
    },
    {
      id: "launcher-06",
      type: "order",
      level: 1,
      topics: ["Architecture", "Expo Router"],
      files: ["src/app/_layout.tsx"],
      prompt:
        "Open `src/app/_layout.tsx`. Put the root wrappers in order from **outermost** to **innermost**, as rendered by `RootLayout`.",
      items: [
        "`QueryProvider`",
        "`ShareIntentProvider`",
        "`SafeAreaProvider`",
        "`GestureHandlerRootView`",
        "`ThemeProvider` (from `expo-router/react-navigation`)",
        "`Stack`",
      ],
      explain:
        "Providers wrap whatever consumes them, so the order encodes dependencies.\n\n- `QueryProvider` is outermost so every route and the share-routing hook see one `QueryClient`. A second client anywhere would be a second cache (doc 00, rule 6 and Failure modes #8).\n- `ShareIntentProvider` sits above the navigator so the render-nothing `ShareIntentRouting` child can read its context.\n- `SafeAreaProvider` and `GestureHandlerRootView style={{ flex: 1 }}` wrap the navigator so insets and gestures work on every screen, launcher included.\n- `ThemeProvider` feeds the `Stack` a light or dark theme.\n\n**What fails if you reorder:** moving `QueryProvider` below a consumer throws \"No QueryClient set\"; a `GestureHandlerRootView` without `flex: 1` collapses to zero height.\n\n**How you arrive at it:** in doc 00 M4 you mount providers once at the root; list what each child needs and the order falls out.",
      links: [
        { title: "React: passing data deeply with context", url: "https://react.dev/learn/passing-data-deeply-with-context" },
        { title: "React: useContext", url: "https://react.dev/reference/react/useContext" },
        { title: "TanStack Query: QueryClientProvider", url: "https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider" },
      ],
    },
    {
      id: "launcher-07",
      type: "mcq",
      level: 1,
      topics: ["Gesture Handler", "Architecture"],
      files: ["src/app/_layout.tsx", "src/app/index.tsx"],
      prompt:
        "Why is `GestureHandlerRootView style={{ flex: 1 }}` mounted once in the **root** layout, rather than in each project that uses gestures?",
      choices: [
        "react-native-gesture-handler only recognizes gestures inside a `GestureHandlerRootView`. One at the root covers the launcher's gesture-handler `ScrollView` and every project's swipeables and sheets",
        "It provides the safe-area insets that `SafeAreaView` reads",
        "It is what enables Reanimated worklets to run on the UI thread",
        "expo-router needs it for the iOS back-swipe between the launcher and a project",
      ],
      answer: 0,
      explain:
        "Gesture Handler only recognises gestures for components under a `GestureHandlerRootView`, and it should sit as close to the app root as possible. One root view covers the launcher's gesture-handler `ScrollView` and every project's swipeables and sheets.\n\n- **Architecture reason:** mounting it per project would make the launcher (which uses the gesture-handler `ScrollView` itself) depend on a project's provider tree, which breaks the \"launcher knows nothing about projects\" goal.\n- **What fails:** gestures silently do nothing outside the root view, and without `flex: 1` the view collapses.\n- **Not the cause of:** safe-area insets (`SafeAreaProvider`) or Reanimated setup (the `import \"react-native-reanimated\"` line).\n- **How you arrive at it:** doc 00 M4 asks you to mount the gesture root, safe-area and theme providers once; open a bottom sheet from a project to see why it must be above all of them.",
      links: [
        { title: "Gesture Handler: GestureHandlerRootView", url: "https://github.com/software-mansion/react-native-gesture-handler/blob/main/packages/docs-gesture-handler/docs/core-components/root-view.mdx" },
      ],
    },
    {
      id: "launcher-08",
      type: "text",
      level: 1,
      topics: ["Expo Router"],
      files: ["src/app/_layout.tsx"],
      prompt:
        "The root layout needs `ThemeProvider`, `DarkTheme` and `DefaultTheme`, but this repo must never import `@react-navigation/*`. Find the import block of `src/app/_layout.tsx` and type the exact module specifier that `ThemeProvider`, `DarkTheme` and `DefaultTheme` come from.",
      accept: ["expo-router/react-navigation"],
      explain:
        "Since SDK 56, expo-router carries its own copy of React Navigation and fails the **bundle** (not `tsc`) if app code imports `@react-navigation/*`. The supported entry is `expo-router/react-navigation` for themes and `useHeaderHeight`; hooks like `useIsFocused` and `useFocusEffect` come from `expo-router`.\n\n- **Failure mode:** an `@react-navigation/elements` import compiles and lints fine while those packages are installed, then breaks only at Metro bundle time, which is late and confusing.\n- **Why it matters across the repo:** every project shares one navigation runtime; a second copy would mean two navigation contexts.\n- **How you arrive at it:** doc 00, Failure modes #7, has you import `useHeaderHeight` from the old package on purpose. Search the root layout's import block for the module that provides `ThemeProvider`.",
      links: [
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
        { title: "Expo: TypeScript", url: "https://docs.expo.dev/guides/typescript" },
      ],
    },
    {
      id: "launcher-09",
      type: "mcq",
      level: 1,
      topics: ["Architecture", "Accessibility"],
      files: ["src/shared/components/ui/content-unavailable-view.tsx", "src/shared/hooks/use-theme-color.ts"],
      prompt:
        "A camera screen always has a black background. On a phone in **light** mode, `ContentUnavailableView` would draw its title in the theme's dark text color, which is invisible on black. How is this component designed to handle that?",
      choices: [
        "The caller passes `titleColor` / `descriptionColor`. The component uses `titleColor ?? themeTitleColor`, so overrides win and the theme is the fallback",
        "Wrap it in `<ThemeProvider value={DarkTheme}>`, because it reads colors from the navigation theme",
        "Pass the camera screen's store so the component can read the current palette",
        "It measures its parent's background color and picks a contrasting text color automatically",
      ],
      answer: 0,
      explain:
        "`ContentUnavailableView` is a dumb, reusable component: plain props in, no store, no assumption about the project rendering it. Its defaults come from `useThemeColor`, which follows the **device** colour scheme, so a fixed-palette screen (a black camera view) overrides with `titleColor` / `descriptionColor` using `titleColor ?? themeTitleColor`.\n\n- **Why not wrap it in a `ThemeProvider`:** that changes the navigation theme, which this component never reads.\n- **Why not pass a store:** the repo's component rule (doc 00, rule 4) forbids components from knowing a project's state; the component would stop being shareable.\n- **What breaks otherwise:** forking the component per project, or invisible text on black in light mode.\n- **How you arrive at it:** doc 00 puts it in `shared/components/ui` because it was written with zero project knowledge; check how it resolves its colours before choosing.",
      links: [
        { title: "React Native: useColorScheme", url: "https://reactnative.dev/docs/usecolorscheme" },
        { title: "React: passing data deeply with context", url: "https://react.dev/learn/passing-data-deeply-with-context" },
      ],
    },
    {
      id: "launcher-10",
      type: "multi",
      level: 1,
      topics: ["Background Tasks", "Notifications", "Architecture"],
      files: ["src/app/_layout.tsx"],
      prompt:
        "Read the top of `src/app/_layout.tsx` (everything that runs at **module scope**, before `RootLayout` renders). Select all that apply.",
      choices: [
        "Imports `offline-journal/sync/task`, which defines the journal's background sync task",
        "Imports `fitness-tracker/tracking/task`, which defines the background location task",
        "Imports `podcast-player/downloads/task`, which defines the feed refresh / download task",
        "Calls `startNotificationResponseListener()` and `startJournalNotificationRouting()`",
        "Calls `registerForPushAsync()` so push permission is requested on first launch",
        "Opens the journal's SQLite database so its sync task has a connection",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "The root layout runs these at module scope because a project layout may never load on a headless or cold launch.\n\n- The three `.../task` imports are side-effect-only: evaluating them runs `TaskManager.defineTask`.\n- `startNotificationResponseListener()` and `startJournalNotificationRouting()` only listen and buffer a route.\n- **Not at the root:** push permission (requested from the store's signed-in session, so it is tied to an account and not a launch-time prompt) and opening the journal database (done by its own `SQLiteProvider` or lazily by `getDb()`).\n\n**What fails otherwise:** a task defined in a project layout is missing when the OS wakes JS in the background; a tap on a notification on a cold start lands on the launcher and is lost.\n\n**How you arrive at it:** doc 00, \"Root-level side effects\", lists the four categories. Read the top of `_layout.tsx` and sort each line into listen/define versus ask/open.",
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager" },
        { title: "Expo Notifications", url: "https://docs.expo.dev/versions/latest/sdk/notifications" },
      ],
    },
    {
      id: "launcher-11",
      type: "multi",
      level: 1,
      topics: ["TypeScript", "Testing"],
      files: ["tsconfig.json", "package.json"],
      prompt:
        "Open `tsconfig.json` and the `jest` block in `package.json`. Select all that apply.",
      choices: [
        "`@/*` maps to the repo root, so imports look like `@/src/shared/constants/env`",
        "`\"types\": [\"jest\"]` is there because TypeScript 6 no longer auto-loads every `@types/*` package, so `describe` / `expect` would otherwise be unknown",
        "`testPathIgnorePatterns` skips `/ios/` and `/android/`, so prebuilt native folders aren't crawled for tests",
        "Unit tests belong in `src/projects/<slug>/__tests__/`, never under `src/app/`, because any file there becomes a route",
        "The Jest preset is plain `react-native`, so Expo native modules are not mocked",
        "`tsconfig.json` only includes `src/**`, so `app.config.ts` is not type-checked",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "`paths: { \"@/*\": [\"./*\"] }` maps to the repo root, hence imports like `@/src/shared/constants/env`; Expo's Metro reads tsconfig `paths`, so it works at runtime too. `\"types\": [\"jest\"]` is explicit because TypeScript 6 no longer auto-loads every `@types/*` package. `testPathIgnorePatterns` keeps Jest out of generated `ios/` and `android/`. Tests live in `src/projects/<slug>/__tests__/` because any file under `src/app/` becomes a route.\n\n- **False options:** the preset is `jest-expo` (which mocks Expo modules), and `include` covers `**/*.ts(x)` so `app.config.ts` is type-checked.\n- **Build relevance:** the alias also makes cross-project imports trivially easy to write, which is why ESLint (not the alias) enforces isolation.\n- **How you arrive at it:** doc 00 M1 fixes importers with the alias; M5 verifies with typecheck and lint.",
      links: [
        { title: "TSConfig reference", url: "https://www.typescriptlang.org/tsconfig/" },
        { title: "Expo: unit testing with Jest", url: "https://docs.expo.dev/develop/unit-testing" },
        { title: "Jest: configuration", url: "https://jestjs.io/docs/configuration" },
      ],
    },
    {
      id: "launcher-12",
      type: "text",
      level: 1,
      topics: ["Platform Differences", "Expo Config & EAS"],
      files: ["src/shared/constants/env.ts"],
      prompt:
        "Open `src/shared/constants/env.ts` and find the fallback used when no journal sync URL is configured. Type the **IP address** it uses for the Android emulator.",
      accept: ["10.0.2.2", "10.0.2.2:3000", "http://10.0.2.2:3000"],
      explain:
        "`localhost` in the Android emulator is the emulator itself; `10.0.2.2` is its alias for the host machine's loopback. The iOS simulator shares the host network, so `localhost` works there.\n\n- **Why it lives in `env.ts`:** the choice depends on `Platform.OS` at runtime. `app.config.ts` runs once in Node at build time and cannot know which device will run the app, so it bakes `\"\"` and `env.ts` resolves it.\n- **What breaks otherwise:** the journal's sync works on iOS and times out on Android with no obvious error.\n- **Build relevance:** doc 00 lists `journalSyncUrl` under the `extra` values read through `src/shared/constants/env.ts`, a shared module so no project hardcodes hosts.\n- **How you arrive at it:** read `env.ts` for the constant, then the Android emulator networking page for what the address means.",
      links: [
        { title: "Android: emulator networking", url: "https://developer.android.com/studio/run/emulator-networking" },
        { title: "Expo: environment variables", url: "https://docs.expo.dev/guides/environment-variables" },
      ],
    },

    // ---------------------------------------------------------------- Level 2
    {
      id: "launcher-13",
      type: "mcq",
      level: 2,
      topics: ["Expo Router"],
      files: ["src/app/_layout.tsx", "src/app/projects/tic-tac-toe/index.tsx", "src/app/+not-found.tsx"],
      prompt:
        "Tic-tac-toe is `singleScreen`, so the root declares a `Stack.Screen` named `projects/tic-tac-toe/index`, and its route file sets no options. The root passes `options={{ title }}` from the registry entry. What would the header show **without** that option, and which of these is also a supported way to set the title?",
      choices: [
        "The route name, `projects/tic-tac-toe/index`. An inline `<Stack.Screen options={{ title: \"…\" }} />` rendered inside the route, as `+not-found.tsx` does, also works",
        "\"Tic-Tac-Toe\": the native stack reads `title` from the registry automatically, so the option is redundant",
        "No header at all, because `singleScreen` routes inherit `headerShown: false`",
        "\"Why Not ReactNative\". Adding `export const options = { title: \"Tic-Tac-Toe\" }` to the route file also works",
      ],
      answer: 0,
      explain:
        "Without a title, the native stack uses the route name, so the header would read `projects/tic-tac-toe/index`. The registry is plain data the navigator never sees, which is why the root destructures `title` in `PROJECTS.map` and passes it into `options`.\n\n- **The lesson:** Expo Router has no route-level `export const options`. Supported ways are the parent layout's `Stack.Screen options`, an inline `<Stack.Screen options>` inside the route (like `+not-found.tsx`), or `navigation.setOptions()`.\n- **Real failure mode:** the store's splash once exported `options` and looked configured while silently inheriting a visible header (doc 00, Failure modes #4).\n- **Why it matters:** a copied Next.js habit produces settings that do nothing and no error.\n- **How you arrive at it:** doc 00 M4 has you declare `singleScreen` projects with the registry `title`; try the route-level export and compare.",
      links: [
        { title: "Expo Router: Stack", url: "https://docs.expo.dev/router/advanced/stack" },
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
      ],
    },
    {
      id: "launcher-14",
      type: "mcq",
      level: 2,
      topics: ["TypeScript", "Platform Differences"],
      files: ["src/shared/components/ui/icon-symbol.tsx", "src/shared/components/ui/icon-symbol.ios.tsx"],
      prompt:
        "`icon-symbol.tsx` (the Android/web fallback) declares `const MAPPING = { \"house.fill\": \"home\", … } as const satisfies IconMapping;` and `type IconSymbolName = keyof typeof MAPPING;`. What does `as const satisfies IconMapping` buy over a plain `const MAPPING: IconMapping = {…}`?",
      choices: [
        "`as const` keeps the literal keys, so `IconSymbolName` is the exact union of mapped symbols. `satisfies` still checks that every key is a real `SFSymbol` and every value a real MaterialIcons name, without widening the type",
        "`satisfies` converts the object to `IconMapping`, so `IconSymbolName` becomes every SF Symbol and any name is accepted",
        "It is what makes Metro choose `icon-symbol.ios.tsx` on iOS",
        "`as const` calls `Object.freeze` at runtime so other projects can't mutate the mapping",
      ],
      answer: 0,
      explain:
        "`as const satisfies IconMapping` keeps the object's literal keys (so `keyof typeof MAPPING` is the exact union of mapped symbols) while `satisfies` still checks every key is a real SF Symbol and every value a real MaterialIcons name, without widening the type.\n\n- **Contrast:** annotating `: IconMapping` makes `keyof` the full SF Symbol set, so an unmapped name type-checks and renders a blank icon on Android.\n- **Not responsible for platform choice:** Metro picks `icon-symbol.ios.tsx` through `.ios.tsx` extension resolution.\n- **Build relevance:** this is the shared primitive that every project uses; making a bad icon name a compile error in `src/shared/` protects all of them (doc 00, Architecture, shared infra).\n- **How you arrive at it:** write the Android fallback in M1 and see what `keyof` gives you under each approach.",
      links: [
        { title: "TypeScript: the satisfies operator", url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html" },
        { title: "TypeScript: const assertions", url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html" },
        { title: "React Native: platform-specific code", url: "https://reactnative.dev/docs/platform-specific-code" },
      ],
    },
    {
      id: "launcher-15",
      type: "mcq",
      level: 2,
      topics: ["TanStack Query", "Platform Differences"],
      files: ["src/shared/providers/QueryProvider.tsx"],
      prompt:
        "Open `src/shared/providers/QueryProvider.tsx`. On iOS the user pulls down Control Center, which moves `AppState` to `\"inactive\"`, then dismisses it. With the `focusManager` wiring here, what happens?",
      choices: [
        "Focus becomes `false` while inactive (`setFocused(state === \"active\")`). When the state returns to `\"active\"`, mounted queries with stale data refetch",
        "Nothing: only `\"background\"` counts as losing focus, so `\"inactive\"` is ignored",
        "Every query refetches as soon as the state becomes `\"inactive\"`",
        "Nothing: `refetchOnWindowFocus` only works on the web, whatever the focus manager says",
      ],
      answer: 0,
      explain:
        "React Native has no window focus, so TanStack's browser default never fires. The provider reports focus as exactly `state === \"active\"`, so both `inactive` (iOS Control Center, multitasking view) and `background` count as unfocused. When the state returns to `active`, the `false` to `true` transition makes mounted queries with stale data refetch (`refetchOnWindowFocus` defaults to on).\n\n- **Why at the root:** `focusManager` is process-global. Wiring it once in the shared provider covers every project; doing it per project would register duplicate listeners.\n- **What breaks otherwise:** lists stay stale after returning to the app.\n- **How you arrive at it:** doc 00, rule 6 and Library hints. Compare `QueryProvider.tsx` with the TanStack React Native guide and the AppState state definitions.",
      links: [
        { title: "TanStack Query: React Native", url: "https://tanstack.com/query/latest/docs/framework/react/react-native" },
        { title: "TanStack Query: focusManager", url: "https://tanstack.com/query/latest/docs/reference/focusManager" },
        { title: "React Native: AppState", url: "https://reactnative.dev/docs/appstate" },
      ],
    },
    {
      id: "launcher-16",
      type: "order",
      level: 2,
      topics: ["TanStack Query", "React Hooks"],
      files: ["src/shared/providers/QueryProvider.tsx"],
      prompt:
        "A podcast list screen is mounted with data that is now stale. The user switches to another app, then comes back. Order what happens.",
      items: [
        "React Native's `AppState` emits `\"change\"` with `\"active\"`",
        "The listener passed to `focusManager.setEventListener` calls `setFocused(true)`",
        "`focusManager` tells the shared `QueryClient` that the app regained focus",
        "Mounted queries whose data is stale (with `refetchOnWindowFocus` left at its default) refetch in the background",
      ],
      explain:
        "The provider is the bridge between a platform event and TanStack's focus abstraction: `AppState` emits `active`, the listener calls `setFocused(true)`, `focusManager` notifies the shared `QueryClient`, and stale mounted queries refetch.\n\n- **Design consequence:** no screen listens to `AppState` itself. One `QueryClient` serves every project, so one wiring serves every project's lists.\n- **What does not refetch:** fresh queries still inside their `staleTime` (the store sets 60 s on `[\"store\", ...]` keys through `setQueryDefaults`).\n- **Failure mode:** a second `QueryClientProvider` would not break this wiring (managers are global) but its client would hold different data, which is why doc 00 rule 6 says mount exactly once.\n- **How you arrive at it:** read the guide's focus section, then trace the call chain in `QueryProvider.tsx` yourself.",
      links: [
        { title: "TanStack Query: React Native", url: "https://tanstack.com/query/latest/docs/framework/react/react-native" },
        { title: "TanStack Query: focusManager", url: "https://tanstack.com/query/latest/docs/reference/focusManager" },
        { title: "TanStack Query: important defaults", url: "https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults" },
      ],
    },
    {
      id: "launcher-17",
      type: "mcq",
      level: 2,
      topics: ["TanStack Query", "Offline & Sync"],
      files: ["src/shared/providers/QueryProvider.tsx"],
      prompt:
        "The `onlineManager` listener calls `setOnline(state.isConnected !== false)`. Right after launch, expo-network reports a state where `isConnected` is not yet known (`undefined`/`null`). What does TanStack Query treat the app as?",
      choices: [
        "Online: only an explicit `false` pauses queries, so an unknown state never freezes fetching",
        "Offline, because `undefined` is falsy",
        "Neither: the listener throws and the initial state is skipped",
        "Whatever the previous session's state was, restored from AsyncStorage",
      ],
      answer: 0,
      explain:
        "`!== false` is deliberately optimistic. TanStack pauses queries and mutations while `onlineManager` reports offline, so treating an unknown state (`undefined`/`null` right after launch) as offline would leave screens stuck paused. The initial `getNetworkStateAsync()` has an empty `.catch` for the same reason, and the live listener corrects the value once the OS knows.\n\n- **Build relevance:** this is shared, process-global wiring (doc 00, rule 6). Every project inherits it, including the offline-first journal and the store's `useIsOnline()` which reads the same manager.\n- **What breaks if you write `!!state.isConnected`:** a cold start with an unresolved state shows spinners that never fetch.\n- **How you arrive at it:** read the network mode guide, then the `NetworkState` fields in Expo Network docs to see which can be missing.",
      links: [
        { title: "TanStack Query: onlineManager", url: "https://tanstack.com/query/latest/docs/reference/onlineManager" },
        { title: "TanStack Query: network mode", url: "https://tanstack.com/query/latest/docs/framework/react/guides/network-mode" },
        { title: "Expo Network", url: "https://docs.expo.dev/versions/latest/sdk/network" },
      ],
    },
    {
      id: "launcher-18",
      type: "multi",
      level: 2,
      topics: ["TanStack Query", "Architecture"],
      files: ["src/shared/providers/QueryProvider.tsx", "src/projects/store/query/storeQuery.ts"],
      prompt:
        "Select all statements that are true of `src/shared/providers/QueryProvider.tsx` as written.",
      choices: [
        "It exports `queryClient`, so a slice can attach its own persister or defaults without a second provider (the store's `storeQuery.ts` does this)",
        "It maps TanStack focus to `AppState` and online status to expo-network",
        "It skips that wiring on web, where TanStack's default browser focus/online detection already works",
        "It assigns the client to `window.__TANSTACK_QUERY_CLIENT__` for DevTools",
        "It persists the entire cache, for all projects, to AsyncStorage",
        "It sets a global 60-second `staleTime` default for every query in the app",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "The shared provider is intentionally thin: one exported `queryClient` plus process-global wiring that must run exactly once. Persistence and defaults are **owned by the store slice**: `startStorePersistence()` limits `shouldDehydrateQuery` to `[\"store\", ...]` keys, and `setQueryDefaults(queryKeys.all, { staleTime: 60_000 })` matches by key prefix.\n\n- **Why export the client:** a slice can attach a persister or defaults without mounting a second provider (a second cache).\n- **What breaks if the shared file did it:** a global 60 s `staleTime` or whole-cache AsyncStorage persistence would change and leak every other project's data.\n- **Guideline:** doc 00 rule 3, each project owns its query keys, stores and endpoints; `shared` stays small (rule 2).\n- **How you arrive at it:** write the provider in M1, then notice the store needs persistence and ask where that code belongs.",
      links: [
        { title: "TanStack Query: persistQueryClient", url: "https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient" },
        { title: "TanStack Query: React Native", url: "https://tanstack.com/query/latest/docs/framework/react/react-native" },
        { title: "TanStack Query: query keys", url: "https://tanstack.com/query/latest/docs/framework/react/guides/query-keys" },
      ],
    },
    {
      id: "launcher-19",
      type: "explain",
      level: 2,
      topics: ["TanStack Query", "Architecture"],
      files: [
        "src/shared/providers/QueryProvider.tsx",
        "src/projects/store/utils/queryKeys.ts",
        "src/projects/podcast-player/utils/queryKeys.ts",
        "src/projects/podcast-player/utils/invalidate.ts",
      ],
      prompt:
        "The repo mounts exactly **one** `QueryProvider` (at the root) and requires every project to prefix its query keys with its own root (`[\"store\", …]`, `[\"podcast\", …]`). Explain what would break if (a) a project mounted a second `QueryClientProvider` in its own layout, and (b) the podcast project used unprefixed keys like `[\"show\", id]`.",
      model:
        "One provider means one cache. A second `QueryClientProvider` creates an independent cache: data fetched on one side of the boundary is invisible on the other. The restructure doc notes the store's login screen sat outside the tab layout, so it would have refetched everything. Worse, non-React code imports the module singleton directly (`podcast-player/utils/invalidate.ts`, the store's `cartSync.ts`). Its invalidations would hit the root client while screens under the nested provider read a different one through `useQueryClient()`, so they would never refresh. Prefixes matter because TanStack matches keys by prefix. `invalidateQueries({ queryKey: podcastKeys.all })`, the store's `setQueryDefaults(queryKeys.all, …)`, its persister's `isStoreKey` filter and its logout cleanup all depend on the root segment. Unprefixed keys could collide across projects, and blanket invalidations, defaults or persistence would leak into, or miss, another project's data.",
      rubric: [
        "A second provider creates a separate cache, so data fetched under one is invisible under the other",
        "Mentions the divergence between the imported `queryClient` singleton (used by non-React code) and `useQueryClient()` under a nested provider",
        "Explains that key matching is by prefix, which invalidation, `setQueryDefaults` and persistence filters rely on",
        "Unprefixed keys risk cross-project collisions or leaking defaults, persistence and invalidation",
      ],
      explain:
        "A second `QueryClientProvider` is a second cache, so what one side fetches the other cannot see. Non-React code imports the module singleton directly, so its invalidations would hit the root client while screens under the nested provider read a different one. Unprefixed keys fail for a different reason: TanStack matches keys by prefix, and invalidation, `setQueryDefaults`, persistence filters and logout cleanup all depend on the root segment.\n\n- **Doc 00 connection:** Failure modes #8 (\"A second QueryProvider\") and rule 3 (each project owns prefixed keys). The store's login sits outside its tab layout, which is exactly where a second client would hide data.\n- **How you arrive at it:** do the Failure modes exercise: mount a provider in a project layout, then watch an `invalidateQueries` from `invalidate.ts` do nothing.",
      links: [
        { title: "TanStack Query: query invalidation", url: "https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation" },
        { title: "TanStack Query: query keys", url: "https://tanstack.com/query/latest/docs/framework/react/guides/query-keys" },
        { title: "TanStack Query: QueryClientProvider", url: "https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider" },
      ],
    },
    {
      id: "launcher-20",
      type: "explain",
      level: 2,
      topics: ["Axios / API", "Auth & Security", "Architecture"],
      files: ["src/shared/api/axios.ts", "src/projects/store/api/client.ts", "src/projects/podcast-player/api/index.api.ts"],
      prompt:
        "`src/shared/api/axios.ts` sets only a timeout and a JSON header: no `baseURL` and no interceptors. Projects call `sharedAxios.create({ baseURL })`. Explain why, and what would go wrong if someone installed the store's 401-refresh interceptors on the **shared** instance instead of on `storeApi`.",
      model:
        "The shared instance holds project-agnostic defaults only. Calling `.create()` on an axios instance merges its config (timeout, headers) into a new instance, but that instance gets its **own fresh** interceptor managers. So each project's auth logic stays attached to that project's requests. If the store's interceptors lived on the shared instance, two things go wrong. First, the derived instances (`storeApi`, `backendApi`) would not inherit them, because interceptors aren't copied by `create()`, so the store's refresh would silently stop working. Second, any code calling the shared instance directly would attach the store's bearer token to third-party hosts like iTunes or podcast feeds, and a 401 from them would trigger the store's refresh and sign-out. The store also keeps `authApi` interceptor-free on purpose, so a failing refresh can never recurse into another refresh.",
      rubric: [
        "Shared instance = defaults only; each project derives its own instance with its own `baseURL`",
        "`create()` inherits config but gets a new, empty interceptor chain (interceptors are not copied)",
        "Risk of leaking the store's token to other hosts, or another project's 401s triggering store refresh/sign-out",
        "Mentions that `authApi` has no interceptors, to avoid refresh recursion",
      ],
      explain:
        "`axios.create()` copies defaults (timeout, headers) into a new instance with its own interceptor chain. The shared instance therefore holds only project-agnostic defaults, and each project derives one with its own `baseURL` and installs its own interceptors.\n\n- **What breaks if the store's refresh interceptors sat on the shared instance:** derived instances would not inherit them, so the store's refresh silently stops; and any code using the shared instance directly could send the store's bearer token to third-party hosts, with their 401s triggering the store's sign-out.\n- **Extra detail:** `authApi` is left interceptor-free so a failing refresh cannot recurse.\n- **Doc 00 connection:** rule 3 and Library hints. Isolation applies to HTTP too.\n- **How you arrive at it:** read `axios.ts` and `store/api/client.ts`, then try attaching an interceptor to the shared instance and call a podcast endpoint.",
      links: [
        { title: "Axios: instances and interceptors", url: "https://github.com/axios/axios/blob/v1.x/README.md" },
      ],
    },
    {
      id: "launcher-21",
      type: "mcq",
      level: 2,
      topics: ["Expo Config & EAS", "TypeScript"],
      files: ["src/shared/constants/env.ts", "app.config.ts"],
      prompt:
        "In `src/shared/constants/env.ts`, most fields use `??` (for example `extra.storeApiUrl ?? \"https://fakestoreapi.com\"`), but one uses `||`: `journalSyncUrl: extra.journalSyncUrl || LOCAL_DEV_SERVER`. Why the difference?",
      choices: [
        "`app.config.ts` writes `journalSyncUrl: process.env.JOURNAL_SYNC_URL ?? \"\"`, so an unset variable arrives as an empty string. `??` would keep `\"\"`, while `||` falls back to the local dev server",
        "`||` is faster than `??` in Hermes",
        "`journalSyncUrl` can be `0`, and `??` doesn't treat `0` as missing",
        "It is a typo. `??` and `||` behave identically for strings",
      ],
      answer: 0,
      explain:
        "`??` falls back only on `null`/`undefined`; `||` falls back on any falsy value including `\"\"`. `app.config.ts` writes `process.env.JOURNAL_SYNC_URL ?? \"\"`, so an unset variable arrives as an empty string, and `env.ts` uses `||` to turn that into the local dev server. The host (`localhost` or `10.0.2.2`) can only be chosen at runtime.\n\n- **What breaks with `??` here:** the journal would try to sync to the empty string and fail with a malformed-URL error.\n- **Build relevance:** doc 00 puts `env.ts` in `src/shared/constants/` so every project reads config through one typed module, and secrets stay in EAS variables.\n- **How you arrive at it:** compare how `app.config.ts` fills `extra` with how `env.ts` reads it, and test each operator with an empty string.",
      links: [
        { title: "Expo: environment variables", url: "https://docs.expo.dev/guides/environment-variables" },
        { title: "Expo: app config", url: "https://docs.expo.dev/workflow/configuration" },
      ],
    },
    {
      id: "launcher-22",
      type: "order",
      level: 2,
      topics: ["Expo Config & EAS"],
      files: ["eas.json", "app.config.ts", "src/shared/constants/env.ts"],
      prompt:
        "Trace how the **preview** variant reaches running code. Put the steps in order.",
      items: [
        "`eas build --profile preview` selects the `preview` profile in `eas.json`",
        "That profile's `env` sets `APP_VARIANT=preview` for the build",
        "`app.config.ts` evaluates `VARIANTS[\"preview\"]`: bundle id suffix `.preview`, name `WNRN (Beta)`, `extra.variant: \"preview\"`",
        "The resolved config, `extra` included, is embedded into the native binary",
        "At runtime `env.ts` reads `Constants.expoConfig.extra` and exposes `env.variant === \"preview\"`",
      ],
      explain:
        "`app.config.ts` is a dynamic config that runs in Node at build time and can read `process.env`. EAS injects the selected profile's `env`, so one config yields three side-by-side installable apps. `extra` is the bridge to runtime: expo-constants exposes the embedded config and `env.ts` adds types and fallbacks.\n\n- **Build relevance:** doc 00 lists `APP_VARIANT` and the environment variables as part of the Expo configuration; the variant also feeds the bundle id and thus the fingerprint, so every `eas update` must set the matching `APP_VARIANT`.\n- **What breaks otherwise:** publish an update without `APP_VARIANT` and it computes the development runtime version, so preview builds never receive it.\n- **How you arrive at it:** follow the tutorial on app variants and trace one variable from `eas.json` to `env.ts`.",
      links: [
        { title: "Expo tutorial: multiple app variants", url: "https://docs.expo.dev/tutorial/eas/multiple-app-variants" },
        { title: "Expo: environment variables", url: "https://docs.expo.dev/guides/environment-variables" },
        { title: "Expo Constants", url: "https://docs.expo.dev/versions/latest/sdk/constants" },
      ],
    },
    {
      id: "launcher-23",
      type: "text",
      level: 2,
      topics: ["Expo Config & EAS"],
      files: ["app.config.ts", "eas.json"],
      prompt:
        "Using `app.config.ts`, type the full iOS bundle identifier (Android package) produced by the **preview** EAS profile.",
      accept: ["org.imaginativeworld.whynotreactnative.preview"],
      explain:
        "`bundleId` is the base id plus the variant's `idSuffix` (`.dev`, `.preview`, or empty). Distinct identifiers let development, preview and production install side by side, each with its own display name and API. The App Group string stays the same across variants.\n\n- **What breaks if suffixes were missing:** installing a preview build would overwrite the production app (and its data) on the same device.\n- **Build relevance:** the bundle id feeds the runtime-version fingerprint, so an `eas update` must run with the matching `APP_VARIANT` (doc 00 builds on the same config described in AGENTS.md).\n- **How you arrive at it:** open the `VARIANTS` table and compute the id for `preview` by hand before checking `eas.json` to see which profile selects it.",
      links: [
        { title: "Expo tutorial: multiple app variants", url: "https://docs.expo.dev/tutorial/eas/multiple-app-variants" },
      ],
    },
    {
      id: "launcher-24",
      type: "multi",
      level: 2,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: ["eas.json"],
      prompt: "Open `eas.json`. Select all that apply.",
      choices: [
        "`development` builds a dev client (`developmentClient: true`) for the iOS **simulator**, distributed internally on channel `development`",
        "`development-device` extends `development` but builds for a physical iPhone",
        "`preview` builds an Android **APK** (sideloadable) instead of the default AAB",
        "`production` auto-increments the build number, and `cli.appVersionSource: \"remote\"` means EAS stores that number",
        "`preview` sets `developmentClient: true` so testers get the dev menu",
        "All profiles publish to a single channel named `main`",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "`extends` lets `development-device` inherit `development` and override only `ios.simulator`. `preview` is a release-like internal build (APK, no dev client) so testers see production behaviour. Each profile has its own `channel`, which is how EAS Update routes an update to the right builds. `appVersionSource: \"remote\"` plus `autoIncrement` stops build-number collisions without committing version bumps.\n\n- **False options:** `preview` does not enable `developmentClient`, and channels are not shared (`main`).\n- **What breaks otherwise:** a shared channel would send an experimental update to production users.\n- **Build relevance:** `eas.json` is part of the Expo configuration the whole launcher repo builds with; every project ships through these profiles.\n- **How you arrive at it:** open `eas.json` and map each profile to who installs it.",
      links: [
        { title: "Expo development builds", url: "https://docs.expo.dev/develop/development-builds/introduction" },
        { title: "EAS Build: app versions", url: "https://docs.expo.dev/build-reference/app-versions" },
        { title: "Expo tutorial: multiple app variants", url: "https://docs.expo.dev/tutorial/eas/multiple-app-variants" },
      ],
    },
    {
      id: "launcher-25",
      type: "text",
      level: 2,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: ["app.config.ts"],
      prompt:
        "Open `app.config.ts` and find how `runtimeVersion` is set. Check the Expo docs for the list of policies, then type the one this repo uses.",
      accept: ["fingerprint", "policy: fingerprint", "{ policy: \"fingerprint\" }"],
      explain:
        "`runtimeVersion: { policy: \"fingerprint\" }` derives the runtime version from a hash of everything that affects the native build. EAS Update only serves an update to binaries with a matching runtime version, so a JS bundle cannot land on a binary missing the native code it calls.\n\n- **Why not a hand-written string:** someone eventually forgets to bump it after adding a native module or plugin, and the next OTA update crashes older installs.\n- **Gotcha:** the bundle id feeds the fingerprint, so `eas update` and `eas fingerprint:*` must run with the matching `APP_VARIANT`.\n- **How you arrive at it:** read the runtime-versions guide for the available policies, then check which one `app.config.ts` selects; Project 05's release pipeline relies on it.",
      links: [
        { title: "EAS Update: runtime versions", url: "https://docs.expo.dev/eas-update/runtime-versions" },
        { title: "Expo Updates", url: "https://docs.expo.dev/versions/latest/sdk/updates" },
        { title: "EAS Update: binary compatibility", url: "https://docs.expo.dev/build/updates" },
      ],
    },
    {
      id: "launcher-26",
      type: "mcq",
      level: 2,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: ["app.config.ts"],
      prompt:
        "`app.config.ts` sets `updates: { url: \"https://u.expo.dev/<projectId>\", checkAutomatically: \"ON_LOAD\", fallbackToCacheTimeout: 0 }`. On a cold launch, when a newer compatible update exists on the channel, what does the user see?",
      choices: [
        "The app starts immediately with the bundle it already has (embedded or previously downloaded). The new update downloads in the background and runs on the **next** cold start",
        "The splash screen stays up until the update finishes downloading, then the new bundle launches",
        "Nothing changes until the app calls `checkForUpdateAsync()`, because automatic checks are off",
        "The new bundle hot-reloads into the running session as soon as it finishes downloading",
      ],
      answer: 0,
      explain:
        "`ON_LOAD` checks for an update on every launch, and `fallbackToCacheTimeout: 0` means \"wait 0 ms for a new update before using the cached bundle\". So the app starts at once with what it has; the new update downloads in the background and takes effect on the **next** cold start.\n\n- **Trade-off:** launches never block on the network, but fixes arrive one launch late. Project 05 adds a foreground check and a \"Restart\" banner (`fetchUpdateAsync` then `reloadAsync`) when you need them sooner.\n- **What breaks the other way:** a non-zero timeout can hold the splash on a bad connection.\n- **How you arrive at it:** doc 00 puts `updates.url` and channels in the Expo configuration; read the Updates SDK description of the two options and trace what `app.config.ts` sets.",
      links: [
        { title: "Expo Updates", url: "https://docs.expo.dev/versions/latest/sdk/updates" },
      ],
    },
    {
      id: "launcher-27",
      type: "multi",
      level: 2,
      topics: ["Performance", "Platform Differences", "SQLite"],
      files: ["metro.config.js", "declarations.d.ts"],
      prompt: "Open `metro.config.js` (and `declarations.d.ts`). Select all that apply.",
      choices: [
        "`svg` is removed from `assetExts` and added to `sourceExts`, so `react-native-svg-transformer` turns `.svg` imports into React components",
        "`declarations.d.ts` declares `*.svg` modules as `React.FC<SvgProps>` so TypeScript accepts those imports",
        "`wasm` is added as an asset extension for expo-sqlite on the web",
        "The dev server adds COEP/COOP headers so the browser allows `SharedArrayBuffer`, which expo-sqlite's web build needs",
        "Metro is configured to block imports from one `src/projects/<slug>/` into another",
        "The `@/` path alias is defined here with a custom resolver",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "A file extension is either an asset (copied and referenced by URL) or a source file (transformed to JS). Moving `svg` from `assetExts` to `sourceExts` makes `react-native-svg-transformer` turn `.svg` imports into components, and `declarations.d.ts` keeps `tsc` in step with Metro. The `wasm` asset extension and COEP/COOP headers exist only for expo-sqlite on web, which needs `SharedArrayBuffer`.\n\n- **False options:** Metro does not block cross-project imports, and the `@/` alias comes from tsconfig `paths`, not from a resolver here.\n- **Build relevance:** doc 00 rule 1 says isolation is enforced by ESLint, because no bundler or compiler setting does it.\n- **What breaks otherwise:** `.svg` imports resolve to asset ids on native, and the journal on web fails to load SQLite.\n- **How you arrive at it:** run `npx expo export` after adding an SVG with and without this config.",
      links: [
        { title: "Expo: customizing Metro", url: "https://docs.expo.dev/guides/customizing-metro" },
        { title: "Expo SQLite (web setup)", url: "https://docs.expo.dev/versions/latest/sdk/sqlite" },
        { title: "react-native-svg-transformer", url: "https://github.com/kristerkari/react-native-svg-transformer" },
        { title: "Expo Router: server headers", url: "https://docs.expo.dev/router/web/server-headers" },
      ],
    },
    {
      id: "launcher-28",
      type: "text",
      level: 2,
      topics: ["Background Tasks"],
      files: [
        "src/projects/offline-journal/sync/task.ts",
        "src/projects/podcast-player/downloads/task.ts",
        "src/projects/fitness-tracker/tracking/task.ts",
      ],
      prompt:
        "Open the three task modules the root layout imports and look at the line just before `TaskManager.defineTask(...)`. Type the `TaskManager` function used in that guard.",
      accept: ["isTaskDefined", "TaskManager.isTaskDefined", /^(TaskManager\.)?isTaskDefined\s*(\(.*\))?$/i],
      explain:
        "`if (!TaskManager.isTaskDefined(NAME)) TaskManager.defineTask(NAME, ...)` makes a module safe to evaluate more than once (fast refresh, a second import path). Defining attaches the JS handler for this process; registering (`BackgroundTask.registerTaskAsync`, `Location.startLocationUpdatesAsync`) asks the OS to schedule it and persists across launches. Do not confuse it with `isTaskRegisteredAsync`.\n\n- **Build relevance:** three projects need this guard and all three are imported from the root layout (doc 00, \"Root-level side effects\").\n- **What breaks otherwise:** redefining on every reload can throw or replace a running handler.\n- **How you arrive at it:** read one `task.ts` header, then the TaskManager API list for the function that checks definition.",
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager" },
      ],
    },

    // ---------------------------------------------------------------- Level 3
    {
      id: "launcher-29",
      type: "explain",
      level: 3,
      topics: ["Background Tasks", "Architecture"],
      files: [
        "src/app/_layout.tsx",
        "src/projects/offline-journal/sync/task.ts",
        "src/projects/fitness-tracker/tracking/task.ts",
        "src/projects/podcast-player/downloads/task.ts",
      ],
      prompt:
        "Each `defineTask` lives in its project's slice, yet `src/app/_layout.tsx` imports all three task modules. Explain why importing them **only** from the project's own `_layout.tsx` silently breaks background work, why it is so easy to miss, and why the task must be defined at module scope rather than inside a component or effect.",
      model:
        "When the OS wakes the app for background work (a scheduled background task, or new locations for the fitness tracker), it may start the JS bundle headless: no UI, no navigation, nobody opening a project. The entry evaluates the root layout module, but a project's `_layout.tsx` is only evaluated when the user navigates into that project. TaskManager looks up the handler by name at that moment, and if nothing defined it, the work is dropped. It is easy to miss because in the foreground the user has usually opened the project already, so the task is defined and everything works during development. The bug only shows up as \"nothing recorded in the background\". Defining it inside a component or effect has the same flaw, since components never mount headless, so `defineTask` must run while the module is evaluated. Importing the module from the root guarantees that on every launch.",
      rubric: [
        "Headless relaunch: the OS starts JS with no UI, and only the entry/root layout is evaluated",
        "Project layouts load only when the user opens that project, so the task is undefined headless",
        "Bug hides in foreground testing because the project was already opened",
        "`defineTask` must run at module evaluation, not inside a component or effect",
      ],
      explain:
        "When the OS wakes the app for background work it may start JS headless: the entry evaluates the root layout, but a project's `_layout.tsx` only evaluates when the user opens that project. TaskManager looks the handler up by name at that moment; if nothing defined it, the work is dropped. It hides during development because you usually opened the project first.\n\n- **Why module scope:** `defineTask` must run while the bundle evaluates; components and effects never mount headless.\n- **Real incident:** this bug hit three projects in a row in this repo (see `.agents/lessons/_learned.md`). The checklist: grep `defineTask` and confirm the root imports it.\n- **Doc 00 connection:** \"Root-level side effects\" and Failure modes #9.\n- **How you arrive at it:** do #9 deliberately: move one import into a project layout, kill the app, trigger the task headless, and see nothing run.",
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager" },
        { title: "Apple: BackgroundTasks", url: "https://developer.apple.com/documentation/backgroundtasks" },
      ],
    },
    {
      id: "launcher-30",
      type: "mcq",
      level: 3,
      topics: ["Notifications", "Architecture"],
      files: [
        "src/app/_layout.tsx",
        "src/projects/offline-journal/reminders/handlers.ts",
        "src/projects/store/notifications/handlers.ts",
      ],
      prompt:
        "`setNotificationHandler` (foreground presentation) is process-global. The journal's `reminders/handlers.ts` calls it at **module scope**. The store's `installNotificationHandler()` also calls it, and is invoked from `startNotificationResponseListener()`. Given the order of things in `src/app/_layout.tsx`, which handler is in effect once the root module has evaluated?",
      choices: [
        "The store's: every notification shows as banner + list, with sound and badge only for payloads that parse as store notifications",
        "The journal's, because its module is imported first and `setNotificationHandler` keeps the first registration",
        "Both: expo-notifications runs each registered handler and merges their results",
        "Neither until the user opens the store, because the store's handler is only installed from the store's own layout",
      ],
      answer: 0,
      explain:
        "Imports are evaluated before the importing module body. The journal's top-level `setNotificationHandler` runs during import, then the root body calls `startNotificationResponseListener()`, which calls `installNotificationHandler()` and **replaces** it. That is intended: the store's handler is a superset that still shows journal reminders.\n\n- **Why it matters:** `setNotificationHandler` is process-global, so whichever project installs it from the root must handle every project's payloads. Hence the `project` discriminator on payloads (doc 00, Failure modes #11).\n- **What breaks otherwise:** a handler that only knows its own payloads would suppress other projects' notifications or play the wrong sound/badge.\n- **How you arrive at it:** read the import order in `_layout.tsx`, then both handlers; the docs state only one handler can be active.",
      links: [
        { title: "Expo Notifications", url: "https://docs.expo.dev/versions/latest/sdk/notifications" },
        { title: "Apple: UNUserNotificationCenterDelegate", url: "https://developer.apple.com/documentation/usernotifications/unusernotificationcenterdelegate" },
      ],
      hint: "Imports run first, top to bottom. Then the module body runs. A later `setNotificationHandler` call replaces an earlier one.",
    },
    {
      id: "launcher-31",
      type: "order",
      level: 3,
      topics: ["Notifications", "Expo Router", "Deep Linking"],
      files: ["src/app/_layout.tsx", "src/projects/offline-journal/reminders/handlers.ts"],
      prompt:
        "The app is killed. The user taps a journal reminder whose data is `{ url: \"/projects/offline-journal/entry/compose\" }`. Order what happens until the compose screen appears.",
      items: [
        "The OS launches the app and keeps the tap as the last notification response",
        "Evaluating the root layout's imports runs the journal module's top-level `setNotificationHandler`",
        "The root module body calls `startJournalNotificationRouting()`, which reads `getLastNotificationResponse()` synchronously",
        "The URL starts with `/projects/offline-journal/`, so it clears the last response and calls `router.push(url)`, which expo-router queues because no navigator exists yet",
        "`RootLayout` renders once fonts load and the root `Stack` mounts",
        "The queued navigation is replayed and the journal layout mounts on the compose route",
      ],
      explain:
        "The routing starter must be at the root because on a cold start the launcher opens first, the journal layout never mounts, and a listener inside it would never see the tap. `startJournalNotificationRouting()` reads `getLastNotificationResponse()` synchronously, accepts only URLs under `/projects/offline-journal/` (notification data is untrusted), clears the response so later launches do not reopen compose, and pushes the URL. expo-router queues navigations issued before the navigator exists and replays them.\n\n- **What breaks otherwise:** a tap is lost, or compose reopens on every launch.\n- **Doc 00 connection:** \"Root-level side effects\" and the namespaced deep links under `/projects/<slug>/...`.\n- **How you arrive at it:** work through the cold-start case on paper: what is mounted when the process starts?",
      links: [
        { title: "Expo Notifications", url: "https://docs.expo.dev/versions/latest/sdk/notifications" },
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
      ],
    },
    {
      id: "launcher-32",
      type: "explain",
      level: 3,
      topics: ["Notifications", "Architecture", "Auth & Security"],
      files: [
        "src/projects/store/notifications/handlers.ts",
        "src/projects/offline-journal/reminders/handlers.ts",
        "src/projects/store/navigation/pendingIntent.ts",
        "src/app/_layout.tsx",
      ],
      prompt:
        "Both notification starters are called from the root and both handle taps from a single process-global listener API. Explain: (1) how each avoids routing the **same** tap twice on a cold start, (2) how each avoids acting on **another project's** payload, (3) why the store buffers the href instead of navigating directly, and (4) why push **permission** is not requested at the root.",
      model:
        "(1) On a cold start the same response can arrive through both `getLastNotificationResponse()` and the response listener. Each module keeps a `handledResponses` set keyed by `identifier:actionIdentifier` and skips repeats, and both clear the last response so later launches don't replay it. (2) Payloads carry a project discriminator. The journal only follows `data.url` values starting with `/projects/offline-journal/`. The store only acts when `parseNotificationData` / `hrefFromNotification` recognise a store payload, and otherwise returns early. (3) When a tap arrives, the store's session may still be loading and its `(app)` navigator may not be mounted. So `handleResponse` calls `setPendingIntent(href)` (a Zustand buffer). If the store isn't on screen, it does `router.navigate(STORE_PREFIX)`, and the `(app)` layout replays the intent once the session has resolved. (4) A permission prompt on first launch, before the user has even opened the store, is bad UX. Push tokens are also tied to a signed-in account, so `usePushLifecycle(signedIn)` registers from the store's session. The root only listens.",
      rubric: [
        "Dedupes with a `handledResponses` set keyed by notification identifier + action, and clears the last response",
        "Filters by project discriminator (journal URL prefix / store payload parsing) and ignores others",
        "Store parks the href in the `pendingIntent` buffer because the session/navigator may not be ready, and navigates to the store prefix",
        "Permission and token registration are session-scoped (signed-in store), not a launch-time prompt",
      ],
      explain:
        "Both starters share process-global APIs, so each makes itself idempotent and selective.\n\n- **Dedupe:** a cold-start response can arrive via `getLastNotificationResponse()` and the listener; each keeps a `handledResponses` set keyed by identifier and action, and clears the last response.\n- **Filtering:** the journal follows only URLs under its prefix; the store acts only on payloads it can parse.\n- **Buffering:** the store parks the href with `setPendingIntent` because its session and `(app)` navigator may not be ready, then navigates to its prefix and the `(app)` layout replays it.\n- **Permission:** tied to a signed-in session (`usePushLifecycle`), not a first-launch prompt.\n\n**Doc 00 connection:** the root only listens; each project owns permission and parsing (Failure modes #11). **How you arrive at it:** read both handlers side by side and note what each skips.",
      links: [
        { title: "Expo Notifications", url: "https://docs.expo.dev/versions/latest/sdk/notifications" },
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager" },
      ],
    },
    {
      id: "launcher-33",
      type: "text",
      level: 3,
      topics: ["Deep Linking", "Expo Router"],
      files: ["src/app/+native-intent.tsx"],
      prompt:
        "Open `src/app/+native-intent.tsx` and find its exported function. Check the Expo Router native-intent page to confirm it is the hook called with `{ path, initial }`, then type its name.",
      accept: ["redirectSystemPath", /^redirectSystemPath\s*(\(.*\))?$/i],
      explain:
        "`redirectSystemPath` is expo-router's native-intent hook. It runs before route resolution for every system URL (universal links, scheme opens, the iOS share extension callback). Here it walks pure per-project rewriters and returns the first match, otherwise the original path, wrapped in `try/catch` so a malformed URL cannot crash startup.\n\n- **Why it lives at the root:** the launcher owns `/`, so each project's external URL shapes (`/p/<id>`, `/order/<id>`, `/post/<id>`) must be mapped onto `/projects/<slug>/...` in one place (doc 00, Routing strategy).\n- **What breaks otherwise:** a universal link lands on `+not-found`.\n- **Design choice:** rewriters stay in each slice so they can be unit-tested.\n- **How you arrive at it:** M4 adds `+native-intent.tsx` with an empty rewriter list.",
      links: [
        { title: "Expo Router: +native-intent", url: "https://docs.expo.dev/router/advanced/native-intent" },
        { title: "Expo: iOS universal links", url: "https://docs.expo.dev/linking/ios-universal-links" },
      ],
    },
    {
      id: "launcher-34",
      type: "mcq",
      level: 3,
      topics: ["Deep Linking", "Auth & Security"],
      files: [
        "src/app/+native-intent.tsx",
        "src/projects/store/navigation/linkRoutes.ts",
        "src/projects/camera-social/utils/linkRewrite.ts",
      ],
      prompt:
        "`redirectSystemPath` receives `path = \"https://evil.example/p/42\"` (not the configured `env.linkDomain`). Trace both rewriters. What is returned?",
      choices: [
        "The original path, unchanged: both rewriters compare the host to `linkDomain` and return `null`, so expo-router falls back to its own matching (ending at `+not-found`)",
        "`/projects/store/product/42`, because `storeHrefFromWebPath` only looks at the path segments",
        "`/projects/camera-social/share-inbound`, because the camera rewriter runs first and claims any https URL",
        "Nothing: the regex throws on the unknown host and the app crashes during launch",
      ],
      answer: 0,
      explain:
        "Both rewriters extract the host and return `null` unless it equals `env.linkDomain` (case-insensitive), so `https://evil.example/p/42` falls through unchanged and expo-router ends at `+not-found`. The store only calls `storeHrefFromWebPath` after the host check; the camera rewriter only claims `dataUrl=` or `/post/<id>` paths. The loop is wrapped in `try/catch` so malformed input never crashes launch.\n\n- **Security lesson:** treat incoming URLs as untrusted input. The OS also restricts universal links to verified domains, but the rewriters do not rely on that.\n- **What breaks otherwise:** an unchecked host would let any URL deep-link into store screens.\n- **Doc 00 connection:** Routing strategy, `+native-intent`.\n- **How you arrive at it:** read each rewriter and feed it a hostile path by hand.",
      links: [
        { title: "Expo Router: +native-intent", url: "https://docs.expo.dev/router/advanced/native-intent" },
        { title: "Expo: iOS universal links", url: "https://docs.expo.dev/linking/ios-universal-links" },
        { title: "Apple: supporting associated domains", url: "https://developer.apple.com/documentation/xcode/supporting-associated-domains" },
      ],
    },
    {
      id: "launcher-35",
      type: "mcq",
      level: 3,
      topics: ["React Hooks", "Media", "Platform Differences"],
      files: ["src/app/_layout.tsx", "src/projects/camera-social/hooks/useInboundShareRouting.ts"],
      prompt:
        "`src/app/_layout.tsx` defines `function ShareIntentRouting() { useInboundShareRouting(); return null; }` and renders it next to the `Stack`. Why not just call `useInboundShareRouting()` at the top of `RootLayout`?",
      choices: [
        "The hook reads `useShareIntentContext()`, which needs an ancestor `ShareIntentProvider`, but `RootLayout` is the component that **renders** that provider, so its own body sits above it",
        "The React Compiler forbids calling hooks in layout components",
        "So camera-social code is only loaded when a share actually arrives",
        "So `RootLayout` doesn't re-render on every pathname change, purely as a performance optimisation",
      ],
      answer: 0,
      explain:
        "Context flows from a provider to its **descendants**; a component cannot consume a provider it renders itself. `RootLayout` renders `ShareIntentProvider`, so a hook called in its own body has no provider above it. A tiny render-nothing child placed inside the provider fixes it.\n\n- **Why at the root at all:** a share can arrive while the user is anywhere, the launcher included (doc 00, \"Root-level side effects\"). The iOS extension's `dataUrl=` URL is rewritten by `rewriteCameraSocialPath`; on Android a share is an Intent, so `+native-intent` never sees it.\n- **What breaks otherwise:** the hook throws or reads an empty context.\n- **How you arrive at it:** move the hook call up one level and read the error.",
      links: [
        { title: "React: passing data deeply with context", url: "https://react.dev/learn/passing-data-deeply-with-context" },
        { title: "React: useContext", url: "https://react.dev/reference/react/useContext" },
        { title: "Expo Router: +native-intent", url: "https://docs.expo.dev/router/advanced/native-intent" },
      ],
    },
    {
      id: "launcher-36",
      type: "mcq",
      level: 3,
      topics: ["Expo Router", "Release & CI"],
      files: ["src/app/_layout.tsx", "package.json", "AGENTS.md"],
      prompt:
        "`package.json` no longer lists any `@react-navigation/*` package, yet the root layout still uses `ThemeProvider` and `DarkTheme`. A teammate writes `import { useHeaderHeight } from \"@react-navigation/elements\";` in a new screen. What happens, and where should the import come from?",
      choices: [
        "`npm run typecheck` fails with \"Cannot find module\" and lint reports `import/no-unresolved`, because nothing under that name is installed any more. The import belongs to `expo-router/react-navigation`, which ships React Navigation inside expo-router",
        "It works, because expo-router re-exports every `@react-navigation/*` package name through Metro aliases",
        "tsc and lint pass, and only `npx expo export` fails at bundle time",
        "It works, but a second NavigationContainer is created and the screen shows two headers",
      ],
      answer: 0,
      explain:
        "Since SDK 56, expo-router bundles React Navigation as `expo-router/react-navigation`. The old `@react-navigation/*` entries were template leftovers, so they were removed from `package.json`; the import now fails type-checking (\"Cannot find module\") and lint. While they were installed it passed `tsc` and lint and failed only when Metro bundled, which is why AGENTS.md says a milestone is done only when both `expo export` platforms pass.\n\n- **Lesson:** removing unused packages turns a late bundle failure into an early type error.\n- **Doc 00 connection:** Routing strategy warnings, Failure modes #7, and M5 which runs the bundle export.\n- **How you arrive at it:** do the failure mode yourself and compare when each tool complains.",
      links: [
        { title: "Expo Router: core concepts", url: "https://docs.expo.dev/router/basics/core-concepts" },
        { title: "Expo: TypeScript", url: "https://docs.expo.dev/guides/typescript" },
      ],
    },
    {
      id: "launcher-37",
      type: "mcq",
      level: 3,
      topics: ["Architecture", "TypeScript"],
      files: ["eslint.config.js", "tsconfig.json", "AGENTS.md"],
      prompt:
        "AGENTS.md's first isolation rule: nothing in `src/projects/camera-social/` may import from `src/projects/store/`. Look at `eslint.config.js`. If someone writes `import { formatMoney } from \"@/src/projects/store/utils/money\"` inside camera-social, what catches it?",
      choices: [
        "`npm run lint`: `eslint.config.js` builds one `no-restricted-imports` block per folder in `src/projects/`, and each block rejects `@/src/(app/)?projects/<other slug>` and `../<other slug>/` imports for files in that slice",
        "`tsconfig.json` `paths` only exposes `@/src/shared/*` to project code, so `tsc` fails",
        "Metro refuses to resolve imports between sibling folders under `src/projects/`",
        "`eslint-config-expo` includes an `import/no-cycle` rule that flags any cross-slice import",
      ],
      answer: 0,
      explain:
        "The alias maps `@/*` to the whole repo, so `tsc` and Metro resolve the import happily. Only ESLint catches it: `eslint.config.js` reads the slug folders with `fs.readdirSync`, emits one `no-restricted-imports` block per slice (alias form and relative form), and adds a block that keeps `src/shared/` from importing any project. A negative lookahead lets a slice still import its own files; `src/app/_layout.tsx` and `+native-intent.tsx` sit outside every slice glob, which is why the composition root may import each project.\n\n- **Failure without it:** isolation is a convention in a doc, so a convenient `formatMoney` import couples two projects until one is deleted.\n- **Doc 00 connection:** Rules, rule 1, and M5.\n- **How you arrive at it:** do M5's proof: import across slices and read the lint error.",
      links: [
        { title: "ESLint: no-restricted-imports", url: "https://eslint.org/docs/latest/rules/no-restricted-imports" },
        { title: "ESLint: configuration files", url: "https://eslint.org/docs/latest/use/configure/configuration-files" },
        { title: "Expo: using ESLint", url: "https://docs.expo.dev/guides/using-eslint" },
      ],
    },
    {
      id: "launcher-38",
      type: "multi",
      level: 3,
      topics: ["Expo Config & EAS", "Deep Linking", "Auth & Security"],
      files: ["app.config.ts", "docs/well-known"],
      prompt: "Read the `ios` and `android` blocks of `app.config.ts`. Select all that apply.",
      choices: [
        "`associatedDomains: [\"applinks:<LINK_DOMAIN>\"]` enables iOS universal links, which also requires an AASA file served from that domain",
        "`com.apple.security.application-groups` adds a shared App Group so extensions (the share extension, the workout widget) can share data with the app",
        "`privacyManifests` declares the required-reason API categories the app itself uses (UserDefaults, file timestamps, disk space, boot time) with their reason codes",
        "Android `intentFilters` with `autoVerify: true` verify App Links for `/p/`, `/order/` and `/post/` on the link domain",
        "The bundle identifier is the same across variants so they share the App Group automatically",
        "`newArchEnabled: true` is set in the `ios` block to turn on the New Architecture",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "Universal links and App Links are two-sided: the app declares the domain and the domain vouches for the app (templates in `docs/well-known`). `com.apple.security.application-groups` shares data with extensions; `privacyManifests` declares required-reason API use; Android `autoVerify` intent filters verify `/p/`, `/order/` and `/post/`.\n\n- **False options:** the App Group string is identical across variants but bundle ids differ (`.dev`, `.preview`), and there is no `newArchEnabled` flag since the New Architecture is the default in SDK 57.\n- **What breaks otherwise:** without the AASA file universal links open Safari; without privacy manifests the App Store rejects the upload.\n- **Doc 00 connection:** deep links are namespaced and rewritten in `+native-intent` (Routing strategy); this config is what delivers those URLs to the app.\n- **How you arrive at it:** read each platform's linking guide and match it to the config.",
      links: [
        { title: "Expo: iOS universal links", url: "https://docs.expo.dev/linking/ios-universal-links" },
        { title: "Expo: Android App Links", url: "https://docs.expo.dev/linking/android-app-links" },
        { title: "Apple: supporting associated domains", url: "https://developer.apple.com/documentation/xcode/supporting-associated-domains" },
        { title: "Apple: configuring app groups", url: "https://developer.apple.com/documentation/xcode/configuring-app-groups" },
        { title: "Apple: privacy manifest files", url: "https://developer.apple.com/documentation/bundleresources/privacy-manifest-files" },
        { title: "Apple: required reason API", url: "https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api" },
      ],
    },
    {
      id: "launcher-39",
      type: "explain",
      level: 3,
      topics: ["Config Plugins", "Expo Config & EAS"],
      files: ["app.config.ts", "plugins/withSceneLifecycle.js"],
      prompt:
        "In `app.config.ts`, `./plugins/withSceneLifecycle` is listed **first**, and `./plugins/withWorkoutCapabilities` is listed **before** `expo-share-intent`. Explain the mod-ordering rule that makes both placements deliberate, what broke before the second fix, and how you would verify plugin output without a device. (Since `/ios` and `/android` are gitignored, why is this the only place such changes can live?)",
      model:
        "Each plugin wraps the config's mod chain, so mods registered by **later** plugins run **first** and earlier plugins run last. `withSceneLifecycle` is listed first so its `withAppDelegate` edit runs after every other plugin has touched the AppDelegate. It removes the window-creation block and throws if it doesn't recognise the result, so it has to see the final file. `withWorkoutCapabilities` is listed before `expo-share-intent` so it runs **after** it. expo-share-intent prepends the App Group without deduping, and when the fitness plugin ran first it couldn't clean that up, which produced a duplicate App Group entitlement. To verify: run `npx expo prebuild --platform ios --no-install --clean` and inspect the output (then restore the `ios` script prebuild rewrites in package.json), or test mods in memory with `compileModsAsync(config, { introspect: true })`. Under Continuous Native Generation the native folders are build output regenerated by prebuild, so any native change must be expressed in `app.config.ts`, a config plugin or a local module, or it is lost on the next `--clean`.",
      rubric: [
        "States the rule: later plugins' mods run first, so listing a plugin earlier makes it run later",
        "Explains `withSceneLifecycle` running last on the AppDelegate",
        "Explains the App Group dedupe after expo-share-intent and the duplicate-entitlement bug",
        "Verification via `expo prebuild --no-install --clean` or `compileModsAsync` introspection",
        "CNG: `/ios` and `/android` are regenerated output, so native changes must live in config/plugins",
      ],
      explain:
        "Each plugin wraps the mod chain, so mods from **later** plugins run **first**. `withSceneLifecycle` is listed first so its AppDelegate edit runs last, after every other plugin has touched the file, and it throws if the result is not recognised. `withWorkoutCapabilities` is listed before `expo-share-intent` so it runs **after** it and can dedupe the App Group that expo-share-intent prepends; when the order was reversed the entitlement was duplicated.\n\n- **Verification:** `npx expo prebuild --platform ios --no-install --clean` and inspect, or `compileModsAsync(config, { introspect: true })` in a node-environment test.\n- **Why config only:** `/ios` and `/android` are gitignored build output (CNG), so native changes must live in `app.config.ts`, a plugin or a local module.\n- **Doc 00 connection:** Architecture notes `plugins/` and `modules/` at the repo root for this reason. **How you arrive at it:** run prebuild with the order swapped.",
      links: [
        { title: "Config plugins: chaining", url: "https://docs.expo.dev/config-plugins/plugins" },
        { title: "Config plugins: debugging", url: "https://docs.expo.dev/config-plugins/development-and-debugging" },
        { title: "Continuous Native Generation", url: "https://docs.expo.dev/workflow/continuous-native-generation" },
      ],
    },
    {
      id: "launcher-40",
      type: "explain",
      level: 3,
      topics: ["Expo Config & EAS", "Release & CI", "Native Modules"],
      files: ["app.config.ts", "eas.json"],
      prompt:
        "`app.config.ts` uses `runtimeVersion: { policy: \"fingerprint\" }`, and each EAS build profile has its own `channel`. Explain what a runtime version protects against in EAS Update, what would happen if a JS update calling a newly added native module were delivered to an older binary, why `fingerprint` beats a hand-maintained version, and what channels add on top.",
      model:
        "An OTA update replaces only the JS bundle and assets. The native binary stays the same. The runtime version is the compatibility contract: EAS Update serves an update only to builds whose runtime version matches the one it was published for. If a bundle that calls a newly added native module reached an older binary, the native side wouldn't exist, so the app would throw or crash at launch with a missing native module, and every user on that binary would be hit until a fix shipped. The `fingerprint` policy hashes the inputs that shape the native build (native dependencies, config plugins, native config), so adding a module or plugin changes the runtime version automatically. With a hand-written version, someone eventually forgets to bump it. Channels add routing: each build is tied to `development`, `preview` or `production`, so an update published for preview testers can't reach production users even when their runtime versions match.",
      rubric: [
        "Updates replace JS only, and the runtime version gates which binaries can receive an update",
        "Mismatch scenario: JS calls missing native code, leading to a crash or failure at launch",
        "Fingerprint is computed from native-affecting inputs, so it changes automatically (no forgotten manual bump)",
        "Channels route updates per build profile (development / preview / production)",
      ],
      explain:
        "An OTA update replaces only JS and assets; the binary stays. The runtime version is the compatibility contract: EAS serves an update only to builds with a matching value. A bundle calling a native module an older binary lacks would crash or fail at launch for every user on that binary. `fingerprint` hashes native-affecting inputs, so adding a module or plugin changes it automatically. Channels add routing: each build profile maps to `development`, `preview` or `production`, so a preview update cannot reach production users.\n\n- **Gotcha:** the bundle id feeds the fingerprint, so publish with the matching `APP_VARIANT`.\n- **Doc 00 connection:** the Expo configuration the whole launcher builds with; Project 05's release runbook relies on it.\n- **How you arrive at it:** read the runtime version guide and ask what a mismatch would do.",
      links: [
        { title: "EAS Update: runtime versions", url: "https://docs.expo.dev/eas-update/runtime-versions" },
        { title: "EAS Update: binary compatibility", url: "https://docs.expo.dev/build/updates" },
        { title: "Expo Updates", url: "https://docs.expo.dev/versions/latest/sdk/updates" },
      ],
    },
  ],
});

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
        "Both the launcher (`PROJECTS.map(... <ProjectListItem ...>)` in `src/app/index.tsx`) and the root Stack (`PROJECTS.map(({ slug, singleScreen }) => <Stack.Screen ...>)` in `src/app/_layout.tsx`) are generated from the registry, so neither file knows any project by name. Editing them by hand is exactly what the registry exists to avoid. `extra` is for per-environment values, and expo-router has no linking map to fill in: routes come from the file tree.",
      hint: "Look for `.map(` in both files. What array do they map over?",
    },
    {
      id: "launcher-02",
      type: "text",
      level: 1,
      topics: ["Architecture", "TypeScript"],
      files: ["src/shared/config/projects.ts"],
      prompt:
        "Open `src/shared/config/projects.ts`. Type the name of the exported **constant** that both the launcher screen and the root layout map over.",
      accept: ["PROJECTS", "export const PROJECTS"],
      explain:
        "`PROJECTS: Project[]` is the single source of truth for the launcher. Each entry carries a `slug` (used as the React key and to build root `Stack.Screen` names), a typed `route: Href`, and an optional `singleScreen` flag. Data-driven navigation like this keeps the composition root free of hardcoded project knowledge.",
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
        "Expo Router derives routes from the file tree, not from `Stack.Screen` declarations. Leaving a file undeclared only gives it a path-derived title. The restructure doc records this exact failure: the profile sheet lived under `src/app/` and crashed when its URL was opened outside the `BottomSheetModalProvider`. That is why non-route components must live in `src/projects/<slug>/` or `src/shared/`, and why tests never go under `src/app/`.",
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
        "Nested navigators each draw their own header. `projects/<slug>` points at the project's `_layout.tsx` (for example the journal's `JournalStack`), which owns its inner Stack, titles and tint colors. Hiding the outer header leaves one header per screen. The single-file tic-tac-toe route has no inner Stack, so it keeps the root header.",
    },
    {
      id: "launcher-05",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Expo Config & EAS"],
      files: ["package.json"],
      prompt:
        "There is no `App.tsx` or `index.js` in this repo. Open `package.json` and type the value of the `main` field, which is the module that boots the app and hands over to the `src/app/` file tree.",
      accept: ["expo-router/entry"],
      explain:
        "`\"main\": \"expo-router/entry\"` makes expo-router the entry point. It registers the root component and builds the navigation tree from `src/app/`. Because this entry evaluates `src/app/_layout.tsx` on every launch, headless ones included, the root layout is where module-scope side effects such as task definitions must live.",
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
        "Providers wrap everything that consumes them. `QueryProvider` is outermost, so every route and the share-routing hook share one cache. `ShareIntentProvider` sits above the navigator so `ShareIntentRouting` (rendered next to the `Stack`) can read the share context. `GestureHandlerRootView` with `flex: 1` wraps the whole navigator so gestures work on every screen, and `ThemeProvider` hands the navigator a light or dark theme.",
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
        "RNGH attaches its native gesture system at the `GestureHandlerRootView`. Gesture components outside one don't receive touches. The launcher itself imports `ScrollView` from `react-native-gesture-handler`, so the root needs it even before any project opens. `flex: 1` matters: without it the root view collapses to zero height. Safe-area insets come from `SafeAreaProvider`, and Reanimated is initialised by the `import \"react-native-reanimated\"` line at the top of the file.",
    },
    {
      id: "launcher-08",
      type: "text",
      level: 1,
      topics: ["Expo Router"],
      files: ["src/app/_layout.tsx"],
      prompt:
        "The root layout needs `ThemeProvider`, `DarkTheme` and `DefaultTheme`, but this repo must never import `@react-navigation/*`. Type the exact module specifier the root layout imports them from.",
      accept: ["expo-router/react-navigation"],
      explain:
        "Since SDK 56, expo-router ships its own fork of React Navigation and fails the **bundle** if app code imports `@react-navigation/*`. The supported entry point is `expo-router/react-navigation`. Store and journal screens import `useHeaderHeight` from there too. Navigation hooks such as `useIsFocused` and `useFocusEffect` come from `expo-router` itself.",
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
        "The component is dumb and reusable: plain props in, no store and no assumptions about which project renders it. Its defaults come from `useThemeColor({}, \"text\")` / `\"icon\"`, which read the **device** color scheme through `use-color-scheme`, not the navigation theme, so wrapping it in a `ThemeProvider` changes nothing. The optional overrides (and `action.color` / `action.labelColor`) let a fixed-palette screen opt out without forking the component.",
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
        "The three task imports are side-effect-only (`import \"…/task\"`): evaluating them runs `TaskManager.defineTask`. The two notification starters only **listen** and route. Push permission is requested from the store's signed-in session (`usePushLifecycle`), never at the root. The journal's database is opened by `SQLiteProvider` in its own layout, or lazily by `getDb()` from the sync task, not by the root.",
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
        "`paths: { \"@/*\": [\"./*\"] }` points at the root, which is why every import starts `@/src/...`. Expo's Metro reads tsconfig `paths`, so the alias works at runtime too. With `types` set explicitly, only the listed `@types` packages load. The preset is `jest-expo`, which mocks Expo modules. `include` is `**/*.ts`, `**/*.tsx`, `.expo/types/**/*.ts` and `expo-env.d.ts`, so `app.config.ts` and the typed-routes declarations are both checked.",
    },
    {
      id: "launcher-12",
      type: "text",
      level: 1,
      topics: ["Platform Differences", "Expo Config & EAS"],
      files: ["src/shared/constants/env.ts"],
      prompt:
        "Open `src/shared/constants/env.ts`. When no journal sync URL is configured, the app falls back to a dev server on the host machine. Type the **IP address** used for that fallback on the Android emulator.",
      accept: ["10.0.2.2", "10.0.2.2:3000", "http://10.0.2.2:3000"],
      explain:
        "`localhost` inside the Android emulator is the emulator itself. `10.0.2.2` is its alias for the host machine's loopback. The iOS simulator shares the host's network stack, so `localhost` works there. The choice depends on `Platform.OS` at runtime, which is why it lives in `env.ts` and not in `app.config.ts`: that file runs once on your computer at build time, with no idea which device will run the app.",
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
        "When no `title` is set, the native stack falls back to the route's name, which here is the full `projects/tic-tac-toe/index`. The registry is plain data the navigator never sees, which is why the root destructures `title` in `PROJECTS.map(({ slug, title, singleScreen }) => ...)` and passes it through. Expo Router has **no** route-level `options` export: the restructure doc records a splash screen whose `export const options` was silently ignored. Supported ways are the parent's `Stack.Screen options` (used here), an inline `<Stack.Screen options>` inside the route (see `+not-found.tsx`'s `title: \"Oops!\"`), or `navigation.setOptions()`.",
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
        "With an annotation (`: IconMapping`), the variable's type would be the wide `Partial<Record<SFSymbol, …>>`, and `keyof` would allow any SF Symbol, including ones with no Material equivalent. `satisfies` validates the value against the type but keeps the inferred narrow type. So a caller passing an unmapped name gets a compile error instead of a blank icon on Android. Platform selection is Metro's `.ios.tsx` extension resolution, and `as const` is purely a type-level assertion.",
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
        "React Native has no `window` focus events, so TanStack's default focus detection never fires on a device. The provider replaces it with an `AppState` listener and reports focus as exactly `state === \"active\"`, so both `inactive` and `background` count as unfocused. The `false` to `true` transition is what triggers `refetchOnWindowFocus` (on by default) for stale queries. The listener returns `sub.remove()` so TanStack can unsubscribe.",
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
        "This is the bridge `QueryProvider.tsx` builds between a platform event and TanStack's focus abstraction. Nothing inside a screen has to listen to `AppState`. The global manager drives every project's queries, because one `QueryClient` serves the whole app. Fresh queries, still inside their `staleTime` (the store sets 60 s on `[\"store\", …]` via `setQueryDefaults`), are not refetched.",
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
        "`!== false` is deliberately optimistic. TanStack pauses queries and mutations while `onlineManager` says offline, so wrongly reporting \"offline\" on an unknown state would leave screens stuck in a paused state. The initial `getNetworkStateAsync()` has an empty `.catch` for the same reason. The live `addNetworkStateListener` subscription then corrects the value as soon as the OS knows. The store's `useIsOnline()` reads this same manager through `useSyncExternalStore`.",
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
        "The provider is deliberately thin: one client plus process-global wiring that must happen exactly once. Persistence and defaults are **store-owned**. `startStorePersistence()` calls `persistQueryClient` with `shouldDehydrateQuery` limited to `[\"store\", …]` keys. `setQueryDefaults(queryKeys.all, { staleTime: 60_000, … })` matches by key prefix, so it only affects store queries. Putting those in the shared provider would change every other project's behaviour.",
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
        "The shared client is exported precisely so slices never need their own provider (`QueryProvider.tsx` comment: \"without mounting a second provider (a second cache)\"). Each project's key factory documents the prefix rule at its top, for example `store/utils/queryKeys.ts`: 'Every key starts with `store` because one QueryClient is shared by every project'.",
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
        "See the header comment in `src/projects/store/api/client.ts` (\"`create` on an instance inherits its timeout and headers but gets its own interceptor chain\"). The podcast slice derives `itunesApi` and a base-less `feedApi` from the same defaults. Isolating side effects per instance is the HTTP-layer version of the repo's \"no cross-project leakage\" rule.",
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
        "`??` only falls back on `null`/`undefined`. `||` falls back on any falsy value, including `\"\"`. The config deliberately bakes `\"\"` to mean \"use the local server\" (see the comment next to `journalSyncUrl` in `app.config.ts`), because the right host (`localhost` or `10.0.2.2`) can only be decided at runtime. Choosing between `??` and `||` on purpose is a small but real source of config bugs.",
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
        "`app.config.ts` is a dynamic config: it runs in Node at build time and can read `process.env`. EAS injects the profile's `env`, so one config produces three side-by-side installable apps. `extra` is the bridge to runtime: expo-constants exposes the embedded config, and `env.ts` gives it types and fallbacks so no project hardcodes URLs.",
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
        "`bundleId` is `BASE_ID` plus `variant.idSuffix`, with suffix `.dev` / `.preview` / `\"\"`. Different identifiers are what let dev, beta and production install side by side on one device, each with its own name (`WNRN (Dev)`, `WNRN (Beta)`) and API. The App Group string stays the same for all variants.",
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
        "`extends` lets `development-device` inherit everything and override only `ios.simulator`. Preview is a release-like internal build (no dev client) so testers see production behaviour. Each profile has its own `channel` (`development` / `preview` / `production`), which is how EAS Update routes an update to the right builds. `appVersionSource: \"remote\"` plus `autoIncrement` stops build-number collisions without committing version bumps.",
    },
    {
      id: "launcher-25",
      type: "text",
      level: 2,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: ["app.config.ts"],
      prompt:
        "In `app.config.ts`, `runtimeVersion` is set with a policy rather than a hardcoded string. Type the policy name.",
      accept: ["fingerprint", "policy: fingerprint", "{ policy: \"fingerprint\" }"],
      explain:
        "`runtimeVersion: { policy: \"fingerprint\" }` derives the runtime version from a hash of everything that affects the native build. EAS Update only serves an update to binaries with the same runtime version, so a JS bundle can never land on a binary missing the native code it needs, and nobody has to remember to bump a version by hand.",
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
        "`ON_LOAD` checks on every launch. `fallbackToCacheTimeout: 0` means \"wait 0 ms for a new update before falling back to the cached one\", so launches never block on the network. The trade-off is that an update takes effect one launch later. Project 05's `src/projects/podcast-player/lib/updates.ts` adds a foreground check and a \"Restart\" banner (`fetchUpdateAsync`, then `reloadAsync` on tap) when fixes need to land sooner.",
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
        "A file extension is either an asset (copied, referenced by URL) or a source file (transformed into JS). Moving `svg` changes which pipeline it takes, and the `.d.ts` keeps `tsc` in step with Metro. The `wasm` and header changes exist only for expo-sqlite on web: browsers expose `SharedArrayBuffer` only to cross-origin-isolated pages. The alias comes from `tsconfig.json` `paths`, which Expo's Metro reads, and nothing in this config enforces project isolation.",
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
        "All three task modules the root layout imports wrap `TaskManager.defineTask(...)` in the same guard. Type the `TaskManager` function used in that guard.",
      accept: ["isTaskDefined", "TaskManager.isTaskDefined", /^(TaskManager\.)?isTaskDefined\s*(\(.*\))?$/i],
      explain:
        "`if (!TaskManager.isTaskDefined(NAME)) TaskManager.defineTask(NAME, …)` makes the module safe to evaluate more than once, for example on fast refresh or a second import path. Don't confuse it with `isTaskRegisteredAsync`. Defining attaches the JS handler for this process. Registering (`BackgroundTask.registerTaskAsync`, `Location.startLocationUpdatesAsync`) asks the OS to schedule it, and that persists across launches.",
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
        "The task modules all say this in their header comments (\"MODULE SCOPE. The OS relaunches your app headless…\"), and `.agents/lessons/_learned.md` records the same bug hitting three projects in a row. The checklist for new projects: grep `defineTask` and confirm the root imports it.",
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
        "ES module imports are all evaluated before the importing module's body runs. The journal module's top-level `setNotificationHandler` runs during import. Then the root body calls `startNotificationResponseListener()` → `installNotificationHandler()` → `setNotificationHandler(...)`, which **replaces** the journal's handler. That is intended: the store's handler is a superset that still shows journal reminders (and every other project's notifications). Because only one handler can exist per process, whichever project installs it from the root has to handle everyone's payloads, not just its own. Read the comment on `installNotificationHandler` for how the code documents this.",
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
        "This is why the routing starter lives at the root: on a cold start the launcher opens first and the journal layout never mounts, so a listener inside it would never see the tap. The prefix check treats notification data as untrusted input and ignores other projects' payloads. Clearing the last response stops every later launch from reopening compose. Expo-router's routing queue holds navigations issued before the root navigator is ready (see the comment in `open()`).",
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
        "Read `handleResponse` and `startNotificationResponseListener` in the store's `handlers.ts`, and `open` / `startJournalNotificationRouting` in the journal's. Process-global native APIs (notifications, share intents, TanStack managers) are the main places where \"isolated\" projects still have to cooperate, and a discriminator plus idempotent starters is the pattern used here.",
    },
    {
      id: "launcher-33",
      type: "text",
      level: 3,
      topics: ["Deep Linking", "Expo Router"],
      files: ["src/app/+native-intent.tsx"],
      prompt:
        "Open `src/app/+native-intent.tsx`. Type the name of the exported function that expo-router calls with `{ path, initial }` to rewrite an incoming system URL before matching a route.",
      accept: ["redirectSystemPath", /^redirectSystemPath\s*(\(.*\))?$/i],
      explain:
        "`redirectSystemPath` is expo-router's native-intent hook. It runs before route resolution for every system URL (universal links, custom scheme opens, the iOS share extension's callback). Here it walks a list of pure per-project rewriters (`rewriteCameraSocialPath`, `rewriteStoreSystemPath`) and returns the first non-null match, otherwise the original path.",
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
        "`rewriteStoreSystemPath` and `rewriteCameraSocialPath` both extract the host with `/^https?:\\/\\/([^/?#]+)…/` and return `null` when it doesn't match `linkDomain` (case-insensitive). Only after that check does the store call `storeHrefFromWebPath`. The camera rewriter only claims `dataUrl=` paths or `/post/<id>`. The whole loop is also wrapped in `try/catch` so a malformed URL can never crash startup. In practice the OS wouldn't even route a foreign domain here, because universal links need `associatedDomains` / verified `intentFilters`, but the rewriters don't rely on that.",
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
        "Context flows down from a provider to its **descendants**. A component cannot consume a provider it renders itself. Splitting out a tiny render-nothing child placed inside `ShareIntentProvider` is the standard fix. The hook itself is mounted at the root because a share can arrive while the user is anywhere. On Android a share is an Intent, not a URL, so `+native-intent` never sees it. The iOS extension's `dataUrl=` URL **is** rewritten by `rewriteCameraSocialPath`.",
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
        "Since SDK 56, expo-router bundles its own copy of React Navigation and exposes it as `expo-router/react-navigation` (root code takes `ThemeProvider`, `DarkTheme` and `DefaultTheme` from it, and the store's checkout uses its `useHeaderHeight`). The old `@react-navigation/*` entries in `package.json` were template leftovers that nothing imported, so they were removed. While they were still installed, the same mistake passed `tsc` and lint and only failed when Metro bundled it: expo-router rejects `@react-navigation/*` imports at bundle time. That's why AGENTS.md says a milestone is only done once **both** `expo export` platforms pass, and calls the bundle check the thing that \"catches what tsc can't\". Removing unused packages turns a late bundle failure into an early type error.",
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
        "The alias maps `@/*` to the whole repo, so `tsc` and Metro would happily resolve the import. The rule is enforced by ESLint alone. `eslint.config.js` reads the slug folders with `fs.readdirSync`, so a new project is covered automatically, and a separate block stops `src/shared/` from importing any project. The regex uses a negative lookahead (`projects/(?!<slug>(/|$))`), so a slice can still import its own files through the alias. `src/app/_layout.tsx` and `+native-intent.tsx` sit outside every slice glob, which leaves them free to compose projects. Until this rule existed, isolation was only a convention in a doc. Knowing which rules a tool actually enforces tells you where review attention has to go.",
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
        "Universal links and App Links are two-sided: the app declares the domain, and the domain must vouch for the app (templates in `docs/well-known`). The App Group string is identical across variants, but the bundle ids differ (`.dev`, `.preview`), so that statement is false. There is no `newArchEnabled` flag: the New Architecture is the default in SDK 57. `ITSAppUsesNonExemptEncryption: false` in `infoPlist` also skips the export-compliance question on upload.",
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
        "The ordering comments sit right above both entries in `app.config.ts`, and `.agents/lessons/_learned.md` (\"Config-plugin order matters, inversely\") records the duplicate-entitlement incident. AGENTS.md's CNG section adds two cautions: prebuild rewrites the `ios` script (restore that one line, never `git checkout package.json`), and back up a local `android/` before `--clean`.",
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
        "`updates.url` points at `https://u.expo.dev/<EAS_PROJECT_ID>`, and the channel comes from the `eas.json` profile at build time. Together they decide which update a given install can receive. Project 05's release runbook (`docs/release-05.md`) builds rollouts and rollbacks on this contract.",
    },
  ],
});

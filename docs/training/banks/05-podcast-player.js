QUIZ.register({
  slug: "podcast-player",
  number: "05",
  title: "Podcast player & release pipeline",
  doc: "../05-podcast-player.html",
  summary:
    "Trains the code behind a production-grade audio app: an expo-audio singleton outside React, interruption handling, throttled progress, the SQLite-backed queue and download manager (snapshots, backoff, Wi-Fi rule, storage cap), RSS parsing, and the EAS release pipeline (fingerprint runtime versions, channels and branches, CI, OTA safety, Maestro).",
  questions: [
    // ------------------------------------------------------------ Level 1
    {
      id: "podcast-player-01",
      type: "mcq",
      level: 1,
      topics: ["Media", "Architecture"],
      files: [
        "src/projects/podcast-player/playback/service.ts",
        "src/app/projects/podcast-player/_layout.tsx",
      ],
      prompt:
        "Open `playback/service.ts`. The app has exactly one `AudioPlayer`, created with `createAudioPlayer()` inside a module-scope `PlaybackService` instance (`playbackService`), not with a hook inside a screen.\n\nWhat is the main reason for this design?\n\nSearch: grep the project for `createAudioPlayer` and `useAudioPlayer`. Who holds a reference to the `AudioPlayer`?",
      choices: [
        "The singleton lives at module scope and outlives every screen, so navigating anywhere (even back to the launcher) never unmounts the player or stops the audio",
        "expo-audio's hooks don't work with the New Architecture, so `createAudioPlayer()` is the only API that works",
        "Expo Router layouts can't call hooks, so the player had to move out of React",
        "A singleton lets every screen create its own `AudioPlayer` without the players fighting over the audio session",
      ],
      answer: 0,
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
      ],
      explain:
        "A player owned by a component is released when that component unmounts, and a podcast has to keep playing while you browse, background the app or leave for the launcher. So `service.ts` creates one `AudioPlayer` with `createAudioPlayer()` inside a module-scope `PlaybackService`. UI code only sends commands (`playbackService.play()`, `.toggle()`, `.seekTo()`), and status flows back through `usePlayerStore`.\n\nIf you skipped this and used `useAudioPlayer` in a screen, the first failure mode in the doc's pitfalls list appears: navigate away and the audio stops. The same singleton idea shapes the whole app: the mini-player host, the lock-screen metadata and the progress writer all talk to this one object.\n\nSee the doc's **Architecture** section (\"The player must live outside React\") and failure mode 1 under **Failure modes**.",
    },
    {
      id: "podcast-player-02",
      type: "mcq",
      level: 1,
      topics: ["SQLite", "Architecture"],
      files: [
        "src/projects/podcast-player/db/client.ts",
        "src/projects/podcast-player/downloads/manager.ts",
      ],
      prompt:
        "The journal and camera projects open SQLite with `<SQLiteProvider onInit>` in their layouts. The podcast project instead uses a lazily created module-scope `getDb()` in `db/client.ts`.\n\nWhy?\n\nSearch: open `db/client.ts`, then grep for `getDb(` across the slice. Which callers have no React tree above them?",
      choices: [
        "Its main users (the playback service, the download manager and the background task) run outside the React tree, so they can't call `useSQLiteContext()`",
        "`SQLiteProvider` doesn't support WAL mode, which the podcast schema needs",
        "Only one `SQLiteProvider` can be mounted per app, and the journal already uses it",
        "`openDatabaseAsync` is faster than `SQLiteProvider`'s `onInit` for large databases",
      ],
      answer: 0,
      links: [
        { title: "expo-sqlite (SQLiteProvider, PRAGMA)", url: "https://docs.expo.dev/versions/latest/sdk/sqlite" },
      ],
      explain:
        "A provider only helps code that renders under it. `PlaybackService` and `DownloadManager` are plain classes, and the background task can run with no screen mounted, so they all call `getDb()`, which opens the file once, runs `migrate()` and caches the promise. If opening fails, the cache is cleared (`dbPromise = null`) so the next call can retry.\n\nThe design decision is to let module-scope services own their data access instead of threading a provider through them. The failure mode otherwise: a headless background run would have no way to reach the database, or you would end up opening several connections with competing migrations. WAL is enabled by `migrate()` itself, and several projects mount their own providers, so the other options are false.\n\nThe doc covers this under **Architecture decisions** (\"Lazy database instead of a provider\") and the data model table in **Architecture**.",
    },
    {
      id: "podcast-player-03",
      type: "text",
      level: 1,
      topics: ["SQLite"],
      files: ["src/projects/podcast-player/db/schema.ts"],
      prompt:
        "In `db/schema.ts`, `migrate()` reads a SQLite pragma to find out which entries of `MIGRATIONS` have already run, and sets it after each step. Which pragma is it? (Type its name.)\n\nSearch: read `migrate()` in `db/schema.ts`. Which SQL statement does it run inside the transaction besides the migration SQL?",
      accept: ["user_version", "PRAGMA user_version", /user_version/i],
      links: [
        { title: "SQLite PRAGMA user_version", url: "https://www.sqlite.org/pragma.html#pragma_user_version" },
        { title: "expo-sqlite (SQLiteProvider, PRAGMA)", url: "https://docs.expo.dev/versions/latest/sdk/sqlite" },
      ],
      explain:
        "`PRAGMA user_version` is an integer SQLite stores in the database header and never uses itself, which makes it a convenient migration counter. `migrate()` loops `while (version < MIGRATIONS.length)` and runs each step inside `withTransactionAsync` together with `PRAGMA user_version = next`, so a crash mid-migration leaves the previous version intact.\n\nThe rule for the whole app: migrations only move forward. You append to the array and never edit an entry that has shipped, because installed databases already ran the old text. Editing a shipped step is the classic way to get devices whose schema silently differs from what your code expects.\n\nThe doc describes this in **Architecture**, under \"Data model (SQLite, one migration)\", and Milestone M1 asks you to build it.",
    },
    {
      id: "podcast-player-04",
      type: "text",
      level: 1,
      topics: ["TanStack Query", "Architecture"],
      files: [
        "src/projects/podcast-player/utils/queryKeys.ts",
        "src/shared/providers/QueryProvider.tsx",
      ],
      prompt:
        "Every key in `utils/queryKeys.ts` begins with the same first element. What is it? (Type the string.)\n\nSearch: open `utils/queryKeys.ts` and `src/shared/providers/QueryProvider.tsx`. Why does the provider file matter for this question?",
      accept: ["podcast", /^\[?\s*["']?podcast["']?\s*\]?$/i],
      links: [
        { title: "TanStack Query: query invalidation", url: "https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation" },
      ],
      explain:
        "Every key starts with `\"podcast\"` (`podcastKeys.all = [\"podcast\"]`). The app has one `QueryClient`, shared by every project and exported from `QueryProvider.tsx`, so keys are the only namespace there is. The prefix means a blanket `invalidateQueries({ queryKey: podcastKeys.all })` (used by `useSubscribe` and `useRefreshSubscriptions`) can never touch the store's or journal's cache. The store project applies the same idea to persist only keys that start with `\"store\"`.\n\nIf you named keys `[\"episodes\"]`, another project could eventually collide with you, and an invalidation in one would refetch data in the other.\n\nSee **Architecture** (\"Query keys and live state\") and the TanStack row in **Library hints**.",
    },
    {
      id: "podcast-player-05",
      type: "text",
      level: 1,
      topics: ["Media", "Testing"],
      files: [
        "src/projects/podcast-player/playback/queue.ts",
        "src/projects/podcast-player/__tests__/queue.test.ts",
      ],
      prompt:
        "The up-next queue holds episode ids `[a, b, c]`, in that order. Code calls `addNext(queue, \"c\")` from `playback/queue.ts`.\n\nType the resulting order of episode ids, comma-separated (for example `x, y, z`).\n\nSearch: open `addNext` in `playback/queue.ts` and trace it by hand, then confirm with the `addNext` cases in `__tests__/queue.test.ts`.",
      accept: [/^\[?\s*["']?c["']?\s*,\s*["']?a["']?\s*,\s*["']?b["']?\s*\]?$/i, "c a b", "cab"],
      hint: "Look at what `addNext` does to the existing entry before it prepends.",
      explain:
        "`addNext` returns `[{ episodeId, addedAt: now }, ...without(queue, episodeId)]`, so `c` moves to the front and is never duplicated. Every queue operation is pure, returns a new array and never produces duplicates, which is why `queue.test.ts` can cover them without a player. Compare `addLast`, which moves an existing entry to the end but keeps its original `addedAt`.\n\nThe design decision is a pure core with a thin I/O shell: `PlaybackService` persists and applies the result, but the rules live in a file Jest can import. Also note that the playing episode is never in the queue: `onStartPlaying` removes it, and `playNext`/`addToQueue` ignore the current id. Without that invariant you get an episode that plays and then plays again.\n\nSee Milestone M2 and **Architecture decisions** (\"Pure core, thin I/O shell\").",
    },
    {
      id: "podcast-player-06",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Architecture"],
      files: [
        "src/app/projects/podcast-player/_layout.tsx",
        "src/projects/podcast-player/containers/MiniPlayerHost.tsx",
        "src/projects/podcast-player/constants/layout.ts",
      ],
      prompt:
        "Where is `MiniPlayerHost` mounted, and what does that placement give you?\n\nSearch: open `src/app/projects/podcast-player/_layout.tsx`, then grep the repo for `MiniPlayerHost` to see every place it is mounted.",
      choices: [
        "It wraps the podcast project's `<Stack>` in `src/app/projects/podcast-player/_layout.tsx`, so it floats over every podcast screen (tabs, show, episode) and disappears when you back out to the launcher",
        "It's in the root `src/app/_layout.tsx`, so the mini player shows on every project in the app",
        "It's rendered as a tab-bar accessory inside `(tab)/_layout.tsx`, so it only appears on the four tabs",
        "Each screen renders its own `MiniPlayerHost` at the bottom of its content",
      ],
      answer: 0,
      links: [
        { title: "Expo Router: navigation layouts", url: "https://docs.expo.dev/router/basics/navigation-layouts" },
        { title: "Expo Router: typed routes and useSegments", url: "https://docs.expo.dev/router/reference/typed-routes" },
      ],
      explain:
        "The project layout renders `<MiniPlayerHost><Stack>…</Stack></MiniPlayerHost>`, which scopes the mini player to this project without the launcher knowing anything about it. Mounting it in the root layout would leave a podcast player floating over the store's checkout; mounting it per screen would remount it on every navigation.\n\nBecause it sits outside the tabs, it must know where the tab bar is. The tab layout fixes its height to `TAB_BAR_HEIGHT + insets.bottom` (shared via `constants/layout.ts`), and the host docks at that offset when `useSegments()` includes `(tab)`, otherwise just above the safe area. It hides itself while the `player` route is on top. The *service* survives regardless, which is why the host and the player are separate things.\n\nSee **Architecture** (the \"`MiniPlayerHost` mounts in your layout\" warning) and Milestone M4.",
    },
    {
      id: "podcast-player-07",
      type: "mcq",
      level: 1,
      topics: ["Zustand", "Architecture"],
      files: ["src/projects/podcast-player/stores/settingsStore.ts"],
      prompt:
        "User preferences (skip intervals, Wi-Fi only, storage cap, and so on) are kept in a Zustand store persisted to AsyncStorage, even though the project already has a SQLite database. Which reason matches the code?\n\nSearch: open `stores/settingsStore.ts` and grep for `getSettings(` to find the non-React callers and what they need from it.",
      choices: [
        "They're tiny, and the singletons need a synchronous read: `getSettings()` is just `useSettingsStore.getState()`, which works without awaiting a query once the store has hydrated",
        "SQLite can't store booleans, and most settings are booleans",
        "AsyncStorage is encrypted at rest, and settings count as sensitive data",
        "So settings are shared with the other projects through a common AsyncStorage key",
      ],
      answer: 0,
      links: [
        { title: "Zustand: persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" },
      ],
      explain:
        "The file comment gives the reasons: settings are tiny, read synchronously after hydration, and needed by the singletons. `PlaybackService.skipForward()` and `DownloadManager.pump()` call `getSettings()` inline, and an async SQLite read there would add awaits to every path.\n\nThe cost of a synchronous read is that it returns `DEFAULT_SETTINGS` until hydration finishes, so code that can run before any screen awaits `ensureSettingsHydrated()` first: the headless background task, and `PlaybackService.loadEpisode()` (it needs `defaultRate` for `resolveStartRate()`, and an episode loaded right after launch would otherwise start at the built-in default instead of the user's Default speed). Skip that and a background run ignores the user's Wi-Fi-only and storage-cap choices. `partialize` keeps the `update` function out of what is persisted, and the key `podcast-player/settings` is scoped to this project. AsyncStorage is not encrypted (that is expo-secure-store), and SQLite stores booleans as integers without trouble.\n\nThe doc explains this in **Architecture** (data model) and failure mode 10.",
    },
    {
      id: "podcast-player-08",
      type: "mcq",
      level: 1,
      topics: ["Testing", "Offline & Sync"],
      files: [
        "src/projects/podcast-player/feeds/parse.ts",
        "src/projects/podcast-player/__tests__/parse.test.ts",
      ],
      prompt:
        "The `XMLParser` in `feeds/parse.ts` is created with `parseTagValue: false` and `parseAttributeValue: false`. Why?\n\nSearch: read the `XMLParser` options in `feeds/parse.ts`, then look up `parseTagValue` in the fast-xml-parser options. What does the default do to `0042`?",
      choices: [
        "To keep every value as a string, so `0042` episode numbers and `1:02` durations aren't coerced to numbers. The code parses them deliberately with `toInt` and `parseDuration`",
        "To turn off entity decoding, so `&amp;` stays escaped in titles",
        "To force tags like `item` and `enclosure` to always be arrays",
        "To skip tag text for speed, since all feed data is read from attributes",
      ],
      answer: 0,
      links: [
        { title: "fast-xml-parser", url: "https://github.com/NaturalIntelligence/fast-xml-parser" },
      ],
      explain:
        "fast-xml-parser coerces numeric-looking text by default (`parseTagValue` is `true`). `0042` would become `42`, and some duration strings could be misread as numbers. Keeping strings and parsing later puts the defensive logic in one place: `toInt` and `parseDuration`, which accepts `3725`, `62:05`, `1:02:05`, garbage and so on.\n\nBuilding a feed parser is mostly about distrust. Real feeds have BOMs, missing durations and duplicate guids, so the parser returns strings and a pure function decides what they mean, backed by XML fixtures. Entity decoding is controlled by `processEntities`, and forcing arrays is done by `isArray` with `ARRAY_TAGS`; those are separate options.\n\nSee Milestone M1 and the feed-parsing row in **Library hints**.",
    },
    {
      id: "podcast-player-09",
      type: "text",
      level: 1,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: ["app.config.ts", "docs/05-release.html"],
      prompt:
        "Which `runtimeVersion` policy does `app.config.ts` use? (Type the policy name.)\n\nSearch: open `app.config.ts` and find the `runtimeVersion` key. Then read `docs/05-release.html` for what the policy hashes.",
      accept: ["fingerprint", /policy:\s*["']?fingerprint/i, /^\{?\s*policy\s*:\s*["']?fingerprint["']?\s*\}?$/i],
      links: [
        { title: "EAS Update: runtime versions", url: "https://docs.expo.dev/eas-update/runtime-versions" },
        { title: "expo-updates API reference", url: "https://docs.expo.dev/versions/latest/sdk/updates" },
      ],
      explain:
        "`runtimeVersion: { policy: \"fingerprint\" }` derives the runtime version from a hash of the native inputs: native dependencies, config plugins and app config. Change any of them and new builds get a new runtime version, so an OTA built from that JS cannot reach an older binary that lacks the native code.\n\nCompare `appVersion`, which only changes when you bump `version`, so a human has to remember after every native change. Forget once and you ship JS that calls a missing native module to everyone, which crashes on launch. The fingerprint policy turns that human rule into a computed one, and the nightly `fingerprint.yml` job then watches for drift.\n\nSee the **Channels, branches, and runtime versions** diagram in the Release section, and Milestone M7's safety-rail step.",
    },
    {
      id: "podcast-player-10",
      type: "multi",
      level: 1,
      topics: ["Release & CI", "Testing"],
      files: [".github/workflows/ci.yml"],
      prompt:
        "Select all that apply: which steps run in the `checks` job of `ci.yml`?\n\nSearch: open `.github/workflows/ci.yml` and list the `run:` steps under `checks`. Then see which jobs have an `if:` or `needs:`.",
      choices: [
        "`npm run typecheck`",
        "`npm run lint`",
        "Jest with `--ci --no-watchman`",
        "`npx expo export` for iOS and for Android",
        "The Maestro podcast smoke flow",
        "`eas update` to the preview channel",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "GitHub Actions documentation", url: "https://docs.github.com/en/actions" },
      ],
      explain:
        "`checks` runs typecheck, lint, unit tests and a bundle for both platforms. The export step catches what tsc and eslint cannot: Metro resolution, expo-router's ban on `@react-navigation/*` imports, and platform-specific files. Maestro is a separate `maestro-smoke` job that `needs: checks` and runs only when the PR has the `e2e` label, because it builds an APK on EAS and needs secrets. Publishing OTAs is `release.yml`'s job, never CI's.\n\nThe design idea is a fast gate on every PR and slow, credentialed work behind a label, a branch or a tag. Without the bundle step you merge code that type-checks and fails to bundle.\n\nSee **Release engineering** (\"CI pipeline\") and Milestone M8.",
    },
    {
      id: "podcast-player-11",
      type: "mcq",
      level: 2,
      topics: ["File System", "Offline & Sync"],
      files: [
        "src/projects/podcast-player/downloads/paths.ts",
        "src/projects/podcast-player/downloads/storage.ts",
        "src/projects/podcast-player/__tests__/downloads.test.ts",
      ],
      prompt:
        "The `downloads.relative_path` column stores paths like `podcasts/itunes-123/ep_abc.mp3`. The absolute URI is never stored. Why?\n\nSearch: read `resolveRelativePath` and `toRelativePath` in `downloads/paths.ts`, and the \"container-UUID trap\" tests in `downloads.test.ts`.",
      choices: [
        "The absolute iOS container path (`…/Application/<UUID>/Documents/…`) can change on reinstall and some updates, so the path is resolved against the current `Paths.document` every time it's read",
        "SQLite `TEXT` columns are limited to 255 characters, and absolute paths are too long",
        "expo-file-system's `File` constructor only accepts relative paths",
        "Android scoped storage forbids storing absolute paths in app databases",
      ],
      answer: 0,
      links: [
        { title: "expo-file-system API reference (DownloadTask)", url: "https://docs.expo.dev/versions/latest/sdk/filesystem" },
      ],
      explain:
        "Stored absolute paths stop working when the container UUID changes (reinstalls and some updates), and every downloaded file then looks missing. So the `downloads` table stores only `podcasts/<show>/<episode>.mp3` and resolves it against the current `Paths.document` every time.\n\n`resolveRelativePath()` joins the current documents URI with the stored path and refuses anything with a scheme, a leading `/` or `..`, so a bad row cannot escape the documents directory. `toRelativePath()` can even recover a relative path from an old container's absolute URI by anchoring on `/podcasts/`. The same rule applies to the pause snapshot's `fileUri`. `downloads.test.ts` covers all of it.\n\nSee the **iOS absolute-path trap** warning in the Download manager section and failure mode 6.",
    },
    {
      id: "podcast-player-12",
      type: "mcq",
      level: 2,
      topics: ["Media", "Testing"],
      files: ["src/projects/podcast-player/playback/progress.ts"],
      prompt:
        "An episode has `duration = 3600`. Its saved progress is `{ position: 600, played: false }`. What does `resolveResumePosition(saved, 3600)` return?\n\nSearch: open `resolveResumePosition` and `isPlayed` in `playback/progress.ts`, and compute the answer from the constants before you choose.",
      choices: ["598", "600", "0", "595"],
      answer: 0,
      explain:
        "Start over (return 0) if the episode is marked played, if the position is under 5 s, or if `isPlayed()` says it is within the end threshold (`min(30, duration × 5% + 5)`, which is 30 s here). Otherwise it returns `position - 2`, rewinding a little so the listener gets their bearings. 600 is nowhere near the end, so the answer is 598.\n\nThe rule is pure and lives in `progress.ts`, not in the service, so tests can pin the edge cases (almost finished, just started) that would otherwise only surface as \"it restarted my episode\" bug reports. `PlaybackService.load()` passes this value as the pending seek, applied on the first `isLoaded` status tick.\n\nSee \"Progress, resume and the sleep timer\" in the Audio section and Milestone M2.",
    },
    {
      id: "podcast-player-13",
      type: "mcq",
      level: 2,
      topics: ["TanStack Query"],
      files: [
        "src/projects/podcast-player/utils/invalidate.ts",
        "src/projects/podcast-player/utils/queryKeys.ts",
      ],
      prompt:
        "When a download finishes, `invalidateDownloads()` calls `invalidateQueries({ queryKey: podcastKeys.shows() })`, which is `[\"podcast\", \"show\"]`. It never names `podcastKeys.showEpisodes(id)`. Yet the show screen's episode list (`[\"podcast\", \"show\", id, \"episodes\"]`) refetches. Why?\n\nSearch: open `utils/queryKeys.ts` and `utils/invalidate.ts`, then read how TanStack Query matches `queryKey` filters (the `exact` option).",
      choices: [
        "`invalidateQueries` matches keys by prefix by default, so `[\"podcast\", \"show\"]` also marks every `[\"podcast\", \"show\", id, …]` query stale (the show, its episodes and its auto-download flag)",
        "`showEpisodes` is invalidated by a separate call further down in `invalidateDownloads()`",
        "TanStack Query refetches every active query whenever any invalidation happens",
        "It doesn't refetch. The row only updates because `LiveEpisodeRow` reads the live download store",
      ],
      answer: 0,
      links: [
        { title: "TanStack Query: query invalidation", url: "https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation" },
      ],
      explain:
        "Query keys are hierarchical. Without `exact: true`, invalidation hits every query whose key starts with the filter. That is why the key factory nests `showEpisodes` and `showAutoDownload` under `show`: one call refreshes everything about a show.\n\nThe flip side is a side effect worth knowing. `[\"podcast\", \"show\", id]` is `usePodcast`'s key, and its `queryFn` may call `syncFeed` when the cached feed is older than 30 minutes, so a finished download can trigger a feed refresh too. If you design keys flat (`[\"showEpisodes\", id]`), you must list every key you want refreshed and will eventually forget one, which shows up as a stale badge.\n\nSee **Architecture** (\"Query keys and live state\").",
    },
    {
      id: "podcast-player-14",
      type: "mcq",
      level: 2,
      topics: ["Performance", "Zustand"],
      files: [
        "src/projects/podcast-player/containers/LiveEpisodeRow.tsx",
        "src/projects/podcast-player/components/episode/EpisodeRow.tsx",
        "src/projects/podcast-player/utils/downloadView.ts",
        "src/projects/podcast-player/stores/downloadStore.ts",
      ],
      prompt:
        "Screens don't pass live download progress into `EpisodeRow`. They render `containers/LiveEpisodeRow`, which subscribes to `useDownloadStore((s) => s.live[episodeId])` itself, merges the result with a persisted `fallback`, and renders the dumb `components/episode/EpisodeRow` with plain props. Why split it this way?\n\nSearch: compare `containers/LiveEpisodeRow.tsx` with `components/episode/EpisodeRow.tsx`. Which one imports a store? Then see what `mergeDownload` receives.",
      choices: [
        "So a progress tick re-renders only the row that's downloading, not the whole list or screen, while `EpisodeRow` stays a dumb component. The persisted state from the query row is used until live data exists",
        "Because FlashList doesn't allow Zustand selectors in `renderItem`",
        "So each progress tick is written to SQLite by the row",
        "Because the project's rules forbid passing download state to components as props",
      ],
      answer: 0,
      links: [
        { title: "FlashList: recycling", url: "https://github.com/shopify/flash-list/blob/main/documentation/docs/fundamentals/recycling.md" },
        { title: "TanStack Query: query invalidation", url: "https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation" },
      ],
      explain:
        "Native progress events fire many times a second. If the screen subscribed to the whole `live` map, every tick would re-render the full list. The narrow selector `s.live[episodeId]` limits the work to one row, and `mergeDownload()` combines it with the SQL row's `downloadState`/`downloadedBytes`, so every list shows the same badge without re-querying.\n\n`EpisodeRow` in `components/` still takes only data and callbacks, which is the repo's rule; the connected wrapper lives in `containers/` so the exceptions are few and easy to find. The manager also reduces load at the source: it pushes to the store only when the whole percent changes (`progressStep`) and writes SQLite at most every 3 s. Rows must hold no per-item local state because FlashList recycles them.\n\nSee **Architecture decisions** (\"Containers vs components\") and Milestone M5.",
    },
    {
      id: "podcast-player-15",
      type: "text",
      level: 1,
      topics: ["Zustand", "Architecture"],
      files: [
        "src/projects/podcast-player/utils/downloadView.ts",
        "src/app/projects/podcast-player/player.tsx",
      ],
      prompt:
        "Which function in `utils/downloadView.ts` combines a `LiveDownload` (or `undefined`) with the persisted `{ state, bytes }` and returns `{ state, progress, bytesWritten, totalBytes }`? (Type the function name.)\n\nSearch: open `utils/downloadView.ts`, then find where `player.tsx` and the list containers call it.",
      accept: ["mergeDownload", "mergeDownload()"],
      explain:
        "`mergeDownload(live, fallback)` gives live data priority over the persisted values and always reports `progress = 1` for `done`. Screens and containers call it and pass plain values down: `player.tsx` passes `downloadState` and `downloadProgress` into `FullPlayerView`.\n\nThat is the practical form of the repo's rule that components receive data and callbacks, never stores. Keeping the merge in a pure utility means the live store and the SQL row are reconciled in exactly one place; duplicate the logic per screen and two lists will eventually disagree about whether an episode is downloaded.\n\nSee **Architecture** (\"Query keys and live state\").",
    },
    {
      id: "podcast-player-16",
      type: "mcq",
      level: 2,
      topics: ["Offline & Sync", "Testing"],
      files: [
        "src/projects/podcast-player/downloads/policy.ts",
        "src/projects/podcast-player/__tests__/downloads.test.ts",
      ],
      prompt:
        "A download fails for the 3rd time (`attempts = 3`). `onFailure` sets `nextAttemptAt = now + backoffDelayMs(3)`. What range can that delay fall in?\n\nSearch: open `backoffDelayMs` in `downloads/policy.ts` and compute for `attempt = 3` the fixed and random halves yourself.",
      choices: [
        "Between 4,000 and 8,000 ms",
        "Exactly 8,000 ms",
        "Between 0 and 8,000 ms",
        "Between 6,000 and 10,000 ms",
      ],
      answer: 0,
      links: [
        { title: "expo-file-system API reference (DownloadTask)", url: "https://docs.expo.dev/versions/latest/sdk/filesystem" },
      ],
      explain:
        "`exp = min(5 min, 2000 × 2^(attempt − 1)) = 8000`, and the function returns `exp/2 + random × exp/2`. That is \"equal jitter\": half fixed, half random. The jitter stops a burst of failures (say, the network dropped) from retrying in lockstep, and the fixed half guarantees a minimum wait, which full jitter (0..8000) does not.\n\n`shouldRetry(attempts)` allows up to `MAX_ATTEMPTS = 5`. After that the row becomes `failed` and the snapshot is cleared; a failed row waits for an explicit `retry()`. The decision lives in `policy.ts` as a pure function with an injectable `random`, so tests pin both ends of the range. An unbounded or un-jittered retry loop is what drains batteries and hammers a flaky server.\n\nSee \"Policy\" in the Download manager section.",
    },
    {
      id: "podcast-player-17",
      type: "mcq",
      level: 2,
      topics: ["File System", "Offline & Sync"],
      files: [
        "src/projects/podcast-player/downloads/policy.ts",
        "src/projects/podcast-player/downloads/manager.ts",
      ],
      prompt:
        "The storage cap is full, and every downloaded episode is **unplayed**. The user taps download on another episode. What happens?\n\nSearch: read `chooseEvictions` in `downloads/policy.ts` and the `ensureCapacity` path in `manager.ts`. Which files are eligible for eviction?",
      choices: [
        "`chooseEvictions` evicts nothing (only played episodes can be evicted) and returns `fits: false`, so `run()` marks the download `failed` with \"Storage cap reached — delete played episodes or raise the cap\"",
        "The oldest download by `completedAt` is deleted to make room",
        "The download goes ahead past the cap, and the next auto-delete run trims storage",
        "It stays `queued` and retries with exponential backoff until space is freed",
      ],
      answer: 0,
      explain:
        "The policy comment says it plainly: silently deleting something the user has not heard yet is worse than refusing a new download. Eviction looks only at played files that are not protected (the episode now playing is protected), oldest-played first, and removes only as many as needed.\n\n`ensureCapacity` first checks device free space against `estimateBytes()` (enclosure lengths are often 0 or wrong). It then returns an error string, and `run()` (the body that `start()` calls once it has claimed the slot) writes `failed` directly. That path skips `onFailure`, so there is no backoff loop retrying something that cannot succeed.\n\nThis is the answer to \"unbounded storage\" (failure mode 13), together with the 2-per-show auto-download limit. See **Download manager** and Milestone M5.",
    },
    {
      id: "podcast-player-18",
      type: "mcq",
      level: 2,
      topics: ["Axios / API", "Offline & Sync"],
      files: [
        "src/projects/podcast-player/api/index.api.ts",
        "src/projects/podcast-player/feeds/sync.ts",
      ],
      prompt:
        "`fetchFeedXml` sends `If-None-Match` / `If-Modified-Since` and passes `validateStatus: (s) => (s >= 200 && s < 300) || s === 304`. Why is the custom `validateStatus` needed?\n\nSearch: read `fetchFeedXml` in `api/index.api.ts` and the axios docs for `validateStatus`. What is the default?",
      choices: [
        "Axios rejects non-2xx statuses by default, so a `304 Not Modified` would throw. Accepting 304 lets the function return `{ notModified: true }`, and `syncFeed` skips parsing and the DB upsert",
        "Feeds that answer 304 must be retried without validators to get the body",
        "It makes axios follow 3xx redirects, which feeds use a lot",
        "It stops axios from caching the response body between calls",
      ],
      answer: 0,
      links: [
        { title: "Axios request config (validateStatus)", url: "https://axios-http.com/docs/req_config" },
      ],
      explain:
        "Axios rejects non-2xx statuses by default, so a `304 Not Modified` would throw. Accepting 304 lets the function return `{ notModified: true }`, and `syncFeed` skips parsing and the DB upsert.\n\nConditional GET is the first of two cost layers in `feeds/sync.ts`. An unchanged feed costs a 304 instead of a download that can run to several megabytes, and the validators (`etag`, `last_modified`) are saved per podcast by `markRefreshed`. The second layer is the upsert with a content hash. The request also uses `transformResponse: (d) => d` to keep raw XML, and a podcast-owned `feedApi` derived from the shared, project-agnostic axios defaults.\n\nWithout both layers, a refresh of 30 subscriptions rewrites the whole library every time. See Milestone M1's incremental-refresh step.",
    },
    {
      id: "podcast-player-19",
      type: "multi",
      level: 2,
      topics: ["SQLite", "Offline & Sync"],
      files: ["src/projects/podcast-player/db/queries.ts", "src/projects/podcast-player/db/schema.ts"],
      prompt:
        "Select all that apply. Read the SQL in `upsertEpisodes()`. On a feed refresh, which of these does it guarantee?\n\nSearch: read the SQL in `upsertEpisodes()` in `db/queries.ts`. Look for `ON CONFLICT`, `COALESCE` and `CASE`.",
      choices: [
        "An episode whose `(podcast_id, guid)` already exists is updated in place, never inserted twice",
        "Rows whose `content_hash` hasn't changed are skipped entirely",
        "A feed that leaves out `duration` doesn't erase a duration learned earlier from the player",
        "An empty chapters array from the feed doesn't wipe chapters fetched earlier from `podcast:chapters` JSON",
        "Episodes that dropped out of the feed are deleted",
        "Progress rows are reset when an episode's audio URL changes",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "expo-sqlite (SQLiteProvider, PRAGMA)", url: "https://docs.expo.dev/versions/latest/sdk/sqlite" },
      ],
      explain:
        "`ON CONFLICT(podcast_id, guid) DO UPDATE … WHERE episodes.content_hash != excluded.content_hash` makes unchanged rows free. `COALESCE(excluded.duration, episodes.duration)` keeps the duration that `setEpisodeDuration` learned from the player, and the `CASE WHEN excluded.chapters = '[]'` keeps lazily fetched chapters.\n\nNothing deletes missing episodes (old episodes often fall off a feed's window but stay in the library), and progress lives in its own table so a refresh can never reset listening state. The function also returns the newly inserted ids, which drive auto-download.\n\nThe design principle is that a feed is untrusted, partial input: your database should merge it, not mirror it. See the data model table in **Architecture** and Milestone M1.",
    },
    {
      id: "podcast-player-20",
      type: "text",
      level: 2,
      topics: ["Offline & Sync", "File System"],
      files: ["src/projects/podcast-player/feeds/sync.ts"],
      prompt:
        "When a refresh finds new episodes for a show with auto-download on, how many of them does `syncFeed` enqueue at most per show per refresh? (Type the number.)\n\nSearch: grep `AUTO_DOWNLOAD_PER_SHOW` and `isFirstLoad` in `feeds/sync.ts`.",
      accept: ["2", "two", "AUTO_DOWNLOAD_PER_SHOW"],
      explain:
        "`AUTO_DOWNLOAD_PER_SHOW = 2` is the guard against unbounded storage. There is a second guard: `isFirstLoad = !existing`, so the very first sync (which inserts the whole back catalogue) never counts as \"new\" and never auto-downloads anything.\n\nWithout both, subscribing to a show with 500 episodes, or a feed that republishes everything with new guids, fills the device. Because the limit lives in the sync path rather than in the download manager, the manager can stay a general-purpose queue.\n\nSee failure mode 13 and the Policy block of the Download manager section.",
    },
    {
      id: "podcast-player-21",
      type: "multi",
      level: 2,
      topics: ["Testing", "Offline & Sync"],
      files: [
        "src/projects/podcast-player/__tests__/parse.test.ts",
        "src/projects/podcast-player/__tests__/fixtures/messy.xml",
        "src/projects/podcast-player/feeds/parse.ts",
      ],
      prompt:
        "Select all that apply. Open `fixtures/messy.xml` and the \"messy feed\" block in `parse.test.ts`. Which behaviours do those tests assert?\n\nSearch: open `__tests__/fixtures/messy.xml` and the \"messy feed\" block in `parse.test.ts`. Check each option against an actual assertion.",
      choices: [
        "A BOM plus whitespace before `<?xml` doesn't break parsing",
        "A text-only `<item>` with no enclosure is skipped",
        "An item whose `<guid>` equals another item's fallback guid (that item's enclosure URL) is dropped as a duplicate",
        "When an item has a video enclosure and an audio enclosure, the audio one is chosen",
        "An item with an unparseable `pubDate` is dropped",
        "`<itunes:duration>garbage</itunes:duration>` throws `FeedParseError`",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "fast-xml-parser", url: "https://github.com/NaturalIntelligence/fast-xml-parser" },
      ],
      explain:
        "`parseFeed` strips the BOM and leading whitespace, skips items where `pickAudio()` finds nothing, and dedupes on a guid that falls back through `guid → id → audio URL → title|date`. Entity decoding makes `&amp;` in the duplicate's guid match the decoded URL. A bad date does not drop the item: it gets `publishedAt: null` and sorts to the bottom, and garbage durations become `null`.\n\nThe workflow behind the tests is the point: every time a real feed broke the parser, a fixture was added. A pure parser plus real-world fixtures is how you test code that would otherwise need the network, and it is what Milestone M1's \"five feeds with different quirks\" checkpoint turns into a regression suite.",
    },
    {
      id: "podcast-player-22",
      type: "order",
      level: 2,
      topics: ["Offline & Sync", "File System"],
      files: [
        "src/projects/podcast-player/downloads/manager.ts",
        "src/projects/podcast-player/downloads/policy.ts",
      ],
      prompt:
        "Wi-Fi only is on. Put this download's life in order, from tap to finished file, including a Wi-Fi drop partway through.\n\nSearch: follow one download through `enqueue`, `pump`, `setNetwork`, `pauseAndSnapshot`, `start` and `run` in `downloads/manager.ts`.",
      items: [
        "`enqueue()` inserts a `queued` row, updates the live store and schedules a pump",
        "`pump()` picks it (priority, then FIFO), `ensureCapacity()` passes, and the row becomes `downloading`",
        "Wi-Fi drops to cellular: `setNetwork()` sets `stopReason = \"network\"`, and `pauseAndSnapshot()` saves the `savable()` snapshot",
        "The runner gets a `null` result with `stopReason` `network` and writes the row back to `queued`",
        "Wi-Fi returns: `pump()` restarts it with `DownloadTask.fromSavable(...).resumeAsync()`",
        "The task resolves with a `File`: the row becomes `done`, with `completedAt` set and the snapshot cleared",
      ],
      links: [
        { title: "expo-file-system API reference (DownloadTask)", url: "https://docs.expo.dev/versions/latest/sdk/filesystem" },
      ],
      explain:
        "Every decision (which downloads to start, whether the network allows it, eviction) comes from pure functions in `policy.ts`, and `manager.ts` only performs the I/O. A pause resolves the running `downloadAsync()`/`resumeAsync()` promise with `null`, so `run()` uses `stopReason` to tell a user pause (row stays `paused`) from a network pause (row goes back to `queued`, to resume automatically).\n\nBecause the snapshot carries `resumeData`, the transfer continues from the same byte instead of starting over. Treating every `null` as a failure would burn retry attempts whenever the user walks out of Wi-Fi range.\n\nSee the **Lifecycle you must get right** list in the Download manager section and Milestone M5.",
    },
    {
      id: "podcast-player-23",
      type: "order",
      level: 2,
      topics: ["Media", "Architecture"],
      files: ["src/projects/podcast-player/playback/service.ts"],
      prompt:
        "Put the steps of `PlaybackService.load(episodeId, { autoplay: true })` in order, for a new, downloaded episode that has a saved resume position, with no other tap racing it.\n\nSearch: read `load()` and `loadEpisode()` in `playback/service.ts` top to bottom and number the side effects. Note where `stale()` is checked.",
      items: [
        "Take a token (`++this.loadSeq`), await `init()`, then hand off to `loadEpisode(episodeId, token, options)`",
        "Look up the episode row with `getEpisode()`",
        "Resolve the local file with `downloadManager.localUriFor()`, then await `ensureSettingsHydrated()`",
        "Flush the previous episode's progress and reset the progress writer and interruption tracker",
        "Resolve the resume position and `resolveStartRate()`, then publish `nowPlaying` and the initial status to `usePlayerStore`",
        "`replaceSource()`: pause the player, `replace()` the source, set the playback rate",
        "`await ensureLockScreen(episode, token)` activates the lock-screen controls",
        "On the first `isLoaded` status tick, seek to the pending position, then call `play()`",
      ],
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
      ],
      explain:
        "Every `load()` bumps `loadSeq`, and `loadEpisode()` checks `stale()` after each await, so when the user taps three episodes quickly only the last one gets past its next await. That is why the flush and reset come *after* every await (the episode lookup, the file lookup and settings hydration): a superseded load returns before it touches anything, so it can never flush or reset the episode that is actually playing. Flushing before switching still saves the old episode's last position under the old id. A local file is preferred only when `downloadState === \"done\"` and the file still exists. The start rate comes from `resolveStartRate()` (restored session, then a speed picked this run, then the Default speed setting), which is why settings must be hydrated first. The store is updated before the source swap, so the UI shows the new title immediately.\n\n`replaceSource()` pauses before `replace()` because the native `replace()` resumes on its own when the old item was playing; without the pause the new episode would play from 0:00 until the resume seek lands. `ensureLockScreen()` also takes the token, so a newer load's metadata is never overwritten. Playback then starts in `onStatus` once the source reports `isLoaded`, after the resume seek has landed.\n\nThis ordering is the heart of Milestone M2 (\"Playback core\"); see also \"Progress, resume and the sleep timer\".",
    },
    {
      id: "podcast-player-24",
      type: "mcq",
      level: 2,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: [
        "app.config.ts",
        "src/projects/podcast-player/lib/updates.ts",
        "src/app/projects/podcast-player/(tab)/index.tsx",
      ],
      prompt:
        "`app.config.ts` sets `updates.checkAutomatically: \"ON_LOAD\"` and `fallbackToCacheTimeout: 0`. You publish an OTA, and a tester cold-launches the app once. What do they get on that launch?\n\nSearch: read the `updates` block in `app.config.ts` and `lib/updates.ts`. Which function fetches, and which one applies?",
      choices: [
        "The bundle they already had. The update downloads in the background and applies on the next launch, or sooner if they tap **Restart** on the Home tab's `UpdateBanner` (`reloadAsync()`)",
        "Startup waits until the update downloads, then runs the new bundle",
        "Nothing downloads until `useUpdateBanner`'s foreground check, which runs at most every 10 minutes",
        "The app reloads itself mid-session as soon as the update has downloaded",
      ],
      answer: 0,
      links: [
        { title: "expo-updates API reference", url: "https://docs.expo.dev/versions/latest/sdk/updates" },
        { title: "How EAS Update works", url: "https://docs.expo.dev/eas-update/how-it-works" },
      ],
      explain:
        "A timeout of 0 means launch never waits for the network: the update downloads after launch and is used on the next cold start (the runbook's \"relaunch twice\"). `lib/updates.ts` adds a prompt-to-restart layer on top: it also checks on foreground (rate-limited to once per 10 minutes) and shows the banner when `useUpdates().isUpdatePending` is true.\n\nA forced `reloadAsync()` mid-session is deliberately not used; reloading in the middle of an episode would interrupt playback. Choosing between silent, prompt and force is a product decision, and the doc's **Update-check UX** section lists the trade-offs. If you are testing an OTA and expect it on first launch, this is why you will think it failed.",
    },
    {
      id: "podcast-player-25",
      type: "order",
      level: 2,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: [
        ".github/workflows/ci.yml",
        ".github/workflows/release.yml",
        "docs/05-release.html",
      ],
      prompt:
        "Put this repo's release pipeline in order, from a pull request to the stores.\n\nSearch: read the `on:` and `if:` conditions in `ci.yml` and `release.yml`, and `channel` in `eas.json`.",
      items: [
        "Open a PR: `ci.yml` runs typecheck, lint, Jest and `expo export`",
        "Merge to `main`: `release.yml`'s `ota-preview` job runs `eas update --channel preview --environment preview` with `APP_VARIANT=preview`",
        "Testers on `preview` builds (channel `preview`, baked in by `eas.json`) whose fingerprint runtime matches receive the OTA",
        "Push a `v*` tag: `build-and-submit` runs `eas build --profile production --platform all --auto-submit`",
        "`softprops/action-gh-release` creates a GitHub release with generated notes",
      ],
      links: [
        { title: "EAS CLI reference", url: "https://docs.expo.dev/eas/cli" },
        { title: "GitHub Actions documentation", url: "https://docs.github.com/en/actions" },
      ],
      explain:
        "JS fixes reach testers on every merge through an OTA to the preview channel. Store binaries are cut only from tags. Each job selects its trigger with `if: github.ref == 'refs/heads/main'` or `startsWith(github.ref, 'refs/tags/v')`, and `concurrency.cancel-in-progress: false` stops a newer push from killing a release halfway.\n\nStep 3 works because CI publishes by channel (to whatever branch `preview` reads) and sets the same `APP_VARIANT` as the builds; get either wrong and the update is published but reaches nobody. The pipeline mirrors the doc's CI block, and Milestone M8's checkpoint is to push a tag and touch nothing.\n\nSee **Release engineering** (\"CI pipeline\").",
    },
    {
      id: "podcast-player-26",
      type: "mcq",
      level: 1,
      topics: ["FlashList", "Performance"],
      files: [
        "src/app/projects/podcast-player/podcast/[id].tsx",
        "src/app/projects/podcast-player/(tab)/discover.tsx",
      ],
      prompt:
        "The `FlashList`s in `podcast/[id].tsx` and `discover.tsx` don't pass `estimatedItemSize`. The repo pins `@shopify/flash-list` 2.0.2. What's going on?\n\nSearch: grep `estimatedItemSize` in the repo, check the pinned `@shopify/flash-list` version in `package.json`, and read the v2 migration guide.",
      choices: [
        "FlashList v2 measures items itself, so `estimatedItemSize` is no longer needed",
        "It's a bug. Without it, FlashList renders every item at once, like a `ScrollView`",
        "Expo Router injects it from the screen's options",
        "FlashList infers it from `contentContainerStyle.paddingBottom`",
      ],
      answer: 0,
      links: [
        { title: "FlashList v2 migration", url: "https://github.com/shopify/flash-list/blob/main/documentation/docs/v2-migration.md" },
        { title: "FlashList: recycling", url: "https://github.com/shopify/flash-list/blob/main/documentation/docs/fundamentals/recycling.md" },
      ],
      explain:
        "FlashList v1 needed `estimatedItemSize` for its recycling layout. v2 (built for the New Architecture) measures items itself and dropped the requirement, so these lists only pass `data`, `keyExtractor`, `renderItem` and a `ListHeaderComponent`.\n\nRecycling still shapes how you write rows: a cell is re-rendered with a different `item`, so local state can leak between items. That is another reason `LiveEpisodeRow` takes everything from props (`episodeId`, `fallback`) and holds no per-item state. Copying a v1 tutorial would add a prop that no longer does anything.\n\nSee the lists row in **Library hints**.",
    },
    {
      id: "podcast-player-27",
      type: "mcq",
      level: 2,
      topics: ["Gesture Handler", "Media"],
      files: [
        "src/projects/podcast-player/components/player/Scrubber.tsx",
        "docs/05-release.html",
      ],
      prompt:
        "`Scrubber.tsx` keeps two pieces of local state, `scrub` and `settling`, and displays `scrub ?? settling ?? position`. What problem does `settling` solve?\n\nSearch: read `Scrubber.tsx` and find where `scrub` and `settling` are set and cleared. What happens if you remove `settling`?",
      choices: [
        "After release, the 500 ms status ticks would still report the old position until the seek lands, snapping the thumb back. `settling` holds the target until `position` arrives within 1.5 s of it, with a 1.5 s timeout as a fallback",
        "It debounces taps so two quick taps don't send two seeks",
        "It snaps the thumb to the nearest chapter tick while dragging",
        "It stops the gesture from running on the UI thread",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: worklets guide", url: "https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets" },
      ],
      explain:
        "This is the doc's \"scrubber fight\" failure mode (number 5). While the finger is down, `scrub` owns the value. After `commit()`, `settling` keeps the UI on the target until the player confirms it, and the lock is released during render (`if (settling != null && |position − settling| < 1.5) setSettling(null)`), with a timeout fallback so a failed seek cannot freeze the thumb.\n\nThat follows the repo's React Compiler rule to derive state during render rather than call setState in an effect body. Chapter snapping is a separate feature in `tapAt` (`TICK_SNAP_PX`). The gestures use `.runOnJS(true)` because they drive React state. Without `settling`, the 500 ms status ticks still report the old position for a moment and the thumb visibly snaps back.\n\nSee Milestone M4 and the \"Interaction details\" list.",
    },
    {
      id: "podcast-player-28",
      type: "mcq",
      level: 2,
      topics: ["Reanimated", "Gesture Handler", "Testing"],
      files: [
        "src/projects/podcast-player/playback/queue.ts",
        "src/projects/podcast-player/components/queue/ReorderableList.tsx",
      ],
      prompt:
        "`clamp()` and `dragTargetIndex()` in the otherwise plain `playback/queue.ts` start with the `\"worklet\"` directive. Why?\n\nSearch: find which gesture callbacks in `ReorderableList.tsx` call `dragTargetIndex`, then check how `queue.test.ts` calls it.",
      choices: [
        "`ReorderableList` calls `dragTargetIndex` from a Gesture Handler `onUpdate` callback that runs on the UI thread. The directive lets it, and the `clamp` it calls, run in the UI runtime, while Jest still calls it as a normal function",
        "It tells the React Compiler to memoize them",
        "It moves heavy queue sorting onto a background JS thread",
        "Every function exported from `playback/` needs it so the service can call it",
      ],
      answer: 0,
      links: [
        { title: "Reanimated: worklets guide", url: "https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets" },
      ],
      explain:
        "Gesture callbacks in `ReorderableList` run on the UI thread as worklets, and any function they call must also be a worklet. That includes the helper `clamp`. The reorder math (recomputing the shared `positions` map) happens entirely on the UI thread, and React hears about it once on drop, through `scheduleOnRN(onDrop, from, to)`.\n\nKeeping the math in `queue.ts` means `queue.test.ts` can test \"maps a drag distance to a target row\" as an ordinary function, since the directive is just a string statement outside a worklet runtime. If the helper were not a worklet, the gesture would crash or fall back to a JS round trip per frame and the drag would stutter.\n\nSee **Library hints** (drag and drop) and Milestone M2/M4.",
    },
    {
      id: "podcast-player-29",
      type: "explain",
      level: 2,
      topics: ["Media", "SQLite", "Performance"],
      files: [
        "src/projects/podcast-player/playback/progress.ts",
        "src/projects/podcast-player/playback/service.ts",
      ],
      prompt:
        "`createProgressWriter()` saves the listening position at most every `PROGRESS_INTERVAL_MS` while playing, and also flushes at certain moments. Explain why it doesn't simply write on every status tick, or only on pause. Name the moments that trigger a flush.\n\nSearch: read `createProgressWriter` in `playback/progress.ts` and its callers in `service.ts` (`sample`, `flush`). List every call to `flushProgress`.",
      model:
        "Status ticks arrive every 500 ms (`updateInterval: 500`). Writing each one would mean two SQLite writes a second for the whole listen, plus query invalidation. Writing only on pause would lose everything on a crash or when the OS kills the app, because nothing runs on termination. So `sample()` writes at most every 5 s while playing, and `flush()` saves right away on pause, seek, track change (`load()` flushes before switching), app backgrounding (an `AppState` listener for any non-active state) and an external pause. `flush()` also skips a write if the position is within 0.5 s of the last saved value. Each write computes `played` with `isPlayed()`, so finishing near the end marks the episode played.",
      rubric: [
        "Every-tick writes waste I/O: about 2 per second at a 500 ms interval",
        "Pause-only writes lose progress on a crash or OS kill, since there's no termination hook",
        "Throttle to 5 s while playing",
        "Flush on pause, seek, track change, backgrounding and external pause",
        "Mentions the dedupe (within 0.5 s) or the `played` calculation",
      ],
      links: [
        { title: "React Native: AppState", url: "https://reactnative.dev/docs/appstate" },
      ],
      explain:
        "This is the usual trade-off for any high-frequency state you must persist: throttle the steady stream and flush at the moments that matter. The same pattern appears in the download manager, which writes progress to SQLite at most every 3 s and saves snapshots when the app goes to the background.\n\nFor listening progress, the throttle (5 s) bounds writes and query invalidations, while flushes on pause, seek, track change, backgrounding (an `AppState` listener) and external pause bound the data you can lose. There is no termination hook, so \"save on exit\" is not an option. Writing every tick wastes I/O; writing only on pause loses a whole listen when the OS kills the app.\n\nSee \"Progress, resume and the sleep timer\" and Milestone M2.",
    },
    // ------------------------------------------------------------ Level 3
    {
      id: "podcast-player-30",
      type: "mcq",
      level: 3,
      topics: ["Media"],
      files: [
        "src/projects/podcast-player/playback/interruptions.ts",
        "src/projects/podcast-player/playback/service.ts",
      ],
      prompt:
        "In `createInterruptionTracker()`, `observe()` returns `\"none\"` for any status that arrives within 1200 ms of the last `command()` (unless `didJustFinish`). Why does that window exist?\n\nSearch: read `createInterruptionTracker` in `playback/interruptions.ts` and find the 1200 ms constant and how `didJustFinish` is treated.",
      choices: [
        "Our own `play()`/`pause()` take a tick or two to show up in status. Without the window, that delay would be misread as an external pause or play, flipping `intent` and setting `pausedExternally` wrongly",
        "To debounce double taps on the play button",
        "Because iOS needs 1.2 s before an audio session can be activated again",
        "To throttle the SQLite progress writes that follow each status tick",
      ],
      answer: 0,
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
      ],
      explain:
        "The tracker compares consecutive statuses with the user's intent: \"stopped while we wanted play\" means `externalPause`. Right after we issue a command, status still shows the old state, which would look exactly like an external transition. The 1200 ms window absorbs that delay.\n\n`didJustFinish` gets through even inside the window, so auto-advance is never swallowed. Buffering flips are ignored for the same reason: some platforms flip `playing` during stalls. Without the guard, your own `pause()` would be misread as a system pause, `pausedExternally` would flip, and the UI would claim \"Paused by the system\" after the user tapped pause.\n\nSee **Audio session model** (\"Events you must handle (and who handles them)\").",
    },
    {
      id: "podcast-player-31",
      type: "multi",
      level: 3,
      topics: ["Media", "Expo Config & EAS", "Background Tasks"],
      files: ["app.config.ts", "src/projects/podcast-player/playback/service.ts"],
      prompt:
        "Select all that apply. Which pieces does this repo rely on so a podcast keeps playing with the screen locked and the iPhone's ring/silent switch set to silent?\n\nSearch: read the `expo-audio` plugin block in `app.config.ts` and `doInit()` in `playback/service.ts`, then check the expo-audio docs on background playback.",
      choices: [
        "The `expo-audio` config plugin with `enableBackgroundPlayback: true` in `app.config.ts` (a native capability, so it needs a new build)",
        "`setAudioModeAsync({ shouldPlayInBackground: true })` at runtime",
        "`playsInSilentMode: true`, so the mute switch doesn't silence it",
        "An `expo-background-task` registration to keep JS alive during playback",
        "A `TaskManager.defineTask` for the audio player in the root layout",
        "`interruptionMode: \"mixWithOthers\"`, so iOS doesn't suspend the app",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
        { title: "expo-background-task", url: "https://docs.expo.dev/versions/latest/sdk/background-task" },
      ],
      explain:
        "Background audio needs both halves: the native capability (the config plugin adds the background audio mode at prebuild) and the runtime session setting (`shouldPlayInBackground`). The silent switch is a separate flag, `playsInSilentMode`. Background tasks are for periodic work, not audio; playback continues because the native player owns the session. The service uses `doNotMix`, not `mixWithOthers` (which also would not satisfy lock-screen controls).\n\nSince the plugin option changes native config, it also changes the fingerprint, so it cannot be turned on through an OTA; you need a new build. Forgetting `playsInSilentMode` is failure mode 2: no sound for anyone whose mute switch is on.\n\nSee the table at the top of **Audio session model**.",
    },
    {
      id: "podcast-player-32",
      type: "multi",
      level: 3,
      topics: ["Offline & Sync", "File System"],
      files: ["src/projects/podcast-player/downloads/manager.ts"],
      prompt:
        "Select all that apply. On relaunch, `DownloadManager.rehydrate()` runs once (through `init()`). What does it do?\n\nSearch: read `rehydrate()` and `init()` in `downloads/manager.ts` and list each repair it performs per row state.",
      choices: [
        "Turns rows stuck in `downloading` into `queued` with `nextAttemptAt: 0`, because the process died mid-transfer",
        "Re-queues `done` rows whose file is missing from 0 bytes, clearing the snapshot",
        "Deletes played downloads past the auto-delete window before syncing the live store",
        "Registers a network listener so the Wi-Fi-only rule can pause and resume transfers",
        "Resets `failed` rows to `attempts: 0` and re-queues them",
        "Automatically resumes rows the user `paused`",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "expo-file-system API reference (DownloadTask)", url: "https://docs.expo.dev/versions/latest/sdk/filesystem" },
      ],
      explain:
        "Repairs are batched into one transaction (`updateDownloads`). A requeued row with a saved snapshot later resumes from the same byte, and without one it restarts from 0, which is still better than losing it. `failed` rows wait for an explicit `retry()` and `paused` rows for `resume()`, because `pickDownloadsToStart` only starts `queued` rows. Respecting the user's choice across launches is part of the design.\n\n`init()` stores the promise (and clears it if it fails), so the project layout and the background task can both call it safely. Without rehydration, a killed app leaves rows stuck in `downloading` forever, with no process behind them.\n\nSee \"Lifecycle you must get right\" and the Milestone M5 checkpoint (kill the app at 50%).",
    },
    {
      id: "podcast-player-33",
      type: "text",
      level: 3,
      topics: ["File System", "Offline & Sync"],
      files: ["src/projects/podcast-player/downloads/manager.ts"],
      prompt:
        "In `DownloadManager.run()` (called by `start()`), which expo-file-system method rebuilds a `DownloadTask` from a stored snapshot so it can `resumeAsync()` from the same byte? (Type the method, for example `Class.method`.)\n\nSearch: find where `run()` in `downloads/manager.ts` builds a task from a stored snapshot, and check the `DownloadTask` entry in the expo-file-system docs.",
      accept: ["DownloadTask.fromSavable", "fromSavable", /fromSavable/],
      links: [
        { title: "expo-file-system API reference (DownloadTask)", url: "https://docs.expo.dev/versions/latest/sdk/filesystem" },
      ],
      explain:
        "`DownloadTask.fromSavable({ ...snapshot, fileUri: resolveUri(snapshot.relativePath) }, { onProgress })` turns the persisted pause state back into a live, paused task, with the file URI rebuilt for the current container and new callbacks attached (functions are not stored in the snapshot). `resumeAsync()` then continues from the same byte.\n\nIf that throws (for example, `resumeData` from an older container), the catch clears the snapshot and starts over with `new DownloadTask(url, file).downloadAsync()`. The opposite direction is `task.savable()` in `persistSnapshot()`, which is only valid while the task is paused. Note the doc's older name `createDownloadResumable` is the legacy API; SDK 57 uses `DownloadTask`.\n\nSee the code block in **Download manager**.",
    },
    {
      id: "podcast-player-34",
      type: "order",
      level: 3,
      topics: ["Release & CI", "Expo Config & EAS", "Native Modules"],
      files: [
        ".github/workflows/fingerprint.yml",
        ".github/workflows/release.yml",
        "app.config.ts",
      ],
      prompt:
        "A feature needs a new native module. Put the safe path to shipping it, and to later OTA fixes, in order.\n\nSearch: read `fingerprint.yml` and `release.yml`, and `runtimeVersion` in `app.config.ts`. At which step does the runtime version first change?",
      items: [
        "Add the native module and the JS that uses it in a PR; CI passes, including `expo export`",
        "Confirm the drift: `eas fingerprint:compare` (as in `fingerprint.yml`) shows the fingerprint differs from the last finished production build",
        "Push a `v*` tag so `build-and-submit` builds and submits new production binaries with the new runtime version",
        "Users install the store update, which has the new runtime version",
        "Later JS-only fixes shipped with `eas update` reach those users, because their runtime matches",
      ],
      links: [
        { title: "EAS Update: runtime versions", url: "https://docs.expo.dev/eas-update/runtime-versions" },
        { title: "EAS CLI reference", url: "https://docs.expo.dev/eas/cli" },
      ],
      explain:
        "With the fingerprint policy, the runtime version changes along with the native code. An OTA built from the new JS is stamped with the new runtime and simply does not reach old binaries, so it cannot crash them by calling a native module they lack. Old binaries keep running the last update compatible with them.\n\nThe nightly `fingerprint.yml` exists so you learn \"the next release needs a store build\" before release day, not halfway through it. It reports drift as a warning and stays green, since drift after native work is expected; only real errors fail the job. The order matters: new binaries must be in users' hands before JS fixes for the new runtime can reach them.\n\nSee Milestone M7's \"prove the safety rail\" step and failure mode 7.",
    },
    {
      id: "podcast-player-35",
      type: "multi",
      level: 3,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: ["app.config.ts", "docs/05-release.html", ".github/workflows/release.yml"],
      prompt:
        "Select all that apply. Which of these changes need a new store build rather than an `eas update` OTA?\n\nSearch: read `docs/05-release.html` for the \"OTA may only carry\" rule, then check which of these options appear in `app.config.ts` or only in `src/`.",
      choices: [
        "Adding a dependency with native code (for example, a new `expo-*` module)",
        "Changing `expo-audio` plugin options in `app.config.ts` (for example `enableBackgroundPlayback`)",
        "Adding an iOS entitlement or App Group in `app.config.ts`",
        "Fixing a bug in `playback/queue.ts`",
        "Changing text and styles in `settings.tsx`",
        "Tuning the backoff constants in `downloads/policy.ts`",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "EAS Update: runtime versions", url: "https://docs.expo.dev/eas-update/runtime-versions" },
        { title: "expo-updates API reference", url: "https://docs.expo.dev/versions/latest/sdk/updates" },
      ],
      explain:
        "The runbook's rule: an OTA may carry only JavaScript and assets. Native modules, plugin options and entitlements end up in the compiled binary or its Info.plist and manifest. They also feed the fingerprint, so after changing them an OTA would target a runtime that no installed binary has.\n\nPure TS logic, styles and constants are bundle-only, which is exactly what `ota-preview` ships on every merge to `main`. Learning to classify a change quickly (\"does this touch a native dependency or `app.config.ts`?\") is the day-to-day skill of release engineering, and the fingerprint check automates it.\n\nSee **The one rule that prevents disaster** in the Release section.",
    },
    {
      id: "podcast-player-36",
      type: "mcq",
      level: 3,
      topics: ["Testing", "Release & CI", "Expo Config & EAS"],
      files: [
        ".maestro/podcast-smoke.yaml",
        ".maestro/store-checkout.yaml",
        ".github/workflows/ci.yml",
        "eas.json",
        "app.config.ts",
      ],
      prompt:
        "Both Maestro flows start with `appId: ${APP_ID}` instead of a literal bundle id, and the `maestro-smoke` job passes `env: APP_ID=org.imaginativeworld.whynotreactnative.preview` to Maestro Cloud. What would break if the flows hardcoded `org.imaginativeworld.whynotreactnative.dev`, which is what you install locally?\n\nSearch: read `appId:` at the top of both files in `.maestro/`, the `env:` block of `maestro-smoke` in `ci.yml`, and the `idSuffix`/variant logic in `app.config.ts`.",
      choices: [
        "The CI job would fail at `launchApp`. It builds the `preview` profile (`APP_VARIANT=preview`), and `app.config.ts` gives that variant its own id, `….preview`, so no app with the `.dev` id is installed",
        "Nothing. Maestro ignores `appId` when an `app-file` is uploaded",
        "The job would be skipped, because Maestro can't run on `ubuntu-latest`",
        "The build step would fail, because EAS can't produce APKs for the `.dev` id",
      ],
      answer: 0,
      links: [
        { title: "Maestro documentation", url: "https://docs.maestro.dev/" },
        { title: "Maestro Cloud GitHub Action", url: "https://github.com/mobile-dev-inc/action-maestro-cloud" },
      ],
      explain:
        "`app.config.ts` gives each variant its own id (`.dev`, `.preview`, none) so they install side by side, and Maestro launches the app by id. A hardcoded `.dev` id suits a local dev client but not the preview APK that CI builds. Parameterising it keeps one flow for every variant: locally you run `maestro test -e APP_ID=org.imaginativeworld.whynotreactnative.dev .maestro/podcast-smoke.yaml`, and CI passes the preview id.\n\nThe test runs on Maestro Cloud (`action-maestro-cloud`), so the runner OS does not matter, and `eas.json` sets `android.buildType: \"apk\"` for preview. The job uploads the whole `.maestro` workspace, so the store flow needs the same parameter. The doc's **Maestro flows** section walks through the smoke flow and its `testID`s.",
    },
    {
      id: "podcast-player-37",
      type: "explain",
      level: 3,
      topics: ["Media", "Architecture"],
      files: [
        "src/projects/podcast-player/playback/interruptions.ts",
        "src/projects/podcast-player/playback/service.ts",
        "src/app/projects/podcast-player/player.tsx",
      ],
      prompt:
        "The comment in `interruptions.ts` says expo-audio already handles interruptions, headphone unplugging and lock-screen commands natively, yet fires no JS event for them. Explain why the service still tracks user intent and classifies status transitions, and what would go wrong without it.\n\nSearch: read the header comment of `playback/interruptions.ts` and `onStatus` in `service.ts`; find where `command()` is called and where `pausedExternally` is set.",
      model:
        "Natively, expo-audio pauses on an interruption or route change and resumes only the players it paused, and only with `shouldResume`. Remote commands also act on the player directly. JS sees only the status stream: the player stops or starts without the service having asked. The service records the user's intent through `tracker.command()` on every play/pause it issues, and `observe()` labels unexplained transitions as `externalPause` or `externalPlay`, flipping intent to match. On `externalPause` it flushes progress and sets `pausedExternally`, so the player shows \"Paused by the system\". Without this, the service's idea of what the user wants would drift (it could auto-resume after a pause made from the lock screen), progress wouldn't be saved at the moment of interruption, and the UI couldn't explain why audio stopped. The tracker ignores buffering flips and the 1.2 s after each command, so its own actions aren't misread.",
      rubric: [
        "Native code handles the interruption, but JS only sees status changes with no reason attached",
        "Intent is recorded on each command, and unexplained transitions are classified against it",
        "On externalPause: intent becomes pause, progress is flushed, `pausedExternally` is set for the UI",
        "Without it: wrong state, possible unwanted auto-resume, lost progress",
        "Mentions the buffering and command-window guards (or the Android \"becoming noisy\" gap)",
      ],
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
      ],
      explain:
        "Natively, expo-audio pauses on an interruption or route change and resumes only the players it paused, and only with `shouldResume`. Remote commands also act on the player directly. JS sees only the status stream: the player stops or starts without the service having asked.\n\nThe service records the user's intent through `tracker.command()` on every play/pause it issues, and `observe()` labels unexplained transitions as `externalPause` or `externalPlay`, flipping intent to match. On `externalPause` it flushes progress and sets `pausedExternally`, so the player shows \"Paused by the system\". Without this, the service's idea of what the user wants drifts (it could auto-resume after a pause made from the lock screen), progress is not saved at the moment of interruption, and the UI cannot explain why audio stopped.\n\nThis is the doc's \"resuming after every interruption\" failure mode; see **Audio session model**.",
    },
    {
      id: "podcast-player-38",
      type: "explain",
      level: 3,
      topics: ["File System", "Offline & Sync", "Background Tasks"],
      files: [
        "src/projects/podcast-player/downloads/manager.ts",
        "src/projects/podcast-player/downloads/paths.ts",
      ],
      prompt:
        "Walk through `checkpointAll()`. What happens to an active download when the app goes to the background? Why does the stored snapshot hold a `relativePath` instead of the `fileUri` from `savable()`? And what is the `checkpoint` deferred in `ActiveTransfer` for?\n\nSearch: read `checkpointAll()` and the `checkpoint` handling inside `run()` in `downloads/manager.ts`, plus `toRelativePath` in `paths.ts`.",
      model:
        "On `background`/`inactive`, `checkpointAll()` handles each active transfer: it creates a deferred, sets it as `t.checkpoint`, calls `pauseAsync()`, and saves `task.savable()` as JSON with the file URI turned into a path relative to Documents (`toRelativePath`). It then calls `resumeAsync()` and resolves the deferred with that new promise, so the download keeps going, but only if the task is still `paused` and has no `stopReason`: a user pause or the network rule that landed during the checkpoint resolves the deferred with `null` instead, so the runner ends as a real pause rather than undoing it. Inside `run()`, the paused op resolves with `null`. Because `transfer.checkpoint` is set, the loop waits on `cp.promise` instead of treating it as a real pause. If the OS kills the app, `rehydrate()` turns `downloading` back into `queued`, and `run()` rebuilds the task with `DownloadTask.fromSavable` and `resolveUri(relativePath)`, continuing from the saved byte. An absolute `fileUri` would point into the old container UUID after a reinstall or some updates, and the resume would fail. A failed resume goes through `onFailure`, which clears the snapshot and retries from scratch.",
      rubric: [
        "On background: pause, save the snapshot, resume immediately (the transfer keeps going)",
        "The snapshot stores a relative path, because the iOS container path can change",
        "The checkpoint deferred stops `run()` from treating the snapshot pause as a user or network pause (and a real pause during the checkpoint is not resumed)",
        "After a kill: rehydrate re-queues the row and `fromSavable` resumes from the saved byte",
        "Fallback: an unusable snapshot is dropped and the download restarts",
      ],
      links: [
        { title: "expo-file-system API reference (DownloadTask)", url: "https://docs.expo.dev/versions/latest/sdk/filesystem" },
        { title: "expo-task-manager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager" },
      ],
      explain:
        "The JS side of a `DownloadTask` does not survive the process. On iOS the native transfer runs on a background URLSession and may keep going while the app is suspended, but if the app is killed the promise, progress callbacks and DB bookkeeping are gone (and Android stops the transfer with the process). So the manager checkpoints whenever it might lose the process: pause, save `savable()`, resume.\n\nThe `checkpoint` deferred tells `run()` that the `null` from the paused promise is a snapshot, not a real pause, so the loop waits for the resumed operation. It resumes only when `state === \"paused\" && !t.stopReason`; if the user (or the Wi-Fi rule) paused the task while the snapshot was being written, the deferred resolves `null` and the download stays paused. The snapshot stores `relativePath` rather than the `fileUri`, because the DB never stores absolute paths and a changed container would make the resume fail. A failed resume goes through `onFailure`, which clears the snapshot and retries from scratch.\n\nSee \"Lifecycle you must get right\" in the Download manager section.",
    },
    {
      id: "podcast-player-39",
      type: "explain",
      level: 3,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: [
        ".github/workflows/release.yml",
        "eas.json",
        "app.config.ts",
        "docs/05-release.html",
        "src/app/projects/podcast-player/settings.tsx",
      ],
      prompt:
        "On every merge to `main`, `release.yml` runs `eas update --channel preview --environment preview` with `APP_VARIANT: preview` set on the step. Explain why it publishes by **channel** rather than with `--branch <name>`, why the step needs `APP_VARIANT` even though `eas.json` already sets it for the `preview` profile, and how you'd diagnose a tester with a fresh `preview` build who still gets nothing.\n\nSearch: read the `ota-preview` step in `release.yml`, `channel` and `env` in `eas.json`, and the Settings screen's build info (`settings.tsx`). Compare with EAS Update's \"how it works\" page.",
      model:
        "A build has a channel baked in: `eas.json` gives `preview` the channel `preview`. Each channel reads a branch, and that mapping lives on the server. Publishing with a hardcoded `--branch staging` would only reach testers if someone also ran `eas channel:edit preview --branch staging`; otherwise the update would land on a branch no build reads, and nobody would get it. `--channel preview` publishes to whatever branch the channel points at (by default a same-named `preview` branch, created on first use), so the update and the builds can't disagree. `APP_VARIANT` matters because `eas.json`'s `env` applies to builds only. `app.config.ts` changes the bundle id and name per variant, and with the fingerprint policy the whole app config feeds the runtime version. Without `APP_VARIANT=preview`, the update would be stamped with the development runtime version, which no preview binary has. To diagnose: `eas channel:view preview` shows which branch the channel reads and its latest update. Then compare runtime versions: if `main` changed native inputs after the tester's build, the update targets a new runtime and their binary ignores it, and the fix is a new preview build. On the device, podcast Settings shows the build's Channel, Runtime version and whether it's running the embedded bundle or an update id. Channel surfing there offers only the channels that exist (`development`, `preview`, `production`), and it too only delivers updates with a matching runtime.",
      rubric: [
        "Build → channel (baked in) → branch (server-side mapping) → update; publishing to an unmapped branch reaches nobody",
        "`--channel preview` follows the channel's current branch, so CI can't publish where no build reads",
        "`eas.json` `env` is build-only; the app config (per `APP_VARIANT`) feeds the fingerprint, so the update needs the same variant",
        "Diagnose with `eas channel:view` and a runtime-version comparison; a changed fingerprint needs a new build",
        "Uses the Settings info (channel, runtime version, embedded or update id) to verify on the device",
      ],
      links: [
        { title: "EAS Update: publish an update", url: "https://docs.expo.dev/eas-update/getting-started" },
        { title: "How EAS Update works", url: "https://docs.expo.dev/eas-update/how-it-works" },
        { title: "EAS CLI reference", url: "https://docs.expo.dev/eas/cli" },
      ],
      explain:
        "Most \"OTA didn't arrive\" incidents come down to channel/branch mapping or runtime compatibility. A build has a channel baked in; each channel reads a branch, and that mapping lives on the server. Publishing with `--channel preview` follows whatever branch the channel points at, so CI cannot publish where no build reads. A hardcoded `--branch` only works if someone also ran `eas channel:edit`.\n\n`APP_VARIANT` is the subtle half: `eas.json`'s `env` applies to builds only, while `app.config.ts` changes the bundle id and name per variant and feeds the fingerprint. Without the variant on the publish step, the update gets the development runtime version, which no preview binary has. When you publish by branch yourself (a `release-1.4` rollout), run `eas channel:view` first.\n\nSee failure modes 8 and 9 and **Publishing needs the same APP_VARIANT**.",
    },
    {
      id: "podcast-player-40",
      type: "explain",
      level: 3,
      topics: ["Background Tasks", "Architecture"],
      files: [
        "src/projects/podcast-player/downloads/task.ts",
        "src/app/_layout.tsx",
        "src/app/projects/podcast-player/_layout.tsx",
        "src/projects/podcast-player/stores/settingsStore.ts",
      ],
      prompt:
        "`TaskManager.defineTask(PODCAST_BACKGROUND_TASK, …)` runs at module scope in `downloads/task.ts`, and the **root** `src/app/_layout.tsx` imports that module. But `registerBackgroundTask()` is only called from the podcast **project** layout, and the task body awaits `ensureSettingsHydrated()` before doing anything else. Explain why the definition and the registration live in different places (and why registration isn't moved to the root too), what the task does when it runs, and what would go wrong without the hydration await.\n\nSearch: compare `src/app/_layout.tsx` (what it imports from `downloads/task.ts`) with the project `_layout.tsx` (what it calls), and read `ensureSettingsHydrated` in `settingsStore.ts`.",
      model:
        "The OS can launch the app headless (no UI, no project layout mounted) to run a registered task. The task definition has to exist as soon as the JS bundle loads, so it lives at module scope and is imported by the root layout; if only the project layout imported it, a background launch would find no handler. It's guarded with `isTaskDefined` so fast refresh doesn't define it twice. Registration (`BackgroundTask.registerTaskAsync` with `minimumInterval: 60` minutes, only a hint, since the OS decides the real cadence) persists across launches, so doing it once when the user first opens the project is enough, and it's skipped when the status isn't `Available`. Registering from the root would be cheap and needs no permission, but it would wake the app periodically to open the podcast database and run the download manager for people who never used this project. When it runs, the task awaits `ensureSettingsHydrated()`, then calls `refreshSubscriptions()` (conditional GETs, with at most 2 auto-downloads per show) and `downloadManager.kick()` (init/rehydrate, then pump), returning `Success` or `Failed`. Without the await, `getSettings()` is a synchronous read of a Zustand store that hydrates from AsyncStorage asynchronously. On a headless launch nothing has waited for it yet, so the manager could read `DEFAULT_SETTINGS`: Wi-Fi only, the default storage cap and concurrency, instead of the user's choices. `ensureSettingsHydrated()` uses `persist.rehydrate()`, whose promise also settles if the storage read fails, so the task can't hang. Another limit: the task gets a short OS window, and the transfers it starts are ordinary `DownloadTask`s, not a background-transfer service.",
      rubric: [
        "Definition at module scope so it exists on a headless launch; that's why the root imports it",
        "Registration persists and only needs to happen once, from the project layout; the interval is a hint",
        "Root registration would wake the app for users who never opened the project; user-facing setup waits for the project",
        "Task body: hydrate settings, refresh subscriptions, then kick the download manager; returns Success or Failed",
        "Without the await, `getSettings()` can return `DEFAULT_SETTINGS` before AsyncStorage hydration finishes",
      ],
      links: [
        { title: "expo-background-task", url: "https://docs.expo.dev/versions/latest/sdk/background-task" },
        { title: "expo-task-manager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager" },
        { title: "Zustand: persisting store data", url: "https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data.html" },
      ],
      explain:
        "The OS can launch the app headless (no UI, no project layout mounted) to run a registered task. The definition has to exist as soon as the JS bundle loads, so it lives at module scope and is imported by the root layout (guarded with `isTaskDefined` so fast refresh does not define it twice). Registration persists across launches, so doing it once when the user first opens the project is enough, and it is skipped when the status is not `Available`. Registering from the root would wake the app periodically, opening the podcast database, for people who never used this project.\n\nWhen it runs, the task awaits `ensureSettingsHydrated()`, calls `refreshSubscriptions()` and `downloadManager.kick()`, and returns `Success` or `Failed`. Without the await, `getSettings()` can return `DEFAULT_SETTINGS` (Wi-Fi only, default cap) instead of the user's choices; `persist.rehydrate()` settles even when the storage read fails, so the task cannot hang. The OS gives a short window, and transfers are ordinary `DownloadTask`s, not a background-transfer service.\n\nSee **Architecture decisions** (\"Root-level download task\").",
    },
    {
      id: "podcast-player-41",
      type: "explain",
      level: 3,
      topics: ["Architecture", "Reanimated", "Performance"],
      files: [
        "src/projects/podcast-player/containers/MiniPlayerHost.tsx",
        "src/projects/podcast-player/components/player/MiniPlayer.tsx",
        "src/app/projects/podcast-player/_layout.tsx",
      ],
      prompt:
        "The repo's rule is that components are dumb: plain data and callbacks, no stores. `MiniPlayerHost` reads `usePlayerStore` and calls `playbackService`, so it lives in `containers/`, not `components/`. Explain what that split buys, how `MiniPlayer` stays dumb, and how the host keeps position ticks and the drag-to-expand gesture cheap.\n\nSearch: compare imports in `containers/MiniPlayerHost.tsx` and `components/player/MiniPlayer.tsx`, and find where the `progressBar` slot is filled and where `expand` is defined.",
      model:
        "`MiniPlayerHost` is a container: it's mounted once by the project layout and bridges the player store and service to the presentational `components/player/MiniPlayer`, which only gets `title`, `playing`, `hasNext` and callbacks like `onTogglePlay`/`onNext`, so it could be reused or previewed with any data. Keeping it in `containers/` makes the rule checkable by location: nothing under `components/` imports a store or a service, and the files that do (the host and the `Live*Row` wrappers) are easy to find. Position changes twice a second, so the host doesn't pass it as a prop. It passes a `progressBar` slot holding `<NowPlayingProgress />`, which subscribes to `status.position` itself, so only the bar re-renders. Drag-to-expand runs on the UI thread: one shared value `expand` (0 to 1) drives the sheet's translate, the artwork scale, and the gradient and mini-player opacity through `useAnimatedStyle`. When the spring settles at 1, `scheduleOnRN(openPlayer, \"drag\")` pushes `/player`, which the layout presents as a `transparentModal` with `animation: \"none\"` for `from=drag`, so the handover is invisible. `useSegments()` lets the host dock above the tab bar and hide itself while the player is on top.",
      rubric: [
        "The host is a container in `containers/` (one per project layout); `MiniPlayer` in `components/` takes only props and callbacks",
        "The folder split keeps `components/` free of store and service imports, so the rule is visible and checkable",
        "The position slot (`progressBar` / `NowPlayingProgress`) limits re-renders to the bar",
        "One shared value drives every animated style on the UI thread; `scheduleOnRN` hands the end of the gesture to the router",
        "`useSegments` controls docking and visibility",
      ],
      links: [
        { title: "Reanimated: worklets guide", url: "https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets" },
        { title: "Expo Router: typed routes and useSegments", url: "https://docs.expo.dev/router/reference/typed-routes" },
      ],
      explain:
        "`MiniPlayerHost` is a container: it is mounted once by the project layout and bridges the player store and service to the presentational `components/player/MiniPlayer`, which only gets `title`, `playing`, `hasNext` and callbacks. Keeping containers in their own folder makes the rule checkable by location: nothing under `components/` imports a store or a service.\n\nPosition changes twice a second, so the host does not pass it as a prop. It passes a `progressBar` slot holding `<NowPlayingProgress />`, which subscribes itself, so only the bar re-renders. Drag-to-expand runs on the UI thread: one shared value `expand` (0 to 1) drives translate, artwork scale and opacities through `useAnimatedStyle`, and `scheduleOnRN(openPlayer, \"drag\")` pushes `/player` at the end, which the layout shows without animation so the handover is invisible. If the host re-rendered with every tick, the drag would stutter.\n\nSee **Architecture decisions** and Milestone M4.",
    },
    {
      id: "podcast-player-42",
      type: "mcq",
      level: 3,
      topics: ["Media", "Testing"],
      files: [
        "src/projects/podcast-player/playback/service.ts",
        "src/projects/podcast-player/playback/sleepTimer.ts",
        "src/projects/podcast-player/__tests__/sleepTimer.test.ts",
      ],
      prompt:
        "In `PlaybackService.onFinished()`, the sleep option is read into `optionAtFinish` **before** `await saveProgress(...)`, and the auto-advance check is `shouldAdvanceAfterFinish(optionAtFinish, this.sleepFired)`. Why not just read `usePlayerStore.getState().sleepOption` after the await, as a simpler version would?\n\nSearch: read `onFinished()` and `onExpire` in `playback/service.ts`, `shouldAdvanceAfterFinish` in `sleepTimer.ts`, and its cases in `sleepTimer.test.ts`.",
      choices: [
        "The timer's own expiry races the finish event and sets `sleepOption` to `off`. It can fire just before the event (the position reaches the end while status still says playing) or, for a minutes timer, during the await. A later read would see `off` and start the next queued episode after the user asked to sleep",
        "Zustand's `getState()` can't be called after an `await`, because the store is only readable synchronously during a render",
        "`saveProgress` resets the player store, so `sleepOption` is always `off` after it resolves",
        "It's only a micro-optimisation: reading the store once instead of twice avoids a re-render",
      ],
      answer: 0,
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
      ],
      explain:
        "Both the timer's `onExpire` (`pause()`, then `sleepOption: off`) and `onFinished` act on the same decision, so it has to be made in one place from facts that cannot change underneath it. The option is captured synchronously when the finish event arrives, and `sleepFired` (set in `onExpire`, cleared by `play()`, an autoplay `load()` or an external play) remembers that the timer already paused playback even after it switched itself off.\n\nWithout the capture, the failure is user-visible: the user sets a sleep timer, falls asleep, and the next queued episode starts at 3 a.m. `sleepTimer.test.ts` covers both halves: an end-of-episode timer expires on its own once the remaining time hits 0 while still playing, it stays inert once status says stopped (expo-audio's `didJustFinish` status carries `playing: false`), and `shouldAdvanceAfterFinish` refuses to advance in every timer case.\n\nSee failure mode 11 and the sleep timer bullet in the Audio section.",
    },
    {
      id: "podcast-player-43",
      type: "mcq",
      level: 3,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: [".github/workflows/fingerprint.yml", "docs/05-release.html", "app.config.ts"],
      prompt:
        "`fingerprint.yml` runs `eas fingerprint:compare --build-id … --environment production --json`, compares `fingerprint1.hash` with `fingerprint2.hash`, and emits a `::warning::` on drift. The step also sets `APP_VARIANT: production` and starts with `set -euo pipefail`. Which statement matches how the job behaves?\n\nSearch: read the `env:` and `run:` of the compare step in `fingerprint.yml` and the `fingerprint:compare` entry in the EAS CLI reference.",
      choices: [
        "`fingerprint:compare` exits 0 whether or not the hashes match, so drift is read from the JSON and reported as a warning while the job stays green (drift after native work is expected). Real errors such as auth, `build:list` or unparseable output fail the job. `APP_VARIANT` is needed because the app config differs per variant and feeds the fingerprint",
        "`fingerprint:compare` exits non-zero on drift, so the JSON parsing is only there to print a nicer message",
        "Any failure, including an auth error, becomes a drift warning, so the job can never fail",
        "`APP_VARIANT` only selects which EAS project to query, so leaving it out would make `build:list` return nothing",
      ],
      answer: 0,
      links: [
        { title: "EAS CLI reference", url: "https://docs.expo.dev/eas/cli" },
        { title: "EAS environment variables", url: "https://docs.expo.dev/eas/environment-variables/usage" },
        { title: "GitHub Actions documentation", url: "https://docs.github.com/en/actions" },
      ],
      explain:
        "The job is warn-only for drift by design: a changed fingerprint means \"the next release needs a store build, not an OTA\", which is information, not breakage. The exit code cannot carry it, because the CLI returns success either way, so the step parses the `--json` output, buffering all of stdin before `JSON.parse` (a large document arrives in several chunks).\n\nErrors still have to be loud, which is why the step uses `set -euo pipefail` and nothing swallows a failing command with `|| echo`. The local fingerprint must be computed with the production build's inputs: `eas.json`'s `env` only applies to builds, and `app.config.ts` changes the bundle id and name per `APP_VARIANT`, so without it every night would report false drift. `--environment production` pulls the EAS server-side variables the build saw.\n\nSee the nightly entry in the doc's **CI pipeline** and Milestone M7.",
    },
    {
      id: "podcast-player-44",
      type: "mcq",
      level: 3,
      topics: ["SQLite", "Architecture"],
      files: [
        "src/projects/podcast-player/db/queries.ts",
        "src/projects/podcast-player/utils/serial.ts",
        "src/projects/podcast-player/__tests__/serial.test.ts",
      ],
      prompt:
        "`upsertEpisodes`, `saveQueue` and `updateDownloads` in `db/queries.ts` no longer call `db.withTransactionAsync()` directly. They go through `writeTransaction(db, task)`, which runs `transactions.run(() => db.withTransactionAsync(task))` on a `createSerialQueue()`. What goes wrong without the queue?\n\nSearch: read the comment above `writeTransaction` in `db/queries.ts`, `createSerialQueue` in `utils/serial.ts`, and the `withTransactionAsync` entry in the expo-sqlite docs.",
      choices: [
        "`withTransactionAsync` is a plain `BEGIN … COMMIT` on the one shared connection. When a feed upsert and a queue save overlap, the second `BEGIN` fails, and that call's `ROLLBACK` undoes the first transaction's writes, so data silently disappears",
        "expo-sqlite queues transactions natively, so the JS queue only makes them run in call order",
        "Without the queue, the second transaction deadlocks waiting for the first, freezing the JS thread",
        "WAL mode allows only one transaction per second, so the queue throttles them",
      ],
      answer: 0,
      links: [
        { title: "expo-sqlite API reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
      ],
      explain:
        "On a shared connection a transaction is connection state, not a lock: queries started elsewhere while it is open run inside it, and a second `BEGIN` fails with \"cannot start a transaction within a transaction\". Its error path then issues `ROLLBACK`, which rolls back the transaction that is actually open, the first caller's. The playback service, the download manager and feed sync are separate singletons that can all write at once, so this is not hypothetical.\n\n`createSerialQueue()` is a promise chain: each task starts after the previous one settles, and a failing task rejects only its own caller (`tail.then(task, task)`, with the rejection swallowed on the chain). `withExclusiveTransactionAsync()` is the library's other option, but it opens a separate connection (native only), and competing writes then fail with \"database is locked\" instead of waiting.\n\nSee the warning under **Data model** and the \"Overlapping SQLite transactions\" failure mode.",
    },
    {
      id: "podcast-player-45",
      type: "multi",
      level: 2,
      topics: ["Media"],
      files: [
        "src/projects/podcast-player/playback/service.ts",
        "src/projects/podcast-player/playback/progress.ts",
        "src/projects/podcast-player/__tests__/playbackRules.test.ts",
      ],
      prompt:
        "Which of these expo-audio behaviours does `PlaybackService` work around? Select all that apply.\n\nSearch: read `play()`, `replaceSource()` and `releaseLocalFile()` in `playback/service.ts`, and `isAtEnd` in `playback/progress.ts`.",
      choices: [
        "Calling `play()` on a player parked at the end of its item does nothing, so `play()` seeks to 0 first when `finished` is set or `isAtEnd()` is true (within 0.5 s of the end)",
        "`replace()` resumes playback on its own when the old item was playing, so `replaceSource()` calls `pause()` before `replace()`",
        "A file being played can't simply be deleted, so `releaseLocalFile()` moves the current episode onto its stream URL at the same position before the download is removed",
        "`seekTo()` is ignored until the item has been played once, so the service always calls `play()` before seeking",
        "`setPlaybackRate()` resets after every `replace()`, so the rate is stored only in SQLite",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "expo-audio API reference", url: "https://docs.expo.dev/versions/latest/sdk/audio" },
      ],
      explain:
        "All three are real failure modes from building this app. The end-of-item rule shows up as \"play does nothing after an episode ends\": `onStatus` sets `finished` on the finish event, and `play()` rewinds, then starts only if the user has not paused in the meantime. The `replace()` auto-resume would play a new episode from 0:00 until the resume seek lands, so the service pauses first and lets `onStatus` start playback once the pending seek completes. `releaseLocalFile()` reuses the same pending-seek path to continue on the stream, and `removeMany()` refuses to delete a file the player still reads.\n\nThe last two choices are invented: the service seeks before playing (that is what `pendingSeek` is for), and `replaceSource()` sets the rate right after `replace()`; the session rate is stored in the `kv` table.\n\nSee \"Progress, resume and the sleep timer\" in **Audio session model** and the failure modes list.",
    },
  ],
});

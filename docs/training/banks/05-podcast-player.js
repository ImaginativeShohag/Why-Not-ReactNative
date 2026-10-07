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
        "Open `playback/service.ts`. The app has exactly one `AudioPlayer`, created with `createAudioPlayer()` inside a module-scope `PlaybackService` instance (`playbackService`), not with a hook inside a screen.\n\nWhat is the main reason for this design?",
      choices: [
        "The singleton lives at module scope and outlives every screen, so navigating anywhere (even back to the launcher) never unmounts the player or stops the audio",
        "expo-audio's hooks don't work with the New Architecture, so `createAudioPlayer()` is the only API that works",
        "Expo Router layouts can't call hooks, so the player had to move out of React",
        "A singleton lets every screen create its own `AudioPlayer` without the players fighting over the audio session",
      ],
      answer: 0,
      explain:
        "The header comment in `service.ts` says it directly: module scope, so it outlives every screen. A player owned by a component (for example through `useAudioPlayer`) is released when that component unmounts, and podcast audio has to keep going while you browse or leave the project. UI code sends commands (`playbackService.play()`, `.toggle()`, `.seekTo()`), status flows back through `usePlayerStore`, and nothing else holds a reference to the `AudioPlayer`.",
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
        "The journal and camera projects open SQLite with `<SQLiteProvider onInit>` in their layouts. The podcast project instead uses a lazily created module-scope `getDb()` in `db/client.ts`.\n\nWhy?",
      choices: [
        "Its main users (the playback service, the download manager and the background task) run outside the React tree, so they can't call `useSQLiteContext()`",
        "`SQLiteProvider` doesn't support WAL mode, which the podcast schema needs",
        "Only one `SQLiteProvider` can be mounted per app, and the journal already uses it",
        "`openDatabaseAsync` is faster than `SQLiteProvider`'s `onInit` for large databases",
      ],
      answer: 0,
      explain:
        "A provider only helps code that renders under it. `PlaybackService` and `DownloadManager` are plain classes, and the background task can run with no screen mounted, so they all call `getDb()`, which opens the file once, runs `migrate()` and caches the promise. If opening fails, the cache is cleared (`dbPromise = null`) so the next call can retry. WAL is turned on by `migrate()` itself, and several projects mount their own providers, so the other options are false.",
    },
    {
      id: "podcast-player-03",
      type: "text",
      level: 1,
      topics: ["SQLite"],
      files: ["src/projects/podcast-player/db/schema.ts"],
      prompt:
        "In `db/schema.ts`, `migrate()` reads a SQLite pragma to find out which entries of `MIGRATIONS` have already run, and sets it after each step. Which pragma is it? (Type its name.)",
      accept: ["user_version", "PRAGMA user_version", /user_version/i],
      explain:
        "`PRAGMA user_version` is an integer SQLite stores in the database header that SQLite itself never uses, which makes it a common migration counter. `migrate()` loops `while (version < MIGRATIONS.length)` and runs each step inside `withTransactionAsync` together with `PRAGMA user_version = next`. A crash in the middle of a migration therefore leaves the previous version intact. Migrations only move forward: you append to the array and never edit an entry that has shipped.",
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
        "Every key in `utils/queryKeys.ts` begins with the same first element. What is it? (Type the string.)",
      accept: ["podcast", /^\[?\s*["']?podcast["']?\s*\]?$/i],
      explain:
        "Every key starts with `\"podcast\"` (`podcastKeys.all = [\"podcast\"]`). The app has one `QueryClient`, shared by every project and exported from `QueryProvider.tsx`. The prefix means a blanket `invalidateQueries({ queryKey: podcastKeys.all })` (used by `useSubscribe` and `useRefreshSubscriptions`) can never touch the store's or journal's cache. The store project uses the same idea to persist only keys that start with `\"store\"`.",
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
        "The up-next queue holds episode ids `[a, b, c]`, in that order. Code calls `addNext(queue, \"c\")` from `playback/queue.ts`.\n\nType the resulting order of episode ids, comma-separated (for example `x, y, z`).",
      accept: [/^\[?\s*["']?c["']?\s*,\s*["']?a["']?\s*,\s*["']?b["']?\s*\]?$/i, "c a b", "cab"],
      hint: "Look at what `addNext` does to the existing entry before it prepends.",
      explain:
        "`addNext` returns `[{ episodeId, addedAt: now }, ...without(queue, episodeId)]`, so `c` moves to the front and is never duplicated. Every queue operation is pure, returns a new array and never produces duplicates. That's why `queue.test.ts` can cover them without a player. Compare `addLast`, which moves an existing entry to the end but keeps its original `addedAt`. Also note that the playing episode is never in the queue: `onStartPlaying` removes it, and `playNext`/`addToQueue` in the service ignore the current id.",
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
        "Where is `MiniPlayerHost` mounted, and what does that placement give you?",
      choices: [
        "It wraps the podcast project's `<Stack>` in `src/app/projects/podcast-player/_layout.tsx`, so it floats over every podcast screen (tabs, show, episode) and disappears when you back out to the launcher",
        "It's in the root `src/app/_layout.tsx`, so the mini player shows on every project in the app",
        "It's rendered as a tab-bar accessory inside `(tab)/_layout.tsx`, so it only appears on the four tabs",
        "Each screen renders its own `MiniPlayerHost` at the bottom of its content",
      ],
      answer: 0,
      explain:
        "The project layout renders `<MiniPlayerHost><Stack>…</Stack></MiniPlayerHost>`, which scopes the mini player to this project without the launcher knowing anything about it. Because it sits outside the tabs, it needs to know where the tab bar is. The tab layout fixes its height to `TAB_BAR_HEIGHT + insets.bottom`, and the host docks at that offset when `useSegments()` includes `(tab)`, or just above the safe area otherwise. It hides itself while the `player` route is on top.",
    },
    {
      id: "podcast-player-07",
      type: "mcq",
      level: 1,
      topics: ["Zustand", "Architecture"],
      files: ["src/projects/podcast-player/stores/settingsStore.ts"],
      prompt:
        "User preferences (skip intervals, Wi-Fi only, storage cap, and so on) are kept in a Zustand store persisted to AsyncStorage, even though the project already has a SQLite database. Which reason matches the code?",
      choices: [
        "They're tiny, and the singletons need a synchronous read: `getSettings()` is just `useSettingsStore.getState()`, which works without awaiting a query once the store has hydrated",
        "SQLite can't store booleans, and most settings are booleans",
        "AsyncStorage is encrypted at rest, and settings count as sensitive data",
        "So settings are shared with the other projects through a common AsyncStorage key",
      ],
      answer: 0,
      explain:
        "The file comment gives the reasons: tiny, read synchronously after hydration, needed by the singletons. `PlaybackService.skipForward()` and `DownloadManager.pump()` call `getSettings()` inline, and an async SQLite read there would add awaits to every path. The price of a synchronous read is that it returns `DEFAULT_SETTINGS` until hydration finishes, so code that can run before any screen (the headless background task) awaits `ensureSettingsHydrated()` first. `partialize` removes the `update` function from what gets persisted, and the key `podcast-player/settings` is scoped to this project, so the shared-key option is wrong. AsyncStorage isn't encrypted (that's expo-secure-store), and SQLite stores booleans as integers without trouble.",
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
        "The `XMLParser` in `feeds/parse.ts` is created with `parseTagValue: false` and `parseAttributeValue: false`. Why?",
      choices: [
        "To keep every value as a string, so `0042` episode numbers and `1:02` durations aren't coerced to numbers. The code parses them deliberately with `toInt` and `parseDuration`",
        "To turn off entity decoding, so `&amp;` stays escaped in titles",
        "To force tags like `item` and `enclosure` to always be arrays",
        "To skip tag text for speed, since all feed data is read from attributes",
      ],
      answer: 0,
      explain:
        "fast-xml-parser coerces numeric-looking text by default. `0042` would become `42`, and some duration strings could be misread as numbers. Keeping strings and parsing later puts the defensive logic in one place (`parseDuration` accepts `3725`, `62:05`, `1:02:05`, garbage and so on). Entity decoding is controlled by `processEntities`/`htmlEntities`, and forcing arrays is done by `isArray` with `ARRAY_TAGS`. Those are separate options.",
    },
    {
      id: "podcast-player-09",
      type: "text",
      level: 1,
      topics: ["Expo Config & EAS", "Release & CI"],
      files: ["app.config.ts", "docs/release-05.md"],
      prompt:
        "Which `runtimeVersion` policy does `app.config.ts` use? (Type the policy name.)",
      accept: ["fingerprint", /policy:\s*["']?fingerprint/i, /^\{?\s*policy\s*:\s*["']?fingerprint["']?\s*\}?$/i],
      explain:
        "`runtimeVersion: { policy: \"fingerprint\" }` derives the runtime version from a hash of the native inputs: native dependencies, config plugins and app config. Change any of them and new builds get a new runtime version, so an OTA built from that JS can't reach an older binary that lacks the native code. Compare `appVersion`, which only changes when you bump `version`, so a human has to remember to bump it after every native change.",
    },
    {
      id: "podcast-player-10",
      type: "multi",
      level: 1,
      topics: ["Release & CI", "Testing"],
      files: [".github/workflows/ci.yml"],
      prompt:
        "Select all that apply: which steps run in the `checks` job of `ci.yml`?",
      choices: [
        "`npm run typecheck`",
        "`npm run lint`",
        "Jest with `--ci --no-watchman`",
        "`npx expo export` for iOS and for Android",
        "The Maestro podcast smoke flow",
        "`eas update` to the preview channel",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "`checks` runs typecheck, lint, unit tests and a bundle for both platforms. The export step catches what tsc and eslint can't, such as Metro resolution, expo-router's ban on `@react-navigation/*` imports, and platform-specific files. Maestro is a separate `maestro-smoke` job that `needs: checks` and runs only when the PR has the `e2e` label. Publishing OTAs is `release.yml`'s job, never CI's.",
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
        "The `downloads.relative_path` column stores paths like `podcasts/itunes-123/ep_abc.mp3`. The absolute URI is never stored. Why?",
      choices: [
        "The absolute iOS container path (`…/Application/<UUID>/Documents/…`) can change on reinstall and some updates, so the path is resolved against the current `Paths.document` every time it's read",
        "SQLite `TEXT` columns are limited to 255 characters, and absolute paths are too long",
        "expo-file-system's `File` constructor only accepts relative paths",
        "Android scoped storage forbids storing absolute paths in app databases",
      ],
      answer: 0,
      explain:
        "Stored absolute paths stop working when the container UUID changes, and every downloaded file looks missing. `resolveRelativePath()` joins the current documents URI with the stored path and refuses anything with a scheme, a leading `/` or `..`. `toRelativePath()` can even recover a relative path from an old container's absolute URI by anchoring on `/podcasts/`. `downloads.test.ts` covers all of this under \"the container-UUID trap\".",
    },
    {
      id: "podcast-player-12",
      type: "mcq",
      level: 2,
      topics: ["Media", "Testing"],
      files: ["src/projects/podcast-player/playback/progress.ts"],
      prompt:
        "An episode has `duration = 3600`. Its saved progress is `{ position: 600, played: false }`. What does `resolveResumePosition(saved, 3600)` return?",
      choices: ["598", "600", "0", "595"],
      answer: 0,
      explain:
        "Start over (return 0) if the episode is marked played, if the position is under 5 s, or if `isPlayed()` says it's within the end threshold (`min(30, duration × 5% + 5)`, which is 30 s here). Otherwise it returns `position - 2`, rewinding a little so the listener gets their bearings back. 600 is nowhere near the end, so the answer is 598. `PlaybackService.load()` passes this value as the pending seek.",
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
        "When a download finishes, `invalidateDownloads()` calls `invalidateQueries({ queryKey: podcastKeys.shows() })`, which is `[\"podcast\", \"show\"]`. It never names `podcastKeys.showEpisodes(id)`. Yet the show screen's episode list (`[\"podcast\", \"show\", id, \"episodes\"]`) refetches. Why?",
      choices: [
        "`invalidateQueries` matches keys by prefix by default, so `[\"podcast\", \"show\"]` also marks every `[\"podcast\", \"show\", id, …]` query stale (the show, its episodes and its auto-download flag)",
        "`showEpisodes` is invalidated by a separate call further down in `invalidateDownloads()`",
        "TanStack Query refetches every active query whenever any invalidation happens",
        "It doesn't refetch. The row only updates because `LiveEpisodeRow` reads the live download store",
      ],
      answer: 0,
      explain:
        "Query keys are hierarchical. Without `exact: true`, invalidation hits every query whose key starts with the filter, and that's why the key factory nests `showEpisodes` and `showAutoDownload` under `show`. A side effect worth knowing: `[\"podcast\", \"show\", id]` is `usePodcast`'s key, and its `queryFn` may call `syncFeed` when the cached feed is older than 30 minutes. A finished download can therefore trigger a feed refresh too.",
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
        "Screens don't pass live download progress into `EpisodeRow`. They render `containers/LiveEpisodeRow`, which subscribes to `useDownloadStore((s) => s.live[episodeId])` itself, merges the result with a persisted `fallback`, and renders the dumb `components/episode/EpisodeRow` with plain props. Why split it this way?",
      choices: [
        "So a progress tick re-renders only the row that's downloading, not the whole list or screen, while `EpisodeRow` stays a dumb component. The persisted state from the query row is used until live data exists",
        "Because FlashList doesn't allow Zustand selectors in `renderItem`",
        "So each progress tick is written to SQLite by the row",
        "Because the project's rules forbid passing download state to components as props",
      ],
      answer: 0,
      explain:
        "Native progress events fire many times a second. If the screen subscribed to the whole `live` map, every tick would re-render the full list. The narrow selector `s.live[episodeId]` limits the work to one row, and `mergeDownload()` combines it with the SQL row's `downloadState`/`downloadedBytes` so every list shows the same badge without re-querying. Lifting the subscription to the screen would keep things simple but cost that performance, so the per-row subscription stays, in a connected wrapper under `containers/`. `EpisodeRow` in `components/` still takes only data and callbacks, which is the repo's rule. The manager reduces the load further: it pushes to the store only when the whole percent changes (`progressStep`) and writes to SQLite at most every 3 s.",
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
        "Which function in `utils/downloadView.ts` combines a `LiveDownload` (or `undefined`) with the persisted `{ state, bytes }` and returns `{ state, progress, bytesWritten, totalBytes }`? (Type the function name.)",
      accept: ["mergeDownload", "mergeDownload()"],
      explain:
        "`mergeDownload(live, fallback)` gives live data priority over the persisted values and always reports `progress = 1` for `done`. Screens call it and pass plain values to dumb rows: `player.tsx` passes `downloadState` and `downloadProgress` into `FullPlayerView`. That follows the repo's rule that components receive data and callbacks, never stores.",
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
        "A download fails for the 3rd time (`attempts = 3`). `onFailure` sets `nextAttemptAt = now + backoffDelayMs(3)`. What range can that delay fall in?",
      choices: [
        "Between 4,000 and 8,000 ms",
        "Exactly 8,000 ms",
        "Between 0 and 8,000 ms",
        "Between 6,000 and 10,000 ms",
      ],
      answer: 0,
      explain:
        "`exp = min(5 min, 2000 × 2^(attempt − 1)) = 8000`, and the function returns `exp/2 + random × exp/2`. That's \"equal jitter\": half fixed, half random. The jitter stops a burst of failures (say, the network dropped) from retrying in lockstep, and the fixed half guarantees a minimum wait, which full jitter (0..8000) doesn't. `shouldRetry(attempts)` allows up to `MAX_ATTEMPTS = 5`. After that the row becomes `failed` and the snapshot is cleared.",
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
        "The storage cap is full, and every downloaded episode is **unplayed**. The user taps download on another episode. What happens?",
      choices: [
        "`chooseEvictions` evicts nothing (only played episodes can be evicted) and returns `fits: false`, so `start()` marks the download `failed` with \"Storage cap reached — delete played episodes or raise the cap\"",
        "The oldest download by `completedAt` is deleted to make room",
        "The download goes ahead past the cap, and the next auto-delete run trims storage",
        "It stays `queued` and retries with exponential backoff until space is freed",
      ],
      answer: 0,
      explain:
        "The policy comment says it plainly: silently deleting something the user hasn't heard yet is worse than refusing a new download. Eviction looks only at played files that aren't protected (the episode now playing is protected), oldest-played first, and removes only as many as needed. `ensureCapacity` first checks device free space against `estimateBytes()` (enclosure lengths are often 0 or wrong). It then returns an error string, and `start()` writes `failed` directly. That path skips `onFailure`, so there's no backoff loop.",
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
        "`fetchFeedXml` sends `If-None-Match` / `If-Modified-Since` and passes `validateStatus: (s) => (s >= 200 && s < 300) || s === 304`. Why is the custom `validateStatus` needed?",
      choices: [
        "Axios rejects non-2xx statuses by default, so a `304 Not Modified` would throw. Accepting 304 lets the function return `{ notModified: true }`, and `syncFeed` skips parsing and the DB upsert",
        "Feeds that answer 304 must be retried without validators to get the body",
        "It makes axios follow 3xx redirects, which feeds use a lot",
        "It stops axios from caching the response body between calls",
      ],
      answer: 0,
      explain:
        "Conditional GET is the first of the two cost layers described in `feeds/sync.ts`. An unchanged feed costs a 304 instead of a download that can run to several megabytes, and the validators (`etag`, `last_modified`) are saved per podcast by `markRefreshed`. The second layer is the DB upsert with a content hash. The request also uses `transformResponse: (d) => d` to keep raw XML, and a podcast-owned `feedApi` instance derived from the shared, project-agnostic axios defaults.",
    },
    {
      id: "podcast-player-19",
      type: "multi",
      level: 2,
      topics: ["SQLite", "Offline & Sync"],
      files: ["src/projects/podcast-player/db/queries.ts", "src/projects/podcast-player/db/schema.ts"],
      prompt:
        "Select all that apply. Read the SQL in `upsertEpisodes()`. On a feed refresh, which of these does it guarantee?",
      choices: [
        "An episode whose `(podcast_id, guid)` already exists is updated in place, never inserted twice",
        "Rows whose `content_hash` hasn't changed are skipped entirely",
        "A feed that leaves out `duration` doesn't erase a duration learned earlier from the player",
        "An empty chapters array from the feed doesn't wipe chapters fetched earlier from `podcast:chapters` JSON",
        "Episodes that dropped out of the feed are deleted",
        "Progress rows are reset when an episode's audio URL changes",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "`ON CONFLICT(podcast_id, guid) DO UPDATE … WHERE episodes.content_hash != excluded.content_hash` makes unchanged rows free. `COALESCE(excluded.duration, episodes.duration)` keeps the duration that `setEpisodeDuration` learned from the player, and the `CASE WHEN excluded.chapters = '[]'` keeps lazily fetched chapters. Nothing deletes missing episodes (old episodes often fall off a feed's window but stay in the library), and progress lives in its own table. The function also returns the newly inserted ids, which drive auto-download.",
    },
    {
      id: "podcast-player-20",
      type: "text",
      level: 2,
      topics: ["Offline & Sync", "File System"],
      files: ["src/projects/podcast-player/feeds/sync.ts"],
      prompt:
        "When a refresh finds new episodes for a show with auto-download on, how many of them does `syncFeed` enqueue at most per show per refresh? (Type the number.)",
      accept: ["2", "two", "AUTO_DOWNLOAD_PER_SHOW"],
      explain:
        "`AUTO_DOWNLOAD_PER_SHOW = 2` is the guard against unbounded storage. There's a second guard: `isFirstLoad = !existing` means the very first sync (which inserts the whole back catalogue) never counts as \"new\" and never auto-downloads anything. Without both, subscribing to a show with 500 episodes, or a feed that republishes everything, could fill the device.",
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
        "Select all that apply. Open `fixtures/messy.xml` and the \"messy feed\" block in `parse.test.ts`. Which behaviours do those tests assert?",
      choices: [
        "A BOM plus whitespace before `<?xml` doesn't break parsing",
        "A text-only `<item>` with no enclosure is skipped",
        "An item whose `<guid>` equals another item's fallback guid (that item's enclosure URL) is dropped as a duplicate",
        "When an item has a video enclosure and an audio enclosure, the audio one is chosen",
        "An item with an unparseable `pubDate` is dropped",
        "`<itunes:duration>garbage</itunes:duration>` throws `FeedParseError`",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "`parseFeed` strips the BOM and leading whitespace, skips items where `pickAudio()` finds nothing, and dedupes on a guid that falls back through `guid → id → audio URL → title|date`. Entity decoding makes `&amp;` in the duplicate's guid match the decoded URL. A bad date doesn't drop the item: it gets `publishedAt: null` and sorts to the bottom. Garbage durations become `null`. A pure parser plus real-world fixtures is how the project tests code that would otherwise need the network.",
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
        "Wi-Fi only is on. Put this download's life in order, from tap to finished file, including a Wi-Fi drop partway through.",
      items: [
        "`enqueue()` inserts a `queued` row, updates the live store and schedules a pump",
        "`pump()` picks it (priority, then FIFO), `ensureCapacity()` passes, and the row becomes `downloading`",
        "Wi-Fi drops to cellular: `setNetwork()` sets `stopReason = \"network\"`, and `pauseAndSnapshot()` saves the `savable()` snapshot",
        "The runner gets a `null` result with `stopReason` `network` and writes the row back to `queued`",
        "Wi-Fi returns: `pump()` restarts it with `DownloadTask.fromSavable(...).resumeAsync()`",
        "The task resolves with a `File`: the row becomes `done`, with `completedAt` set and the snapshot cleared",
      ],
      explain:
        "Every decision (which downloads to start, whether the network allows it, eviction) comes from pure functions in `policy.ts`, and `manager.ts` only does the I/O. A pause resolves the running `downloadAsync()`/`resumeAsync()` promise with `null`, so `start()` uses `stopReason` to tell a user pause (row stays `paused`) from a network pause (row goes back to `queued`, to resume automatically). Because the snapshot carries `resumeData`, the transfer continues from the same byte instead of starting over.",
    },
    {
      id: "podcast-player-23",
      type: "order",
      level: 2,
      topics: ["Media", "Architecture"],
      files: ["src/projects/podcast-player/playback/service.ts"],
      prompt:
        "Put the steps of `PlaybackService.load(episodeId, { autoplay: true })` in order, for a new episode that has a saved resume position.",
      items: [
        "Look up the episode row with `getEpisode()`",
        "Flush the previous episode's progress and reset the progress writer and interruption tracker",
        "Resolve the local file URI (if downloaded) and the resume position",
        "Publish `nowPlaying` and the initial status to `usePlayerStore`",
        "Call `player.replace()` with the new source and activate the lock-screen controls",
        "On the first `isLoaded` status tick, seek to the pending position, then call `play()`",
      ],
      explain:
        "Flushing before switching means the old episode's last position is saved under the old id. Pending work is reset so stale samples can't leak into the new episode. A local file is preferred only when `downloadState === \"done\"` and the file still exists. The store is updated before `replace()`, so the UI shows the new title right away. Playback starts in `onStatus` once the source reports `isLoaded`, after the resume seek has landed.",
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
        "`app.config.ts` sets `updates.checkAutomatically: \"ON_LOAD\"` and `fallbackToCacheTimeout: 0`. You publish an OTA, and a tester cold-launches the app once. What do they get on that launch?",
      choices: [
        "The bundle they already had. The update downloads in the background and applies on the next launch, or sooner if they tap **Restart** on the Home tab's `UpdateBanner` (`reloadAsync()`)",
        "Startup waits until the update downloads, then runs the new bundle",
        "Nothing downloads until `useUpdateBanner`'s foreground check, which runs at most every 10 minutes",
        "The app reloads itself mid-session as soon as the update has downloaded",
      ],
      answer: 0,
      explain:
        "A timeout of 0 means launch never waits for the network: the update downloads after launch and is used on the next cold start (the runbook's \"relaunch twice\"). `lib/updates.ts` adds a prompt-to-restart layer on top: it also checks on foreground (rate-limited to once per 10 min) and shows the banner when `useUpdates().isUpdatePending` is true. A forced `reloadAsync()` mid-session is deliberately not used; a reload in the middle of listening would interrupt playback.",
    },
    {
      id: "podcast-player-25",
      type: "order",
      level: 2,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: [
        ".github/workflows/ci.yml",
        ".github/workflows/release.yml",
        "docs/release-05.md",
      ],
      prompt:
        "Put this repo's release pipeline in order, from a pull request to the stores.",
      items: [
        "Open a PR: `ci.yml` runs typecheck, lint, Jest and `expo export`",
        "Merge to `main`: `release.yml`'s `ota-preview` job runs `eas update --channel preview --environment preview` with `APP_VARIANT=preview`",
        "Testers on `preview` builds (channel `preview`, baked in by `eas.json`) whose fingerprint runtime matches receive the OTA",
        "Push a `v*` tag: `build-and-submit` runs `eas build --profile production --platform all --auto-submit`",
        "`softprops/action-gh-release` creates a GitHub release with generated notes",
      ],
      explain:
        "JS fixes reach testers on every merge, through an OTA to the preview channel. Store binaries are cut only from tags. Each job picks its trigger with `if: github.ref == 'refs/heads/main'` or `startsWith(github.ref, 'refs/tags/v')`, and `concurrency.cancel-in-progress: false` stops a newer push from killing a release halfway. Step 3 works because CI publishes by channel (to whatever branch `preview` reads) and computes the runtime with the same `APP_VARIANT` as the builds; see the channel/branch question in this quiz.",
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
        "The `FlashList`s in `podcast/[id].tsx` and `discover.tsx` don't pass `estimatedItemSize`. The repo pins `@shopify/flash-list` 2.0.2. What's going on?",
      choices: [
        "FlashList v2 measures items itself, so `estimatedItemSize` is no longer needed",
        "It's a bug. Without it, FlashList renders every item at once, like a `ScrollView`",
        "Expo Router injects it from the screen's options",
        "FlashList infers it from `contentContainerStyle.paddingBottom`",
      ],
      answer: 0,
      explain:
        "FlashList v1 needed `estimatedItemSize` for its recycling layout. v2 (built for the New Architecture) measures synchronously and dropped the requirement, so these lists only pass `data`, `keyExtractor`, `renderItem` and a `ListHeaderComponent`. Recycling still matters: rows are reused across items, so `LiveEpisodeRow` takes everything from props (`episodeId`, `fallback`) and holds no per-item local state.",
    },
    {
      id: "podcast-player-27",
      type: "mcq",
      level: 2,
      topics: ["Gesture Handler", "Media"],
      files: [
        "src/projects/podcast-player/components/player/Scrubber.tsx",
        "docs/release-05.md",
      ],
      prompt:
        "`Scrubber.tsx` keeps two pieces of local state, `scrub` and `settling`, and displays `scrub ?? settling ?? position`. What problem does `settling` solve?",
      choices: [
        "After release, the 500 ms status ticks would still report the old position until the seek lands, snapping the thumb back. `settling` holds the target until `position` arrives within 1.5 s of it, with a 1.5 s timeout as a fallback",
        "It debounces taps so two quick taps don't send two seeks",
        "It snaps the thumb to the nearest chapter tick while dragging",
        "It stops the gesture from running on the UI thread",
      ],
      answer: 0,
      explain:
        "This is the runbook's \"scrubber fight\" failure mode. While the finger is down, `scrub` owns the value. After `commit()`, `settling` keeps the UI on the target until the player confirms it, and the lock is released during render (`if (settling != null && |position − settling| < 1.5) setSettling(null)`). That follows the repo's rule to derive state during render rather than calling setState in an effect body. Chapter snapping is a separate feature in `tapAt` (`TICK_SNAP_PX`). The gestures use `.runOnJS(true)` because they drive React state.",
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
        "`clamp()` and `dragTargetIndex()` in the otherwise plain `playback/queue.ts` start with the `\"worklet\"` directive. Why?",
      choices: [
        "`ReorderableList` calls `dragTargetIndex` from a Gesture Handler `onUpdate` callback that runs on the UI thread. The directive lets it, and the `clamp` it calls, run in the UI runtime, while Jest still calls it as a normal function",
        "It tells the React Compiler to memoize them",
        "It moves heavy queue sorting onto a background JS thread",
        "Every function exported from `playback/` needs it so the service can call it",
      ],
      answer: 0,
      explain:
        "Gesture callbacks in `ReorderableList` are worklets, and any function they call must also be a worklet. That includes the helper `clamp`. The whole reorder (recomputing the shared `positions` map) happens on the UI thread, and React only hears about it once on drop, through `scheduleOnRN(onDrop, from, to)`. Keeping the math in `queue.ts` means `queue.test.ts` can test \"maps a drag distance to a target row\" without Reanimated.",
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
        "`createProgressWriter()` saves the listening position at most every `PROGRESS_INTERVAL_MS` while playing, and also flushes at certain moments. Explain why it doesn't simply write on every status tick, or only on pause. Name the moments that trigger a flush.",
      model:
        "Status ticks arrive every 500 ms (`updateInterval: 500`). Writing each one would mean two SQLite writes a second for the whole listen, plus query invalidation. Writing only on pause would lose everything on a crash or when the OS kills the app, because nothing runs on termination. So `sample()` writes at most every 5 s while playing, and `flush()` saves right away on pause, seek, track change (`load()` flushes before switching), app backgrounding (an `AppState` listener for any non-active state) and an external pause. `flush()` also skips a write if the position is within 0.5 s of the last saved value. Each write computes `played` with `isPlayed()`, so finishing near the end marks the episode played.",
      rubric: [
        "Every-tick writes waste I/O: about 2 per second at a 500 ms interval",
        "Pause-only writes lose progress on a crash or OS kill, since there's no termination hook",
        "Throttle to 5 s while playing",
        "Flush on pause, seek, track change, backgrounding and external pause",
        "Mentions the dedupe (within 0.5 s) or the `played` calculation",
      ],
      explain:
        "This is the usual trade-off for any high-frequency state you need to persist: throttle the steady stream and flush at the moments that matter. The same pattern appears in the download manager, which writes progress to SQLite at most every 3 s and saves snapshots when the app goes to the background.",
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
        "In `createInterruptionTracker()`, `observe()` returns `\"none\"` for any status that arrives within 1200 ms of the last `command()` (unless `didJustFinish`). Why does that window exist?",
      choices: [
        "Our own `play()`/`pause()` take a tick or two to show up in status. Without the window, that delay would be misread as an external pause or play, flipping `intent` and setting `pausedExternally` wrongly",
        "To debounce double taps on the play button",
        "Because iOS needs 1.2 s before an audio session can be activated again",
        "To throttle the SQLite progress writes that follow each status tick",
      ],
      answer: 0,
      explain:
        "The tracker compares consecutive statuses with the user's intent: \"stopped while we wanted play\" means `externalPause`. Right after we issue a command, status still shows the old state, which would look exactly like an external transition. `didJustFinish` gets through even inside the window, so auto-advance is never swallowed. Buffering flips are ignored for the same reason: some platforms flip `playing` during stalls.",
    },
    {
      id: "podcast-player-31",
      type: "multi",
      level: 3,
      topics: ["Media", "Expo Config & EAS", "Background Tasks"],
      files: ["app.config.ts", "src/projects/podcast-player/playback/service.ts"],
      prompt:
        "Select all that apply. Which pieces does this repo rely on so a podcast keeps playing with the screen locked and the iPhone's ring/silent switch set to silent?",
      choices: [
        "The `expo-audio` config plugin with `enableBackgroundPlayback: true` in `app.config.ts` (a native capability, so it needs a new build)",
        "`setAudioModeAsync({ shouldPlayInBackground: true })` at runtime",
        "`playsInSilentMode: true`, so the mute switch doesn't silence it",
        "An `expo-background-task` registration to keep JS alive during playback",
        "A `TaskManager.defineTask` for the audio player in the root layout",
        "`interruptionMode: \"mixWithOthers\"`, so iOS doesn't suspend the app",
      ],
      answer: [0, 1, 2],
      explain:
        "Background audio needs both halves: the native capability (the plugin adds the background audio mode at prebuild) and the runtime session setting. The silent switch is handled separately by `playsInSilentMode`. Background tasks are for periodic work, not audio. Playback keeps running because the native player owns the session. The service uses `doNotMix`, not `mixWithOthers`. Since the plugin option changes native config, it also changes the fingerprint, so it can't be turned on through an OTA.",
    },
    {
      id: "podcast-player-32",
      type: "multi",
      level: 3,
      topics: ["Offline & Sync", "File System"],
      files: ["src/projects/podcast-player/downloads/manager.ts"],
      prompt:
        "Select all that apply. On relaunch, `DownloadManager.rehydrate()` runs once (through `init()`). What does it do?",
      choices: [
        "Turns rows stuck in `downloading` into `queued` with `nextAttemptAt: 0`, because the process died mid-transfer",
        "Re-queues `done` rows whose file is missing from 0 bytes, clearing the snapshot",
        "Deletes played downloads past the auto-delete window before syncing the live store",
        "Registers a network listener so the Wi-Fi-only rule can pause and resume transfers",
        "Resets `failed` rows to `attempts: 0` and re-queues them",
        "Automatically resumes rows the user `paused`",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "Repairs are batched into one transaction (`updateDownloads`). A requeued row with a saved snapshot later resumes from the same byte, and without one it restarts from 0, which is still better than losing it. `failed` rows wait for an explicit `retry()`, and `paused` rows for `resume()`, because `pickDownloadsToStart` only starts `queued` rows. Respecting the user's choice across launches is part of the design. `init()` stores the promise (and clears it if it fails), so the layout and the background task can both call it safely.",
    },
    {
      id: "podcast-player-33",
      type: "text",
      level: 3,
      topics: ["File System", "Offline & Sync"],
      files: ["src/projects/podcast-player/downloads/manager.ts"],
      prompt:
        "In `DownloadManager.start()`, which expo-file-system method rebuilds a `DownloadTask` from a stored snapshot so it can `resumeAsync()` from the same byte? (Type the method, for example `Class.method`.)",
      accept: ["DownloadTask.fromSavable", "fromSavable", /fromSavable/],
      explain:
        "`DownloadTask.fromSavable({ ...snapshot, fileUri: resolveUri(snapshot.relativePath) }, { onProgress })` turns the persisted pause state back into a live task, with the file URI rebuilt for the current container. If that throws (for example, `resumeData` from an older container), the catch clears the snapshot and starts over with `new DownloadTask(url, file).downloadAsync()`. The opposite direction is `task.savable()` in `persistSnapshot()`.",
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
        "A feature needs a new native module. Put the safe path to shipping it, and to later OTA fixes, in order.",
      items: [
        "Add the native module and the JS that uses it in a PR; CI passes, including `expo export`",
        "Confirm the drift: `eas fingerprint:compare` (as in `fingerprint.yml`) shows the fingerprint differs from the last finished production build",
        "Push a `v*` tag so `build-and-submit` builds and submits new production binaries with the new runtime version",
        "Users install the store update, which has the new runtime version",
        "Later JS-only fixes shipped with `eas update` reach those users, because their runtime matches",
      ],
      explain:
        "With the fingerprint policy, the runtime version changes along with the native code. An OTA built from the new JS is stamped with the new runtime and simply doesn't reach old binaries, so it can't crash them by calling a native module they lack. Old binaries keep running the last update compatible with them. The nightly `fingerprint.yml` exists so you learn \"the next release needs a store build\" before release day, not halfway through it. It reports drift as a warning and stays green, since drift after native work is expected; only real errors fail the job.",
    },
    {
      id: "podcast-player-35",
      type: "multi",
      level: 3,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: ["app.config.ts", "docs/release-05.md", ".github/workflows/release.yml"],
      prompt:
        "Select all that apply. Which of these changes need a new store build rather than an `eas update` OTA?",
      choices: [
        "Adding a dependency with native code (for example, a new `expo-*` module)",
        "Changing `expo-audio` plugin options in `app.config.ts` (for example `enableBackgroundPlayback`)",
        "Adding an iOS entitlement or App Group in `app.config.ts`",
        "Fixing a bug in `playback/queue.ts`",
        "Changing text and styles in `settings.tsx`",
        "Tuning the backoff constants in `downloads/policy.ts`",
      ],
      answer: [0, 1, 2],
      explain:
        "The runbook's rule: an OTA may carry only JavaScript and assets. Native modules, plugin options and entitlements end up in the compiled binary or its Info.plist and manifest. They also feed the fingerprint, so after changing them an OTA would target a runtime no installed binary has. Pure TS logic, styles and constants are bundle-only, which is exactly what `ota-preview` ships on every merge to `main`.",
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
        "Both Maestro flows start with `appId: ${APP_ID}` instead of a literal bundle id, and the `maestro-smoke` job passes `env: APP_ID=org.imaginativeworld.whynotreactnative.preview` to Maestro Cloud. What would break if the flows hardcoded `org.imaginativeworld.whynotreactnative.dev`, which is what you install locally?",
      choices: [
        "The CI job would fail at `launchApp`. It builds the `preview` profile (`APP_VARIANT=preview`), and `app.config.ts` gives that variant its own id, `….preview`, so no app with the `.dev` id is installed",
        "Nothing. Maestro ignores `appId` when an `app-file` is uploaded",
        "The job would be skipped, because Maestro can't run on `ubuntu-latest`",
        "The build step would fail, because EAS can't produce APKs for the `.dev` id",
      ],
      answer: 0,
      explain:
        "`app.config.ts` gives each variant its own id (`.dev`, `.preview`, none) so they install side by side, and Maestro launches the app by id. A hardcoded `.dev` id suits a local dev client but not the preview APK that CI builds. Parameterising it keeps one flow for every variant: locally you run `maestro test -e APP_ID=org.imaginativeworld.whynotreactnative.dev .maestro/podcast-smoke.yaml`, and CI passes the preview id. The test runs on Maestro Cloud (`action-maestro-cloud`), so the runner OS doesn't matter, and `eas.json` sets `android.buildType: \"apk\"` for preview. The job uploads the whole `.maestro` workspace, so the store flow needs the same parameter.",
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
        "The comment in `interruptions.ts` says expo-audio already handles interruptions, headphone unplugging and lock-screen commands natively, yet fires no JS event for them. Explain why the service still tracks user intent and classifies status transitions, and what would go wrong without it.",
      model:
        "Natively, expo-audio pauses on an interruption or route change and resumes only the players it paused, and only with `shouldResume`. Remote commands also act on the player directly. JS sees only the status stream: the player stops or starts without the service having asked. The service records the user's intent through `tracker.command()` on every play/pause it issues, and `observe()` labels unexplained transitions as `externalPause` or `externalPlay`, flipping intent to match. On `externalPause` it flushes progress and sets `pausedExternally`, so the player shows \"Paused by the system\". Without this, the service's idea of what the user wants would drift (it could auto-resume after a pause made from the lock screen), progress wouldn't be saved at the moment of interruption, and the UI couldn't explain why audio stopped. The tracker ignores buffering flips and the 1.2 s after each command, so its own actions aren't misread.",
      rubric: [
        "Native code handles the interruption, but JS only sees status changes with no reason attached",
        "Intent is recorded on each command, and unexplained transitions are classified against it",
        "On externalPause: intent becomes pause, progress is flushed, `pausedExternally` is set for the UI",
        "Without it: wrong state, possible unwanted auto-resume, lost progress",
        "Mentions the buffering and command-window guards (or the Android \"becoming noisy\" gap)",
      ],
      explain:
        "This pattern applies to any native-driven state: when the platform changes state behind your back, keep your own model of what the user intended and reconcile it against the observed stream. The runbook also notes that Android \"becoming noisy\" (headphones unplugged) isn't handled by expo-audio 57.",
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
        "Walk through `checkpointAll()`. What happens to an active download when the app goes to the background? Why does the stored snapshot hold a `relativePath` instead of the `fileUri` from `savable()`? And what is the `checkpoint` deferred in `ActiveTransfer` for?",
      model:
        "On `background`/`inactive`, `checkpointAll()` handles each active transfer: it creates a deferred, sets it as `t.checkpoint`, calls `pauseAsync()`, and saves `task.savable()` as JSON with the file URI turned into a path relative to Documents (`toRelativePath`). It then calls `resumeAsync()` and resolves the deferred with that new promise, so the download keeps going. Inside `start()`, the paused op resolves with `null`. Because `transfer.checkpoint` is set, the loop waits on `cp.promise` instead of treating it as a real pause. If the OS kills the app, `rehydrate()` turns `downloading` back into `queued`, and `start()` rebuilds the task with `DownloadTask.fromSavable` and `resolveUri(relativePath)`, continuing from the saved byte. An absolute `fileUri` would point into the old container UUID after a reinstall or some updates, and the resume would fail. A failed resume goes through `onFailure`, which clears the snapshot and retries from scratch.",
      rubric: [
        "On background: pause, save the snapshot, resume immediately (the transfer keeps going)",
        "The snapshot stores a relative path, because the iOS container path can change",
        "The checkpoint deferred stops `start()` from treating the snapshot pause as a user or network pause",
        "After a kill: rehydrate re-queues the row and `fromSavable` resumes from the saved byte",
        "Fallback: an unusable snapshot is dropped and the download restarts",
      ],
      explain:
        "The JS side of a `DownloadTask` doesn't survive the process. On iOS the native transfer runs on a background URLSession and may keep going while the app is suspended, but if the app is killed the promise, progress callbacks and DB bookkeeping are gone (and Android stops the transfer with the process). So the manager checkpoints whenever it might lose the process. The rule that the DB never stores absolute paths applies to snapshots too.",
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
        "docs/release-05.md",
        "src/app/projects/podcast-player/settings.tsx",
      ],
      prompt:
        "On every merge to `main`, `release.yml` runs `eas update --channel preview --environment preview` with `APP_VARIANT: preview` set on the step. Explain why it publishes by **channel** rather than with `--branch <name>`, why the step needs `APP_VARIANT` even though `eas.json` already sets it for the `preview` profile, and how you'd diagnose a tester with a fresh `preview` build who still gets nothing.",
      model:
        "A build has a channel baked in: `eas.json` gives `preview` the channel `preview`. Each channel reads a branch, and that mapping lives on the server. Publishing with a hardcoded `--branch staging` would only reach testers if someone also ran `eas channel:edit preview --branch staging`; otherwise the update would land on a branch no build reads, and nobody would get it. `--channel preview` publishes to whatever branch the channel points at (by default a same-named `preview` branch, created on first use), so the update and the builds can't disagree. `APP_VARIANT` matters because `eas.json`'s `env` applies to builds only. `app.config.ts` changes the bundle id and name per variant, and with the fingerprint policy the whole app config feeds the runtime version. Without `APP_VARIANT=preview`, the update would be stamped with the development runtime version, which no preview binary has. To diagnose: `eas channel:view preview` shows which branch the channel reads and its latest update. Then compare runtime versions: if `main` changed native inputs after the tester's build, the update targets a new runtime and their binary ignores it, and the fix is a new preview build. On the device, podcast Settings shows the build's Channel, Runtime version and whether it's running the embedded bundle or an update id. Channel surfing there offers only the channels that exist (`development`, `preview`, `production`), and it too only delivers updates with a matching runtime.",
      rubric: [
        "Build → channel (baked in) → branch (server-side mapping) → update; publishing to an unmapped branch reaches nobody",
        "`--channel preview` follows the channel's current branch, so CI can't publish where no build reads",
        "`eas.json` `env` is build-only; the app config (per `APP_VARIANT`) feeds the fingerprint, so the update needs the same variant",
        "Diagnose with `eas channel:view` and a runtime-version comparison; a changed fingerprint needs a new build",
        "Uses the Settings info (channel, runtime version, embedded or update id) to verify on the device",
      ],
      explain:
        "Most \"OTA didn't arrive\" incidents come down to channel/branch mapping or runtime compatibility. Publishing by channel removes the first, and setting the same `APP_VARIANT` the builds use removes a subtle form of the second. When you publish by branch yourself (for example a `release-1.4` rollout), the runbook's rule still applies: run `eas channel:view` first.",
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
        "`TaskManager.defineTask(PODCAST_BACKGROUND_TASK, …)` runs at module scope in `downloads/task.ts`, and the **root** `src/app/_layout.tsx` imports that module. But `registerBackgroundTask()` is only called from the podcast **project** layout, and the task body awaits `ensureSettingsHydrated()` before doing anything else. Explain why the definition and the registration live in different places (and why registration isn't moved to the root too), what the task does when it runs, and what would go wrong without the hydration await.",
      model:
        "The OS can launch the app headless (no UI, no project layout mounted) to run a registered task. The task definition has to exist as soon as the JS bundle loads, so it lives at module scope and is imported by the root layout; if only the project layout imported it, a background launch would find no handler. It's guarded with `isTaskDefined` so fast refresh doesn't define it twice. Registration (`BackgroundTask.registerTaskAsync` with `minimumInterval: 60` minutes, only a hint, since the OS decides the real cadence) persists across launches, so doing it once when the user first opens the project is enough, and it's skipped when the status isn't `Available`. Registering from the root would be cheap and needs no permission, but it would wake the app periodically to open the podcast database and run the download manager for people who never used this project. When it runs, the task awaits `ensureSettingsHydrated()`, then calls `refreshSubscriptions()` (conditional GETs, with at most 2 auto-downloads per show) and `downloadManager.kick()` (init/rehydrate, then pump), returning `Success` or `Failed`. Without the await, `getSettings()` is a synchronous read of a Zustand store that hydrates from AsyncStorage asynchronously. On a headless launch nothing has waited for it yet, so the manager could read `DEFAULT_SETTINGS`: Wi-Fi only, the default storage cap and concurrency, instead of the user's choices. `ensureSettingsHydrated()` uses `persist.rehydrate()`, whose promise also settles if the storage read fails, so the task can't hang. Another limit: the task gets a short OS window, and the transfers it starts are ordinary `DownloadTask`s, not a background-transfer service.",
      rubric: [
        "Definition at module scope so it exists on a headless launch; that's why the root imports it",
        "Registration persists and only needs to happen once, from the project layout; the interval is a hint",
        "Root registration would wake the app for users who never opened the project; user-facing setup waits for the project",
        "Task body: hydrate settings, refresh subscriptions, then kick the download manager; returns Success or Failed",
        "Without the await, `getSettings()` can return `DEFAULT_SETTINGS` before AsyncStorage hydration finishes",
      ],
      explain:
        "This is the repo-wide rule for root-level side effects: anything that must exist on a cold or headless launch starts from the root layout, while user-facing setup waits until the user opens the project. The journal's sync task and the fitness tracker's location task follow the same split, and the journal's settings store has the same `ensureSettingsHydrated()` helper for its headless sync.",
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
        "The repo's rule is that components are dumb: plain data and callbacks, no stores. `MiniPlayerHost` reads `usePlayerStore` and calls `playbackService`, so it lives in `containers/`, not `components/`. Explain what that split buys, how `MiniPlayer` stays dumb, and how the host keeps position ticks and the drag-to-expand gesture cheap.",
      model:
        "`MiniPlayerHost` is a container: it's mounted once by the project layout and bridges the player store and service to the presentational `components/player/MiniPlayer`, which only gets `title`, `playing`, `hasNext` and callbacks like `onTogglePlay`/`onNext`, so it could be reused or previewed with any data. Keeping it in `containers/` makes the rule checkable by location: nothing under `components/` imports a store or a service, and the files that do (the host and the `Live*Row` wrappers) are easy to find. Position changes twice a second, so the host doesn't pass it as a prop. It passes a `progressBar` slot holding `<NowPlayingProgress />`, which subscribes to `status.position` itself, so only the bar re-renders. Drag-to-expand runs on the UI thread: one shared value `expand` (0 to 1) drives the sheet's translate, the artwork scale, and the gradient and mini-player opacity through `useAnimatedStyle`. When the spring settles at 1, `scheduleOnRN(openPlayer, \"drag\")` pushes `/player`, which the layout presents as a `transparentModal` with `animation: \"none\"` for `from=drag`, so the handover is invisible. `useSegments()` lets the host dock above the tab bar and hide itself while the player is on top.",
      rubric: [
        "The host is a container in `containers/` (one per project layout); `MiniPlayer` in `components/` takes only props and callbacks",
        "The folder split keeps `components/` free of store and service imports, so the rule is visible and checkable",
        "The position slot (`progressBar` / `NowPlayingProgress`) limits re-renders to the bar",
        "One shared value drives every animated style on the UI thread; `scheduleOnRN` hands the end of the gesture to the router",
        "`useSegments` controls docking and visibility",
      ],
      explain:
        "Containers are fine when they're explicit and few, and a folder of their own keeps them explicit. The rule exists so reusable views don't carry hidden dependencies. Passing frequently changing values through a slot, or a child that subscribes itself, is a general React technique for keeping high-frequency updates local.",
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
        "In `PlaybackService.onFinished()`, the sleep option is read into `optionAtFinish` **before** `await saveProgress(...)`, and the auto-advance check is `shouldAdvanceAfterFinish(optionAtFinish, this.sleepFired)`. Why not just read `usePlayerStore.getState().sleepOption` after the await, as a simpler version would?",
      choices: [
        "The timer's own expiry races the finish event and sets `sleepOption` to `off`. It can fire just before the event (the position reaches the end while status still says playing) or, for a minutes timer, during the await. A later read would see `off` and start the next queued episode after the user asked to sleep",
        "Zustand's `getState()` can't be called after an `await`, because the store is only readable synchronously during a render",
        "`saveProgress` resets the player store, so `sleepOption` is always `off` after it resolves",
        "It's only a micro-optimisation: reading the store once instead of twice avoids a re-render",
      ],
      answer: 0,
      explain:
        "Both the timer's `onExpire` (`pause()`, then `sleepOption: off`) and `onFinished` act on the same decision, so it has to be made in one place from facts that can't change underneath it. The option is captured synchronously when the finish event arrives, and `sleepFired` (set in `onExpire`, cleared by `play()`, an autoplay `load()` or an external play) remembers that the timer already paused playback, even after it has switched itself off. `sleepTimer.test.ts` covers both halves: a running end-of-episode timer expires on its own once the remaining time hits 0 while still playing, it stays inert once the status says stopped (expo-audio's `didJustFinish` status carries `playing: false`), and `shouldAdvanceAfterFinish` refuses to advance in every timer case.",
    },
    {
      id: "podcast-player-43",
      type: "mcq",
      level: 3,
      topics: ["Release & CI", "Expo Config & EAS"],
      files: [".github/workflows/fingerprint.yml", "docs/release-05.md", "app.config.ts"],
      prompt:
        "`fingerprint.yml` runs `eas fingerprint:compare --build-id … --environment production --json`, compares `fingerprint1.hash` with `fingerprint2.hash`, and emits a `::warning::` on drift. The step also sets `APP_VARIANT: production` and starts with `set -euo pipefail`. Which statement matches how the job behaves?",
      choices: [
        "`fingerprint:compare` exits 0 whether or not the hashes match, so drift is read from the JSON and reported as a warning while the job stays green (drift after native work is expected). Real errors such as auth, `build:list` or unparseable output fail the job. `APP_VARIANT` is needed because the app config differs per variant and feeds the fingerprint",
        "`fingerprint:compare` exits non-zero on drift, so the JSON parsing is only there to print a nicer message",
        "Any failure, including an auth error, becomes a drift warning, so the job can never fail",
        "`APP_VARIANT` only selects which EAS project to query, so leaving it out would make `build:list` return nothing",
      ],
      answer: 0,
      explain:
        "The job is warn-only for drift by design: a changed fingerprint means \"the next release needs a store build, not an OTA\", which is information, not breakage. The exit code can't carry it, because the CLI returns success either way, so the step parses the `--json` output, buffering all of stdin before `JSON.parse` (a large document arrives in several chunks). Errors still have to be loud, which is why the step uses `set -euo pipefail` and nothing swallows a failing command with `|| echo`. The local fingerprint must be computed with the production build's inputs: `eas.json`'s `env` only applies to builds, and `app.config.ts` changes the bundle id and name per `APP_VARIANT`, so without it every night would report false drift. `--environment production` pulls the EAS server-side variables the build saw.",
    },
  ],
});

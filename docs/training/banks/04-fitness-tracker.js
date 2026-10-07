QUIZ.register({
  slug: "fitness-tracker",
  number: "04",
  title: "Background fitness tracker",
  doc: "../04-fitness-tracker.html",
  summary:
    "Trains background location with TaskManager and a foreground service, a crash-safe SQLite session, pure GPS filtering and metrics math, sensors and health stores, plus the native side: a local Expo Module (Swift and Kotlin), Live Activities and widgets, and a hand-written config plugin tested with compileModsAsync.",
  questions: [
    // ------------------------------------------------------------ Level 1
    {
      id: "fitness-tracker-01",
      type: "text",
      level: 1,
      topics: ["Background Tasks", "Location & Sensors"],
      files: ["src/projects/fitness-tracker/tracking/config.ts", "src/projects/fitness-tracker/tracking/task.ts"],
      prompt:
        "The background location task, `startLocationUpdatesAsync` and `hasStartedLocationUpdatesAsync` all refer to the same task by name. Open `tracking/config.ts`.\n\nWhat is the **string value** of `LOCATION_TASK`?",
      accept: ["fitness-tracker-location"],
      explain:
        "`LOCATION_TASK = \"fitness-tracker-location\"`. TaskManager tasks are identified by a plain string, and the native side stores that string when updates start. When the OS later delivers locations, it looks up the JS callback registered under the same name. That's why the name lives in one shared constant: `task.ts` (defineTask), `controller.ts` (start/stop) and the recovery check all import it. The name is also namespaced with the project slug so it can't collide with the journal's or the podcast player's tasks in the same app.",
    },
    {
      id: "fitness-tracker-02",
      type: "mcq",
      level: 1,
      topics: ["Background Tasks", "Expo Router", "Architecture"],
      files: ["src/app/_layout.tsx", "src/app/projects/fitness-tracker/_layout.tsx", "src/projects/fitness-tracker/tracking/task.ts"],
      prompt:
        "`tracking/task.ts` calls `TaskManager.defineTask` at module scope. Which import is what guarantees the task exists when iOS or Android relaunches the app **headless** to deliver locations?",
      choices: [
        "The `import { startPendingActionReplay } from \"@/src/projects/fitness-tracker/tracking/task\"` in the root `src/app/_layout.tsx`. Evaluating the module is what defines the task, whatever it imports by name",
        "An import of `task.ts` from `src/app/projects/fitness-tracker/_layout.tsx`, which loads the module as soon as the tracker is opened",
        "None. The `expo-location` config plugin in `app.config.ts` registers the task natively at build time",
        "None. TaskManager finds tasks by name on the native side, so JS never has to evaluate the module",
      ],
      answer: 0,
      explain:
        "A project layout only loads after the user opens that project from the launcher. A headless launch renders no screens, but it still evaluates the root layout module, so `src/app/_layout.tsx` imports every `TaskManager.defineTask` module. For the fitness tracker that import also brings in `startPendingActionReplay`, but the named import is incidental: `defineTask` runs because the module evaluates. Importing it only from the fitness layout would not be enough, because on a cold background relaunch that route never mounts. The native side stores only the task *name*. The JS callback must be defined again every time the bundle evaluates, or the delivered locations go nowhere.",
    },
    {
      id: "fitness-tracker-03",
      type: "mcq",
      level: 1,
      topics: ["Location & Sensors", "Performance"],
      files: ["src/projects/fitness-tracker/tracking/config.ts", "src/projects/fitness-tracker/models/Workout.ts"],
      prompt:
        "Look at `locationTaskOptions(mode, title)` in `tracking/config.ts`. What does the **battery-saver** (`\"saver\"`) mode actually change compared with `\"accurate\"`?",
      choices: [
        "`Balanced` accuracy, 25 m / 10 s intervals, and deferred batches every 100 m or 60 s",
        "`BestForNavigation` accuracy, but only one fix per minute",
        "It switches from `startLocationUpdatesAsync` to significant-change monitoring",
        "The same OS settings, but the pipeline drops every other point before writing",
      ],
      answer: 0,
      explain:
        "Saver mode returns `accuracy: Balanced`, `distanceInterval: 25`, `timeInterval: 10_000`, `deferredUpdatesDistance: 100` and `deferredUpdatesInterval: 60_000`. Accurate mode uses `BestForNavigation` at 5 m / 1 s. Deferred updates let the OS batch fixes and wake JS less often, which is where most of the battery saving comes from. That is also why the pipeline is written to handle a whole batch at once (one transaction per batch). The doc frames measuring both modes on the same route as a deliverable.",
    },
    {
      id: "fitness-tracker-04",
      type: "mcq",
      level: 1,
      topics: ["Location & Sensors", "Architecture"],
      files: ["src/projects/fitness-tracker/models/Workout.ts", "src/projects/fitness-tracker/tracking/state.ts", "src/projects/fitness-tracker/tracking/metrics.ts"],
      prompt:
        "Every `Point` carries a `segment` number. When does it change, and why does the code care?",
      choices: [
        "It increments on every resume, so distance, moving time and the drawn route never bridge a pause",
        "It is the 1 km split index, used to build the splits table",
        "It increments on every batch the OS delivers, so batches can be replayed in order",
        "It marks GPS signal loss, so the map can draw a dashed line across the gap",
      ],
      answer: 0,
      explain:
        "`resumeSession` in `state.ts` returns `segment: session.segment + 1`. `totalDistance`, `movingTime`, `computeSplits`, `simplifyRoute`, `paceColoredSegments` and the GPX export all skip or split on a segment change. The `Point` type comment gives the reason: a pause followed by a 2 km bus ride must not count as distance. `processFix` also skips the speed and jitter checks against a point from the previous segment, and it restarts the Kalman smoother.",
    },
    {
      id: "fitness-tracker-05",
      type: "mcq",
      level: 1,
      topics: ["Platform Differences", "Architecture"],
      files: [
        "src/projects/fitness-tracker/health/sync.ts",
        "src/projects/fitness-tracker/health/sync.ios.ts",
        "src/projects/fitness-tracker/health/sync.android.ts",
        "src/projects/fitness-tracker/health/types.ts",
      ],
      prompt:
        "Screens import `health` from `\"../health/sync\"`. On an iPhone this is HealthKit, and on Android it's Health Connect. How does the right implementation get chosen?",
      choices: [
        "Metro resolves `sync.ios.ts` / `sync.android.ts` ahead of `sync.ts` at bundle time, so each platform's bundle only contains its own health library",
        "`sync.ts` calls `Platform.select` at runtime and lazily `require`s the right file",
        "`useHeartRate` does a dynamic `import()` based on `Platform.OS`",
        "A config plugin strips the unused health library from the native project",
      ],
      answer: 0,
      explain:
        "These are platform-specific extensions. Metro checks `.ios.ts` / `.android.ts` before the plain `.ts` file, so `@kingstinct/react-native-healthkit` never loads on Android, and `react-native-health-connect` never loads on iOS. `sync.ts` is only the web/unsupported fallback, and all three files implement the same `HealthSync` type from `types.ts`. A runtime `Platform.select` would still bundle both libraries and evaluate their imports.",
    },
    {
      id: "fitness-tracker-06",
      type: "mcq",
      level: 1,
      topics: ["Skia", "Performance", "FlashList"],
      files: [
        "src/projects/fitness-tracker/components/map/RouteThumbnail.tsx",
        "src/projects/fitness-tracker/components/WorkoutRow.tsx",
        "src/projects/fitness-tracker/tracking/metrics.ts",
      ],
      prompt:
        "History rows show a small route preview. Why does `WorkoutRow` render `RouteThumbnail` (a Skia `Path`) instead of a small `MapView`?",
      choices: [
        "Every MapView row would start a native map and fetch tiles. The thumbnail draws a few normalised points computed once at finish (`thumbnailPath`)",
        "react-native-maps can't render inside a FlashList",
        "MapView can't draw a `Polyline` on Android without a paid API key",
        "Skia is needed because thumbnails come from a static-maps web API that returns vector paths",
      ],
      answer: 0,
      explain:
        "The component comment says: fifty rows of live maps would each start a native map and fetch tiles. `stopWorkout` stores `thumbnailPath(points)` on the workout row. That's a Douglas–Peucker-simplified route normalised into a 0..1 box. `RouteThumbnail` only scales those pairs into a Skia path. The heavy work happens once, at finish, and never on scroll.",
    },
    {
      id: "fitness-tracker-07",
      type: "mcq",
      level: 1,
      topics: ["Gesture Handler", "Reanimated", "Skia", "Accessibility"],
      files: ["src/projects/fitness-tracker/components/HoldButton.tsx", "src/app/projects/fitness-tracker/workout/active.tsx"],
      prompt:
        "The Stop control on the active screen is a `HoldButton` (default `holdMs = 1200`). What happens if the user presses it and lets go after about 600 ms?",
      choices: [
        "The ring animates back to 0 (`onFinalize`) and `onComplete` is never called",
        "`onComplete` fires on release, with a confirmation alert",
        "The workout is paused instead of stopped",
        "The ring stays half-filled, so the next press finishes faster",
      ],
      answer: 0,
      explain:
        "`Gesture.LongPress().minDuration(holdMs)` only activates (`onStart` → `runOnJS(finish)`) once the hold reaches the minimum duration. `onBegin` starts `withTiming(1)` on a shared value that drives the Skia path's `end`. `onFinalize` always runs and calls `cancelAnimation` and a 150 ms reset. So releasing early just rewinds the ring: a plain tap can never end a workout. Note that `finish` runs on the JS thread through `runOnJS`, because gesture callbacks run as worklets on the UI thread.",
    },
    {
      id: "fitness-tracker-08",
      type: "mcq",
      level: 1,
      topics: ["Location & Sensors", "Platform Differences", "React Hooks"],
      files: [
        "src/projects/fitness-tracker/hooks/usePermissions.ts",
        "src/app/projects/fitness-tracker/settings/permissions.tsx",
        "src/projects/fitness-tracker/components/PermissionFlow.tsx",
      ],
      prompt:
        "In `usePermissions`, what does `request(\"background\")` do when foreground location has **not** been granted yet?",
      choices: [
        "It skips the request and just refreshes. Background location can only be asked for after foreground is granted",
        "It asks for foreground first, then immediately asks for background",
        "It opens the system Settings app, because background location can't be requested in-app",
        "It throws, and `PermissionFlow` shows the error inline",
      ],
      answer: 0,
      explain:
        "The code reads `getForegroundPermissionsAsync()` and only calls `requestBackgroundPermissionsAsync()` if `fg.granted`. The `PERMISSION_ORDER` comment explains why: on Android, asking for background first means the prompt never appears, and on Android 11+ it's a separate trip to Settings anyway. The permissions screen also marks the background step `locked` until the step before it is granted, and `PermissionFlow` only renders that flag. That keeps the component dumb.",
    },
    {
      id: "fitness-tracker-09",
      type: "text",
      level: 1,
      topics: ["Config Plugins", "Background Tasks"],
      files: ["plugins/withWorkoutCapabilities.js"],
      prompt:
        "`withWorkoutInfoPlist` uses `addUnique(...)` to add the string `\"location\"` to one Info.plist array. Without it, iOS suspends location updates once the app is backgrounded.\n\nWhich Info.plist **key** is it?",
      accept: ["UIBackgroundModes"],
      explain:
        "`plist.UIBackgroundModes = addUnique(plist.UIBackgroundModes, \"location\")`. This is the iOS background mode that keeps location delivery going while the app is backgrounded (together with Always permission). `addUnique` matters because prebuild without `--clean` starts from the existing plist, and other plugins (here, expo-location with `isIosBackgroundLocationEnabled`) may already have added the same mode.",
    },
    {
      id: "fitness-tracker-10",
      type: "text",
      level: 1,
      topics: ["SQLite", "Background Tasks"],
      files: ["src/projects/fitness-tracker/db/schema.ts"],
      prompt:
        "`schema.ts` says one PRAGMA \"is not optional here\": the background task writes points while the UI reads them.\n\nWhich SQLite **journal mode** does it set?",
      accept: ["WAL", "journal_mode = WAL", "journal_mode=WAL", /^(pragma\s+)?journal_mode\s*=\s*wal;?$/i, "write-ahead logging", "write-ahead log", "write ahead logging"],
      explain:
        "`PRAGMA journal_mode = WAL`. In the default rollback-journal mode, a reader blocks the writer. If the UI is reading points when a task batch tries to write, that write blocks, and a blocked write inside a task callback means lost points. WAL lets readers and one writer work at the same time. `busy_timeout = 3000` covers the remaining contention, and `synchronous = NORMAL` is the usual safe pairing with WAL.",
    },
    {
      id: "fitness-tracker-11",
      type: "text",
      level: 1,
      topics: ["Config Plugins", "Platform Differences", "Background Tasks"],
      files: ["plugins/withWorkoutCapabilities.js"],
      prompt:
        "One entry in `ANDROID_PERMISSIONS` has this comment: starting a location foreground service without it **throws at runtime, not build time** on Android 14+.\n\nWhich permission is it? (Full name or the short constant.)",
      accept: ["android.permission.FOREGROUND_SERVICE_LOCATION", "FOREGROUND_SERVICE_LOCATION"],
      explain:
        "`android.permission.FOREGROUND_SERVICE_LOCATION`. Since Android 14, each foreground service type needs its own permission, on top of `FOREGROUND_SERVICE` and a declared `foregroundServiceType=\"location\"`. A missing one compiles fine and only crashes when `startLocationUpdatesAsync` starts the service. That's why the plugin test (`configPlugin.test.ts`) asserts it explicitly, and why the doc lists it under failure modes.",
    },
    {
      id: "fitness-tracker-12",
      type: "multi",
      level: 1,
      topics: ["Location & Sensors", "Platform Differences"],
      files: [
        "src/projects/fitness-tracker/sensors/pedometer.ts",
        "src/projects/fitness-tracker/sensors/motion.ts",
        "src/projects/fitness-tracker/sensors/barometer.ts",
        "src/projects/fitness-tracker/hooks/useTodaySteps.ts",
        "src/app/projects/fitness-tracker/workout/active.tsx",
      ],
      prompt:
        "Read the three files in `sensors/` and how `active.tsx` / `useTodaySteps` use them. Select all that apply.",
      choices: [
        "Historical step counts (`Pedometer.getStepCountAsync`) are only used on iOS. On Android the Today ring counts only from when watching began",
        "Motion auto-pause decides \"moving\" from the variance of user acceleration magnitude over about a 2 s window",
        "DeviceMotion samples keep reaching JS while the phone is locked, so the background task can use them for auto-pause",
        "On iOS the barometer gives `relativeAltitude` directly. Otherwise it's derived from pressure, relative to the first reading",
        "The barometer delta replaces GPS altitude in `elevation_gain_m`",
      ],
      answer: [0, 1, 3],
      explain:
        "`getStepsBetween` returns `null` unless `Platform.OS === \"ios\"`, and `useTodaySteps` then shows base 0 plus the live delta. `watchMovement` keeps a window of `2000 / intervalMs` samples and compares the variance to `MOVING_VARIANCE = 0.25`. Sensors are **foreground only**, which is why background auto-pause uses GPS speed in `pipeline.ts`. The barometer delta only appears in the active screen's \"Climb · baro\" label. Stored elevation still comes from GPS altitude with hysteresis.",
    },

    // ------------------------------------------------------------ Level 2
    {
      id: "fitness-tracker-13",
      type: "explain",
      level: 2,
      topics: ["Background Tasks", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/task.ts", "src/app/_layout.tsx"],
      prompt:
        "Explain why `tracking/task.ts` defines the location task at **module scope**, behind `TaskManager.isTaskDefined`, instead of in a `useEffect` on the active workout screen. What does the bug look like if you get this wrong? Also: why is `ingest(fixes)` awaited inside the task callback?",
      model:
        "The OS can relaunch the app headless, with no UI, to deliver a location batch. The only JS that runs then is what evaluates when the bundle loads, which is why the root layout imports `task.ts`. A task defined inside a component works perfectly in the foreground, because the screen is mounted. In the background it silently records nothing: the native side knows the task name, but no callback is registered. The `isTaskDefined` guard makes the module safe to evaluate more than once (fast refresh re-runs it). `ingest` is awaited because the OS may suspend the process as soon as the callback's promise settles, so the SQLite write has to finish first. The Live Activity action listener is registered at module scope for the same reason: lock-screen buttons must work with no screen mounted.",
      rubric: [
        "Headless relaunch: only module-evaluation code runs, and no React tree exists",
        "Imported from the root _layout.tsx, because project layouts don't load on a cold background launch",
        "Failure mode: works in the foreground, silently records nothing in the background",
        "isTaskDefined guard against double definition",
        "Awaiting ingest keeps the process alive until the write commits",
      ],
      explain:
        "See the header comment in `task.ts` and the \"Root-level side effects\" section of AGENTS.md. This is the single most common background-location bug, and it's invisible in foreground testing.",
    },
    {
      id: "fitness-tracker-14",
      type: "explain",
      level: 2,
      topics: ["SQLite", "Background Tasks", "Architecture"],
      files: ["src/projects/fitness-tracker/db/client.ts", "src/projects/fitness-tracker/hooks/useLiveQuery.ts"],
      prompt:
        "The journal and camera projects use `<SQLiteProvider>`. The fitness tracker instead uses a lazy module-scope `getDb()` that caches a promise. Explain why, covering: who else needs the DB, `enableChangeListener`, and what the `.catch(() => { dbPromise = null; ... })` is for.",
      model:
        "The background task writes points with no React tree mounted, so it can't get a connection from a provider. It needs a plain module function. `getDb()` caches the *promise*, so concurrent callers share one open-and-migrate instead of racing two. The UI and the task must also share the same connection, because `addDatabaseChangeListener` only fires for writes made on the connection where `enableChangeListener` was turned on. That's what lets `useLiveQuery` react to background writes. If opening or migrating fails, the cached rejected promise would poison every later call, so the catch clears it and the next call retries.",
      rubric: [
        "The background task has no React tree, so a provider/context isn't available",
        "One cached promise means one open and one migrate, even with concurrent callers",
        "The change listener only sees writes on the same connection where it was enabled, so the UI and task share it",
        "Resetting dbPromise on failure allows a retry instead of a permanently rejected promise",
      ],
      explain:
        "The comment in `db/client.ts` names both reasons: no React tree in the task, and change events scoped to the connection. Podcast downloads use the same pattern for the same reason.",
    },
    {
      id: "fitness-tracker-15",
      type: "order",
      level: 2,
      topics: ["Location & Sensors", "Testing"],
      files: ["src/projects/fitness-tracker/tracking/filters.ts", "src/projects/fitness-tracker/__tests__/filters.test.ts"],
      prompt:
        "Put the stages of `processFix(state, fix, options)` in the order the code runs them. Any rejection returns early.",
      items: [
        "`isValidFix`: reject non-finite or out-of-range coordinates, and (0, 0) \"null island\"",
        "Accuracy gate: reject if `fix.accuracy` > 25 m",
        "Stale gate: reject if the timestamp is not after the last accepted point's `t`",
        "Implied-speed gate (same segment only): reject if distance / time > `MAX_SPEED_MPS[activity]`",
        "`kalmanStep` smooths lat/lng, using the fix's accuracy as measurement noise",
        "Jitter gate: reject if the smoothed point is < 5 m from the last accepted point",
      ],
      explain:
        "That's the order in the code, its header comment and the HTML doc's point-processing list. Stale runs before speed on purpose: see the next question. Cheap validity and accuracy gates come first. Smoothing only runs on fixes that passed the outlier gates, so a GPS jump never pulls the estimate. The jitter gate runs last, on the *smoothed* point, so standing still produces no new points. Each stage has its own case in `filters.test.ts`.",
    },
    {
      id: "fitness-tracker-16",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors"],
      files: ["src/projects/fitness-tracker/tracking/filters.ts"],
      prompt:
        "In `processFix`, the stale check (`fix.timestamp <= last.t`) runs **before** the implied-speed check. What would go wrong if you swapped them?",
      code: "const dt = (fix.timestamp - last.t) / 1000;\nconst d = haversine(last, { lat: fix.latitude, lng: fix.longitude });\nif (d / dt > MAX_SPEED_MPS[options.activity]) return reject(\"speed\");",
      choices: [
        "`dt` could be 0 or negative, giving Infinity, NaN or a negative speed. Duplicate or out-of-order fixes could then pass the speed gate (NaN or negative compares false) or be rejected for the wrong reason",
        "Nothing. Both checks are pure, so their order can't change the result",
        "`haversine` is expensive, so the cheap timestamp comparison should run first. It's only a performance concern",
        "The Kalman state would be advanced twice for the same fix",
      ],
      answer: 0,
      explain:
        "The speed gate divides by `dt`. With `dt = 0` and the same position, `0 / 0 = NaN`, and `NaN > max` is `false`, so the fix passes. A negative `dt` gives a negative speed, which also passes. Only `d > 0, dt = 0` gets caught, and it's mislabelled as \"speed\". Checking stale first guarantees `dt > 0` before any division. Pure functions can still have order-dependent correctness, and the `\"rejects stale or duplicate timestamps\"` test pins this case.",
    },
    {
      id: "fitness-tracker-17",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors", "Testing"],
      files: ["src/projects/fitness-tracker/tracking/filters.ts", "src/projects/fitness-tracker/__tests__/filters.test.ts"],
      prompt:
        "On a jitter rejection, `processFix` returns `reject(\"jitter\", { last, kalman })`. It keeps the **old** `last` but stores the **new** Kalman state. Why not move `last` forward too?",
      choices: [
        "The 5 m check is always against the last *accepted* point, so a slow drift of many sub-5 m steps can't add up to fake distance. The smoother still stays warm",
        "Moving `last` would make the next fix fail the stale check",
        "The jitter point is buffered and written with the next accepted point",
        "`last` is immutable, because `FilterState` is persisted as JSON",
      ],
      answer: 0,
      explain:
        "If `last` advanced on every jittery fix, each fix would be within 5 m of the previous one, and the anchor would creep. Then some fix would eventually be more than 5 m from an anchor that had already drifted, and you'd record distance while standing still. Keeping the anchor fixed means you need a real net 5 m of movement. Updating `kalman` keeps the variance and `t` current, so the next real movement isn't over-smoothed. The test \"stops standing-still drift from accumulating distance\" feeds 300 noisy stationary fixes and expects fewer than 10 accepted points.",
    },
    {
      id: "fitness-tracker-18",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors", "Testing"],
      files: ["src/projects/fitness-tracker/tracking/metrics.ts", "src/projects/fitness-tracker/__tests__/metrics.test.ts"],
      prompt:
        "`elevationChange` uses `ELEVATION_HYSTERESIS_M = 3`. What does it return for these GPS altitudes?",
      code: "elevationChange([100, 102, 101, 103, 106, 104])",
      choices: ["gain 6 m, loss 0 m", "gain 7 m, loss 3 m", "gain 3 m, loss 0 m", "gain 6 m, loss 2 m"],
      answer: 0,
      explain:
        "The reference starts at 100. 102 and 101 are within ±3, so nothing changes. 103 is +3 from the reference: gain 3, and the reference moves to 103. 106 is +3: gain 3 more, reference 106. 104 is −2, below the threshold. Total: gain 6, loss 0. Summing every raw delta would give 7 up / 3 down, and that's exactly the noise the hysteresis removes (a flat 10 km run would otherwise \"climb\" 300 m). `stepElevation` is the incremental version used by the live pipeline, and a test checks it agrees with the batch version.",
    },
    {
      id: "fitness-tracker-19",
      type: "mcq",
      level: 2,
      topics: ["Background Tasks", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/queue.ts", "src/projects/fitness-tracker/tracking/controller.ts", "src/projects/fitness-tracker/tracking/pipeline.ts"],
      prompt:
        "Every session read-modify-write goes through `enqueue` in `tracking/queue.ts`: task batches, UI pause/resume, notification actions, motion auto-pause and the crash-recovery checks (`findRecoverable`, `reattach`). What does this implementation guarantee?",
      code: "let chain: Promise<unknown> = Promise.resolve();\n\nexport function enqueue<T>(job: () => Promise<T>): Promise<T> {\n  const run = chain.then(job, job);\n  chain = run.catch(() => undefined);\n  return run;\n}",
      choices: [
        "Jobs run strictly one at a time. A failed job doesn't stall later jobs, but its own caller still sees the rejection",
        "Jobs run in parallel, but results come back in submission order",
        "A failed job is retried once before the next job starts",
        "If one job fails, every job queued behind it is cancelled",
      ],
      answer: 0,
      explain:
        "`chain.then(job, job)` starts the job after the previous one settles, whether it succeeded or failed. `chain = run.catch(() => undefined)` keeps the chain itself from ever rejecting, while the returned `run` still rejects for its caller. Without serialisation, two read-modify-write cycles on the single session row could interleave, for example a pause from the lock screen and a GPS batch. That would silently drop the pause or double-count a batch. This is a mutex built from a promise chain, and it's enough because JS is single-threaded.",
    },
    {
      id: "fitness-tracker-20",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/autoPause.ts", "src/projects/fitness-tracker/hooks/useMotionAutoPause.ts"],
      prompt:
        "`DEFAULT_AUTO_PAUSE` pauses after 8 s of stillness but resumes after only 3 s of movement. Why the asymmetry?",
      choices: [
        "Pausing late costs little (a few seconds of standing time), while resuming late throws away real distance the user is covering",
        "GPS reports stops faster than starts, so the timings cancel each other out",
        "iOS requires auto-pause to resume within 3 s or it ends the background session",
        "A shorter resume window saves battery, because fewer stationary fixes are processed",
      ],
      answer: 0,
      explain:
        "The header of `autoPause.ts` says it directly: pausing late is cheap, resuming late loses real distance. While auto-paused, the pipeline drops fixes (`session.status !== \"active\"`), so every extra second before resuming is distance gone for good. `stepAutoPause` is a pure state machine fed by two sources: GPS speed in the pipeline (works in the background) and DeviceMotion variance in `useMotionAutoPause` (faster, foreground only). The `moving` flag resets on any still sample, so a single blip never resumes.",
    },
    {
      id: "fitness-tracker-21",
      type: "mcq",
      level: 2,
      topics: ["Performance", "Location & Sensors"],
      files: ["src/projects/fitness-tracker/utils/paceColor.ts", "src/projects/fitness-tracker/components/map/RouteMap.tsx", "src/app/projects/fitness-tracker/workout/active.tsx"],
      prompt:
        "The active screen passes `paceColoredSegments(douglasPeucker(points, 3))` to `RouteMap`. Apart from simplifying, how does `paceColoredSegments` keep the native map fast?",
      choices: [
        "It merges consecutive legs in the same pace bucket into one `<Polyline>`, so the map gets tens of native views instead of one per leg. It also breaks the line at segment boundaries",
        "It draws the route on a Skia canvas laid over the map instead of using `Polyline`",
        "It keeps only the last 300 points, so long workouts show a sliding window",
        "It builds one `Polyline` with a per-vertex colour array, so there's always exactly one native view",
      ],
      answer: 0,
      explain:
        "The function comment explains that one `<Polyline>` per leg would put thousands of native views on the map. Grouping by colour bucket brings that down to tens. The buckets are relative to this workout's own 10th–90th percentile pace, so a walk and a sprint both use the full palette. A cross-segment leg produces `NaN` pace → bucket −1, which ends the current line. That way a pause never gets drawn as a straight jump.",
    },
    {
      id: "fitness-tracker-22",
      type: "order",
      level: 2,
      topics: ["Background Tasks", "SQLite", "Location & Sensors"],
      files: ["src/projects/fitness-tracker/tracking/task.ts", "src/projects/fitness-tracker/tracking/pipeline.ts", "src/projects/fitness-tracker/tracking/queue.ts"],
      prompt:
        "A deferred batch of 30 locations arrives while the phone is locked. Put what happens in order.",
      items: [
        "The OS calls the callback registered with `TaskManager.defineTask(LOCATION_TASK)` with `data.locations`",
        "The task maps each `LocationObject` to a `RawFix` and awaits `ingest(fixes)`",
        "`ingest` puts `ingestNow` on the single promise chain in `queue.ts`",
        "`ingestNow` loads the session row from SQLite and returns early if there's none or it's manually paused",
        "Fixes are sorted by timestamp, and each one goes through auto-pause stepping and then `processFix`",
        "One `withTransactionAsync` writes the points, the rolling totals (`addRolling`) and the updated session, then `liveActivity.update` runs",
      ],
      explain:
        "That's the path through `task.ts` → `pipeline.ts`. The session is re-read from SQLite on every batch, because the runtime may have been killed since the last one. Fixes are sorted because batches can arrive out of order. Everything is committed in **one** transaction, so points, totals and session can never disagree after a kill. It's also a single fsync instead of thirty. The Live Activity update after the commit is throttled to about 1 Hz.",
    },
    {
      id: "fitness-tracker-23",
      type: "order",
      level: 2,
      topics: ["Background Tasks", "Location & Sensors", "SQLite"],
      files: ["src/projects/fitness-tracker/tracking/controller.ts"],
      prompt: "Put the steps of `startWorkout(options)` in `controller.ts` in order.",
      items: [
        "If a session row already exists, re-arm tracking for it and return its workout id",
        "Throw unless foreground location permission is granted",
        "Read background permission (it decides `session.background`) plus battery level / low-power mode",
        "`insertWorkout` with status `'active'`",
        "`saveSession`, so the very first task invocation finds a session",
        "`ensureTracking` (`startLocationUpdatesAsync` or the `watchPositionAsync` fallback), then `liveActivity.start`",
      ],
      explain:
        "The early return makes start **idempotent**: a double tap, or a start after a kill, converges on the existing workout. The session is saved *before* updates start, because the first batch can arrive right away, and `ingestNow` drops fixes when there's no session. Without background permission, `session.background` is false and `ensureTracking` falls back to a foreground-only `watchPositionAsync`. The active screen then shows a \"keep the app open\" banner.",
    },
    {
      id: "fitness-tracker-24",
      type: "text",
      level: 2,
      topics: ["Native Modules", "Testing"],
      files: ["modules/live-activity/src/LiveActivityModule.ts", "modules/live-activity/index.ts"],
      prompt:
        "The JS side of the local module gets the native module with a function from `expo` that returns `null` (instead of throwing at import time) in Expo Go, on web and in Jest. That's what lets every wrapper function in `index.ts` degrade to a no-op.\n\nWhich function is it?",
      accept: ["requireOptionalNativeModule", /^requireOptionalNativeModule\s*(<[^>]*>)?\s*(\(.*\))?$/i],
      explain:
        "`requireOptionalNativeModule<LiveActivityNativeModule>(\"LiveActivity\")`. `requireNativeModule` would throw as soon as the module is imported anywhere a dev build isn't running. That includes Jest tests that indirectly import the pipeline, and Expo Go. With the optional variant, `index.ts` can write `LiveActivityModule?.update(state)` and `isAvailable()` simply returns `false`. The permissions screen shows that as \"needs a development build\".",
    },
    {
      id: "fitness-tracker-25",
      type: "text",
      level: 2,
      topics: ["SQLite", "React Hooks"],
      files: ["src/projects/fitness-tracker/hooks/useLiveQuery.ts", "src/projects/fitness-tracker/hooks/useLivePoints.ts", "src/projects/fitness-tracker/db/client.ts"],
      prompt:
        "`useLiveQuery` and `useLivePoints` re-read SQLite whenever a table changes, with no polling and no TanStack Query. Which `expo-sqlite` **function** do they subscribe with?",
      accept: ["addDatabaseChangeListener", /^addDatabaseChangeListener\s*(\(.*\))?$/i],
      explain:
        "`addDatabaseChangeListener(({ tableName }) => ...)`. It only receives events for connections opened with `enableChangeListener: true`, which `getDb()` sets. Because the background task writes through that same connection, the UI updates live from background writes. The UI reads the database, never task memory. Both hooks debounce the callback (100 ms and 150 ms), because a batch insert fires one event per row.",
    },
    {
      id: "fitness-tracker-26",
      type: "text",
      level: 2,
      topics: ["Config Plugins", "Testing"],
      files: ["src/projects/fitness-tracker/__tests__/configPlugin.test.ts"],
      prompt:
        "`configPlugin.test.ts` runs the plugin's mods in memory with `introspect: true`. No `ios/` or `android/` folder gets written. Which function from `expo/config-plugins` does it call?",
      accept: ["compileModsAsync", /^compileModsAsync\s*(\(.*\))?$/i],
      explain:
        "`compileModsAsync(config, { projectRoot, introspect: true, platforms: [\"ios\", \"android\"] })`. Introspection is what `npx expo config --type introspect` does. Plist, entitlements and manifest mods run against Expo's templates and write their results back into the config (`config.ios.infoPlist`, `_internal.modResults.android.manifest`). Dangerous mods such as file copies are skipped. The test uses a fresh temp `projectRoot`, so a leftover prebuilt `ios/` folder can't leak real entitlements into the assertions. It runs under `@jest-environment node`.",
    },
    {
      id: "fitness-tracker-27",
      type: "multi",
      level: 2,
      topics: ["SQLite", "React Hooks", "Expo Router", "Performance"],
      files: ["src/projects/fitness-tracker/hooks/useLiveQuery.ts", "src/projects/fitness-tracker/hooks/useWorkouts.ts"],
      prompt: "About `useLiveQuery` (used by `useWorkouts`, `useSession`, `useStats`, …). Select all that apply.",
      choices: [
        "It re-runs `select` when a watched table changes, including after writes from the background location task",
        "It debounces change events by 100 ms, because a batch insert fires one event per row",
        "It stops listening while the screen is unfocused (`useIsFocused`) and reloads on refocus",
        "It caches results in the app-wide TanStack Query client under a `[\"fitness\", …]` key",
        "It polls the database once per second while a workout is active",
        "`select` must be referentially stable (module-level, or memoised by the React Compiler), otherwise the effect re-subscribes on every render",
      ],
      answer: [0, 1, 2, 5],
      explain:
        "The effect depends on `[select, watched, focused]`. That's why `selectSession`, `selectPrefs` and the others are module-level, and inline selects rely on the React Compiler memoising them on their captured values. The focus gate exists because every fix batch writes `workouts`. Without it, the Today, History and Stats tabs stacked under the active screen would re-run heavy queries about once a second. The fitness tracker doesn't use TanStack Query for local data: SQLite is the source of truth, and change events replace cache invalidation.",
    },
    {
      id: "fitness-tracker-28",
      type: "multi",
      level: 2,
      topics: ["Config Plugins", "Expo Config & EAS"],
      files: ["plugins/withWorkoutCapabilities.js", "plugins/workout-widget/Info.plist"],
      prompt: "What does `withWorkoutCapabilities` do on the **iOS** side? Select all that apply.",
      choices: [
        "Adds `\"location\"` to `UIBackgroundModes` without duplicating it",
        "Sets `NSSupportsLiveActivities = true`",
        "Sets `NSSupportsLiveActivitiesFrequentUpdates = true` so the activity can update at 1 Hz",
        "Adds the App Group to `com.apple.security.application-groups` and sets `com.apple.developer.healthkit`",
        "Copies the widget Swift sources into `ios/WorkoutWidget` with `withDangerousMod`, and registers an `app_extension` target with `withXcodeProject`",
        "Edits files in a committed `ios/` folder, which prebuild then keeps",
      ],
      answer: [0, 1, 3, 4],
      explain:
        "`NSSupportsLiveActivitiesFrequentUpdates` is set to **false**. The comment says updates are only local (about 1 Hz, throttled in JS), so no push-token budget is needed. `/ios` is gitignored build output (Continuous Native Generation): every native change must be reproducible from mods, and that's the whole reason the plugin exists. The Xcode mod returns early if `pbxTargetByName(\"WorkoutWidget\")` already exists, so the target is never added twice.",
    },
    {
      id: "fitness-tracker-29",
      type: "multi",
      level: 2,
      topics: ["Native Modules", "Platform Differences"],
      files: [
        "modules/live-activity/ios/LiveActivityModule.swift",
        "modules/live-activity/android/src/main/java/expo/modules/liveactivity/LiveActivityModule.kt",
        "modules/live-activity/expo-module.config.json",
        "modules/live-activity/src/LiveActivityModule.ts",
      ],
      prompt:
        "Compare the Swift and Kotlin `LiveActivityModule` definitions (Expo Modules API). Select all that apply.",
      choices: [
        "Both declare `Name(\"LiveActivity\")`, and that's the string the JS side passes to `requireOptionalNativeModule`",
        "`Events(\"onAction\")` declares the event JS subscribes to with `addListener(\"onAction\", …)`",
        "`Function(\"consumePendingAction\")` returns synchronously to JS, while `AsyncFunction(\"start\")` returns a Promise",
        "`AttributesRecord` / `StateRecord` with `@Field` turn the plain JS objects into typed native values",
        "The module only gets autolinked because it's listed in the `plugins` array of `app.config.ts`",
        "The Kotlin side implements Live Activities by back-porting ActivityKit to Android",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "Autolinking finds local modules in `modules/` through `expo-module.config.json`, which lists `LiveActivityModule` for Apple and `expo.modules.liveactivity.LiveActivityModule` for Android. No plugin entry is involved. The class names differ from the JS-facing `Name(\"LiveActivity\")`. Android has no Live Activities: the Kotlin module shows an ongoing `NotificationCompat` notification with action buttons. JS sees the same interface on both platforms, and the asymmetry stays on the native side of the bridge.",
    },
    {
      id: "fitness-tracker-30",
      type: "explain",
      level: 2,
      topics: ["SQLite", "Location & Sensors", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/controller.ts", "src/projects/fitness-tracker/db/queries/workouts.ts", "src/projects/fitness-tracker/tracking/metrics.ts"],
      prompt:
        "During a workout, the pipeline keeps `distance_m`, `moving_ms` and the elevation columns up to date with `addRolling`. Yet `stopWorkout` overwrites them with values recomputed by `summarize(points)`. Explain both halves: why `addRolling` uses SQL increments (`distance_m = distance_m + ?` with `RETURNING *`), and why the finish recomputes from points.",
      model:
        "The rolling values exist only so the live UI and Live Activity can show totals without re-reading thousands of points. `addRolling` increments in SQL, so concurrent or out-of-order batches can't lose an update through read-modify-write. `RETURNING *` hands back the new row without a second query. Points are the source of truth, though: the finish runs the same pure functions the tests verify against the GPX fixture, and the comment says the rolling values are for display only. `summarize` also produces what rolling totals can't, such as km splits with interpolated boundaries, max speed, the Douglas–Peucker thumbnail, and calories from the final moving time. So any drift in the incremental path never reaches history.",
      rubric: [
        "Rolling totals are for live display only. Points are the source of truth",
        "SQL increments avoid lost updates from read-modify-write, and RETURNING saves a re-read",
        "summarize(points) is the pure, tested path (GPX fixture)",
        "Finish also derives splits, thumbnail and calories, which only make sense over the full track",
      ],
      explain:
        "See `stopWorkout`'s comment \"Recompute from points: the rolling values are for display only\" and the `addRolling` doc comment in `db/queries/workouts.ts`.",
    },

    // ------------------------------------------------------------ Level 3
    {
      id: "fitness-tracker-31",
      type: "explain",
      level: 3,
      topics: ["Background Tasks", "SQLite", "Offline & Sync"],
      files: ["src/projects/fitness-tracker/tracking/state.ts", "src/projects/fitness-tracker/tracking/pipeline.ts", "src/projects/fitness-tracker/db/schema.ts"],
      prompt:
        "`Session` (stored as JSON in a single-row `session` table) holds `filter`, `elevationRef`, `autoPauseState`, `segment`, `pausedAt` and `pausedTotalMs`. Explain why this state lives in SQLite and not in module variables, and give at least two **concrete** bugs you'd see after the OS kills the JS runtime between two task batches if it were kept in memory.",
      model:
        "The JS runtime can be killed between two task invocations, and the next batch may start in a fresh headless runtime. So everything the next invocation needs must be persisted, and it's saved in the same transaction as the points. If `filter.last` were in memory, the first fix after a restart would skip the speed and jitter gates, and a GPS jump would be recorded. The Kalman smoother would also restart cold. Losing `elevationRef` restarts the hysteresis, and losing `autoPauseState` resets the still/moving timers, so auto-pause fires late or never. Losing `pausedAt` / `pausedTotalMs` breaks the elapsed clock, which is derived from timestamps (`activeElapsedMs`), not from a stopwatch. The single transaction also means the session can never be ahead of or behind the points it describes.",
      rubric: [
        "The runtime may die between invocations, and the next batch can run in a fresh headless process",
        "Concrete bug: speed/jitter gates bypassed or Kalman reset without filter.last",
        "Concrete bug: elevation hysteresis or auto-pause timers reset",
        "The elapsed time is derived from persisted timestamps, not an in-memory stopwatch",
        "The session is saved in the same transaction as the points, so they stay consistent",
      ],
      explain:
        "See the header comment in `state.ts`, the `CHECK (id = 1)` single-row table in `schema.ts`, and `useElapsed`, which ticks from persisted timestamps.",
    },
    {
      id: "fitness-tracker-32",
      type: "multi",
      level: 3,
      topics: ["Background Tasks", "SQLite", "Architecture"],
      files: [
        "src/projects/fitness-tracker/tracking/controller.ts",
        "src/app/projects/fitness-tracker/(tab)/index.tsx",
        "src/projects/fitness-tracker/components/RecoveryBanner.tsx",
        "src/projects/fitness-tracker/__tests__/controller.test.ts",
      ],
      prompt:
        "The process died mid-workout. Read `findRecoverable`, `reattach` and how the Today screen wires `RecoveryBanner`. Select all that apply.",
      choices: [
        "A session row on launch, with no running location source, is treated as an interrupted workout and shows the banner",
        "Unfinished workout rows with no matching session (killed between `insertWorkout` and `saveSession`) are deleted",
        "\"Resume\" calls `reattach()`, which re-arms location updates without changing the pause state",
        "\"Finish\" calls `stopWorkout()`, which recomputes totals from the points already persisted",
        "Fixes received since the last batch were held in a JS array and get replayed from memory",
        "Recovery creates a new workout id and copies the old points into it",
        "`findRecoverable` runs through `enqueue`, so it can't delete the row of a `startWorkout` that is still between `insertWorkout` and `saveSession`",
      ],
      answer: [0, 1, 2, 3, 6],
      explain:
        "`findRecoverable` returns `{ session, tracking }`. For background sessions, `tracking` is `hasStartedLocationUpdatesAsync`. A background workout that is *still* recording (the OS kept the service alive) therefore shows no banner. Every accepted point was written when its batch arrived, so nothing lives only in memory. That's the core design rule. Both functions are wrapped in `enqueue` like every other controller entry point. Without that, the Today screen's mount-time `findRecoverable` could run while a start is suspended between `insertWorkout` and `saveSession`: it would see a workout row with no session, treat it as a kill-time orphan and delete it, and the session saved a moment later would point at a missing row. `controller.test.ts` holds a start at exactly that point to pin it.",
    },
    {
      id: "fitness-tracker-33",
      type: "mcq",
      level: 3,
      topics: ["Background Tasks", "Platform Differences"],
      files: ["src/projects/fitness-tracker/tracking/config.ts"],
      prompt:
        "In `locationTaskOptions`, the Android foreground service is configured with `killServiceOnDestroy: false`. Per expo-location's type docs, the flag is \"whether to destroy the foreground service if the app is killed\". The user swipes the app away from recents mid-run. What does `false` do, and why is it the right value here?",
      choices: [
        "It keeps the location foreground service, and recording, running after the swipe. `true` would destroy the service and end the recording with the app",
        "It stops tracking on swipe-away, so a forgotten workout doesn't drain the battery",
        "It removes the persistent notification but keeps the service",
        "It's an iOS-only flag that controls `showsBackgroundLocationIndicator`",
      ],
      answer: 0,
      explain:
        "`killServiceOnDestroy: true` would destroy the service when the app's task is removed. `false` leaves it running, which is the behaviour you want for a workout: the user can swipe the app away and keep recording. The headless task keeps writing to SQLite, and `findRecoverable` will later see `tracking: true`, so no recovery banner appears. With `true`, a swipe would end the service, and the next launch would find a session with no running location source and offer the recovery banner. The comment above the flag says the same; when in doubt, check the library's types in `node_modules/expo-location` rather than guessing from the name.",
    },
    {
      id: "fitness-tracker-34",
      type: "mcq",
      level: 3,
      topics: ["Native Modules", "Performance"],
      files: ["src/projects/fitness-tracker/liveactivity/index.ts"],
      prompt:
        "`update(state, force)` in `liveactivity/index.ts` throttles to `MIN_INTERVAL_MS = 1000`. The last push happened at time T. Then `update(A)` is called at T+200 ms and `update(B)` at T+600 ms, both with `force = false`. What reaches the native module?",
      choices: [
        "Only B, at about T+1000 ms",
        "A at T+1000 ms. B is dropped, because a timer was already pending",
        "A right away, then B at T+1600 ms",
        "Both A and B, back to back at T+1000 ms",
      ],
      answer: 0,
      explain:
        "At T+200 the remaining wait is 800 ms. `pending` is null, so a timer is scheduled. At T+600, `latest = B` is set, but a timer already exists, so nothing else happens. When the timer fires it sends `latest`, which is B. That's a trailing throttle: it coalesces bursts and always delivers the newest state. Status changes pass `force = true` (from `transition` and pipeline status flips), so a pause shows up on the lock screen immediately. iOS throttles or terminates an activity that's updated at GPS rate.",
    },
    {
      id: "fitness-tracker-35",
      type: "mcq",
      level: 3,
      topics: ["Native Modules", "Platform Differences", "Background Tasks"],
      files: [
        "modules/live-activity/android/src/main/java/expo/modules/liveactivity/LiveActivityActionReceiver.kt",
        "modules/live-activity/android/src/main/java/expo/modules/liveactivity/WorkoutNotification.kt",
        "src/projects/fitness-tracker/tracking/task.ts",
        "src/app/_layout.tsx",
      ],
      prompt:
        "On Android, the user taps **End** on the ongoing workout notification while the JS runtime is gone. Later the app is launched, and the user stays on the launcher. What happens?",
      choices: [
        "`LiveActivityActionReceiver` finds no listener and stores the action in SharedPreferences. On launch, the root layout's `startPendingActionReplay()` runs `replayPendingAction()`, which calls `consumePendingAction()` and `handleAction(\"end\")`, without the tracker ever being opened",
        "The action stays parked until the user opens the fitness tracker, because only its project layout can replay it",
        "Android starts JS headlessly and calls the TaskManager location task with the action in `data`",
        "The tap is lost. Without a JS runtime, a `PendingIntent.getBroadcast` can't be delivered",
      ],
      answer: 0,
      explain:
        "The receiver's `companion object` holds a `@Volatile listener` that is set in the module's `OnCreate`. If it's null, the action goes into `workout_live_activity` prefs. `src/app/_layout.tsx` calls `startPendingActionReplay()` at module scope, so on any launch (headless included) `consumePending` reads and removes the action and it's replayed, and again on every `AppState` change to \"active\". Running it from the root is safe because `handleAction` touches no UI or navigation: it only calls the controller's `enqueue`d entry points (SQLite, location updates, Live Activity). If the replay lived in the fitness project's layout instead, a parked End would wait until the user opened the tracker, with the foreground service still recording. The broadcast itself is always delivered, because it's a manifest-declared, non-exported receiver reached only by the app's own immutable PendingIntents.",
    },
    {
      id: "fitness-tracker-36",
      type: "order",
      level: 3,
      topics: ["Native Modules", "Background Tasks"],
      files: [
        "plugins/workout-widget/WorkoutLiveActivity.swift",
        "modules/live-activity/ios/WorkoutAttributes.swift",
        "modules/live-activity/ios/LiveActivityModule.swift",
        "src/projects/fitness-tracker/tracking/task.ts",
        "src/projects/fitness-tracker/tracking/controller.ts",
      ],
      prompt:
        "iOS 17: the user taps **Pause** on the lock-screen Live Activity. Put the hops in order.",
      items: [
        "SwiftUI `Button(intent: WorkoutActionIntent(action: \"pause\"))` in the widget extension's UI is tapped",
        "`WorkoutActionIntent.perform()` (a `LiveActivityIntent`) runs in the app's process and calls `WorkoutShared.deliver(action:)`",
        "`deliver` writes the action into App Group `UserDefaults` and posts a Darwin notification",
        "`LiveActivityModule`'s `CFNotificationCenter` observer calls `flushPendingAction`, which consumes the stored action",
        "`sendEvent(\"onAction\")` reaches the listener registered at module scope in `tracking/task.ts`, which calls `handleAction`",
        "`pauseWorkout` → `transition` saves the session and force-updates the Live Activity",
      ],
      explain:
        "Storing the action and then signalling is the key pattern. The action lives in shared `UserDefaults` (`pendingActionKey`), so if JS isn't listening, `consumePendingAction()` can still pick it up later. Darwin notifications cross process boundaries, which `NotificationCenter.default` doesn't. That matters because the button UI is rendered by the extension. A `LiveActivityIntent` runs `perform()` in the app process, which is already alive because it's tracking location. iOS 16 can't host interactive buttons (`ActionButtons` renders `EmptyView`).",
    },
    {
      id: "fitness-tracker-37",
      type: "mcq",
      level: 3,
      topics: ["Native Modules", "Config Plugins"],
      files: ["modules/live-activity/ios/WorkoutAttributes.swift", "plugins/withWorkoutCapabilities.js"],
      prompt:
        "`withWidgetSources` copies `modules/live-activity/ios/WorkoutAttributes.swift` byte for byte into the `WorkoutWidget` extension, instead of keeping a second hand-written copy there. Why does that matter?",
      choices: [
        "ActivityKit pairs the app's activity with the extension's UI by type name and Codable shape. Two copies that drift apart fail silently, so one source file keeps them identical. It also can't import `ExpoModulesCore`, because the extension doesn't link it",
        "Xcode can't reference a source file that lives outside `ios/`",
        "The widget extension could otherwise just import the `LiveActivity` pod, so copying only saves build time",
        "Copying makes the main app binary smaller, because the file moves out of the app target",
      ],
      answer: 0,
      explain:
        "The file header spells out the contract: a single source of truth for the `ActivityAttributes` type, because a mismatch between app and extension produces no error, just no Live Activity UI. The same file also holds `WorkoutShared` (App Group key, Darwin notification name) and `WorkoutActionIntent`, which both processes need. That's why it must stay free of `ExpoModulesCore`. `SWIFT_SOURCES` lists it, so the Xcode mod adds it to the extension's Sources phase.",
    },
    {
      id: "fitness-tracker-38",
      type: "text",
      level: 3,
      topics: ["Native Modules", "Config Plugins"],
      files: ["modules/live-activity/ios/WorkoutAttributes.swift", "plugins/withWorkoutCapabilities.js", "plugins/workout-widget/Info.plist"],
      prompt:
        "Neither the app nor the widget extension hard-codes the App Group id in Swift. `WorkoutShared.appGroup` reads it from an Info.plist key that the config plugin writes into **both** the app's plist and the extension's plist (replacing `__APP_GROUP__`).\n\nWhat is that Info.plist key?",
      accept: ["WorkoutAppGroup"],
      explain:
        "`Bundle.main.object(forInfoDictionaryKey: \"WorkoutAppGroup\")`. `withWorkoutInfoPlist` sets it in the app, and `withWidgetSources` substitutes it into the extension's `Info.plist`. Both values come from the single `appGroup` prop, which `assertAppGroup` checks starts with `group.`. The doc calls an app/extension group mismatch \"silent and maddening\": the widget just shows zeros. Deriving both from one prop makes that mismatch impossible.",
    },
    {
      id: "fitness-tracker-39",
      type: "mcq",
      level: 3,
      topics: ["Config Plugins", "Testing"],
      files: ["src/projects/fitness-tracker/__tests__/configPlugin.test.ts", "plugins/withWorkoutCapabilities.js"],
      prompt:
        "`configPlugin.test.ts` applies the plugin twice in two tests. \"The run-once wrapper skips a second application\" uses the exported plugin. \"Each mod is idempotent on its own\" uses `withWorkoutCapabilitiesUnwrapped`. Why does the second test need the unwrapped function to exercise `addUnique` and `ensurePermissions`?",
      choices: [
        "The export is wrapped in `createRunOncePlugin`, which records the plugin name in the config's plugin history. A second call returns the config unchanged, so with the wrapped export the second set of mods never registers and the dedupe logic never sees its own output",
        "The unwrapped function skips `assertAppGroup`, which would throw on the second call",
        "`compileModsAsync` deduplicates identical mods from the same plugin, so only the unwrapped one registers twice",
        "Introspection mode only runs mods from unwrapped plugins",
      ],
      answer: 0,
      explain:
        "`module.exports = createRunOncePlugin(withWorkoutCapabilities, \"withWorkoutCapabilities\", \"1.0.0\")`. `withRunOnce` returns early if `getHistoryItem(config, name)` already exists, so the wrapped test would still pass with `addUnique` reduced to a plain concat. The plugin's *other* idempotency concern is `prebuild` without `--clean`, where the native files already contain the values. That's handled by `addUnique`, `ensurePermissions`, the receiver `some(...)` check, the `appExtensions` check and `pbxTargetByName`. Applying the raw function twice registers both copies of every mod, so the second copy runs on the first one's output, which is the same situation. `module.exports.withWorkoutCapabilitiesUnwrapped` exists only for that test; runtime behaviour still goes through the run-once export.",
    },
    {
      id: "fitness-tracker-40",
      type: "multi",
      level: 3,
      topics: ["Native Modules", "Performance", "Platform Differences"],
      files: [
        "src/projects/fitness-tracker/liveactivity/index.ts",
        "src/projects/fitness-tracker/tracking/widget.ts",
        "plugins/workout-widget/WorkoutLiveActivity.swift",
        "plugins/workout-widget/TodayWidget.swift",
        "modules/live-activity/android/src/main/java/expo/modules/liveactivity/WorkoutNotification.kt",
      ],
      prompt:
        "Lock-screen and home-screen surfaces have strict OS update budgets. Which of these mechanisms does the repo actually use to stay within them? Select all that apply.",
      choices: [
        "The JS wrapper throttles Live Activity updates to at most about one per second and always sends the latest state",
        "The clock ticks natively from `timerStart` (`Text(timerInterval:)` on iOS, `setUsesChronometer` on Android), so JS never pushes once per second just for the clock",
        "`syncWidget(steps)` only pushes when steps cross a 100-step bucket, debounced by 2 s",
        "A `setInterval` calls `setWidgetData` every second while the Today tab is open",
        "The TodayWidget timeline asks WidgetKit for a fresh entry every minute",
      ],
      answer: [0, 1, 2],
      explain:
        "`syncWidget`'s doc comment says \"Never on a timer\". Pushes are event-driven and bucketed, and pushes after a finished workout go out immediately. `TodayProvider.getTimeline` uses a **30-minute** `.after` policy, only as a fallback to keep \"today\" correct across midnight. Real refreshes come from `WidgetCenter.reloadAllTimelines()` in `setWidgetData`, and the system still budgets those. On iOS, `update` also sets a 10-minute `staleDate`, so if the pipeline dies the activity greys out instead of showing a frozen \"live\" distance.",
    },
    {
      id: "fitness-tracker-41",
      type: "explain",
      level: 3,
      topics: ["Config Plugins", "Expo Config & EAS"],
      files: ["app.config.ts", "plugins/withWorkoutCapabilities.js", "plugins/withSceneLifecycle.js"],
      prompt:
        "In `app.config.ts`, `./plugins/withWorkoutCapabilities` is listed **before** `expo-share-intent`, and `./plugins/withSceneLifecycle` is listed first of all. Explain the rule about plugin order that makes this deliberate, and what would go wrong with the App Group entitlement if `withWorkoutCapabilities` were moved after `expo-share-intent`.",
      model:
        "Each plugin wraps the mod chain for a file, so the mods registered by **later** plugins run **first**. To make your mod see the final value, you list your plugin earlier. expo-share-intent prepends its App Group to `com.apple.security.application-groups` without checking for duplicates. `app.config.ts` already lists that same group in `ios.entitlements`, so the array ends up with a duplicate. Listed earlier, `withWorkoutEntitlements` runs after share-intent, and `addUnique` collapses the array to one entry. If the order were swapped, it would dedupe first and share-intent would then add the duplicate back. The test \"collapses an App Group another plugin already duplicated\" covers that collapse. `withSceneLifecycle` is listed first for the same reason: its AppDelegate mod must run last, after every other plugin's edits.",
      rubric: [
        "Mods of later-listed plugins run first (reverse order)",
        "expo-share-intent adds the App Group without deduping",
        "withWorkoutCapabilities is listed earlier so it runs later and addUnique cleans the array",
        "Reversed order leaves a duplicate entitlement entry",
        "Same reasoning for withSceneLifecycle's AppDelegate mod running last",
      ],
      explain:
        "Both ordering comments are in the `plugins` array of `app.config.ts`, and the `addUnique` comment in `withWorkoutCapabilities.js` says the same. AGENTS.md lists \"Plugin order matters\" under Expo Configuration.",
    },
    {
      id: "fitness-tracker-42",
      type: "explain",
      level: 3,
      topics: ["Native Modules", "Performance", "Platform Differences"],
      files: [
        "modules/live-activity/src/LiveActivity.types.ts",
        "src/projects/fitness-tracker/liveactivity/index.ts",
        "plugins/workout-widget/WorkoutLiveActivity.swift",
        "modules/live-activity/android/src/main/java/expo/modules/liveactivity/WorkoutNotification.kt",
      ],
      prompt:
        "`WorkoutActivityState` sends `timerStart` (epoch ms = now − active elapsed) as well as `elapsedSec`. Explain why the lock-screen clock is driven by `timerStart` instead of JS pushing a new `elapsedSec` every second, how pauses are handled, and how Android gets the same effect.",
      model:
        "Native UI can render a self-ticking timer from a fixed start instant. On iOS that's `Text(timerInterval: timerStart...distantFuture)`, and on Android it's `setUsesChronometer(true).setWhen(timerStart)`. The clock then advances every second with no JS involvement. That matters because iOS throttles or kills an activity that's updated too often, and the JS might be suspended between GPS batches anyway. JS only pushes when distance, pace or status changes, throttled to about 1 Hz, with forced pushes on status changes. `buildState` computes `timerStart = now - activeElapsedMs(session)`, so paused time is already excluded. While paused, `ElapsedText` shows the static `elapsedSec` and the Android notification turns the chronometer off. The payload stays small (iOS caps it at 4 KB).",
      rubric: [
        "Native self-ticking timer from a start instant (Text(timerInterval:) / chronometer)",
        "Avoids per-second updates: iOS budget/throttling, and JS may be suspended",
        "timerStart = now − active elapsed, so pauses are already subtracted",
        "Paused state shows the static elapsedSec, with the chronometer off on Android",
      ],
      explain:
        "See the `timerStart` doc comment in `LiveActivity.types.ts`, `ElapsedText` in `WorkoutLiveActivity.swift`, and the chronometer comment in `WorkoutNotification.kt`.",
    },
  ],
});

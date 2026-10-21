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
        "The background location task, `startLocationUpdatesAsync` and `hasStartedLocationUpdatesAsync` all refer to the same task by name. Open `tracking/config.ts`.\n\nWhat is the **string value** of `LOCATION_TASK`?\n\nSearch: `grep -rn LOCATION_TASK src` and note every file that imports it.",
      accept: ["fitness-tracker-location"],
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" },
        { title: "Expo Location", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
      ],
      explain:
        "`LOCATION_TASK = \"fitness-tracker-location\"`. TaskManager identifies a task by a plain string: the native side stores that string when `startLocationUpdatesAsync` runs, and when the OS later delivers a batch it looks up the JS callback registered under the same name. A typo in any one place fails silently, because nothing throws when a name has no callback.\n\nThat is why the name is a single exported constant used by `task.ts` (`defineTask`), `controller.ts` (start, stop, `hasStartedLocationUpdatesAsync`, recovery) and the options builder. It is also prefixed with the project slug so it cannot collide with the journal's or the podcast player's tasks in the same app.\n\nWhen you build this yourself you meet the pattern in the tutorial's Build order (M3) and the first entry under Failure modes: the task is the contract between the OS and your bundle, so name it once.",
    },
    {
      id: "fitness-tracker-02",
      type: "mcq",
      level: 1,
      topics: ["Background Tasks", "Expo Router", "Architecture"],
      files: ["src/app/_layout.tsx", "src/app/projects/fitness-tracker/_layout.tsx", "src/projects/fitness-tracker/tracking/task.ts"],
      prompt:
        "`tracking/task.ts` calls `TaskManager.defineTask` at module scope. Which import is what guarantees the task exists when iOS or Android relaunches the app **headless** to deliver locations?\n\nSearch: open `src/app/_layout.tsx` and the fitness `_layout.tsx` and compare what each imports.",
      choices: [
        "The `import { startPendingActionReplay } from \"@/src/projects/fitness-tracker/tracking/task\"` in the root `src/app/_layout.tsx`. Evaluating the module is what defines the task, whatever it imports by name",
        "An import of `task.ts` from `src/app/projects/fitness-tracker/_layout.tsx`, which loads the module as soon as the tracker is opened",
        "None. The `expo-location` config plugin in `app.config.ts` registers the task natively at build time",
        "None. TaskManager finds tasks by name on the native side, so JS never has to evaluate the module",
      ],
      answer: 0,
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" },
      ],
      explain:
        "A project layout only loads after the user opens that project from the launcher. A headless relaunch to deliver locations renders no screens, but it still evaluates the root layout module, so `src/app/_layout.tsx` imports every `TaskManager.defineTask` module. For fitness that import also brings in `startPendingActionReplay`, but the named import is incidental: the task exists because the module **evaluates**.\n\nImporting `task.ts` only from the fitness layout would work in every foreground test and then record nothing after the OS relaunches the app in the background. The native side stores only the task name; the JS callback must be defined again each time the bundle starts. The TaskManager docs state the same requirement: define it in the global scope, not inside a component.\n\nThis is one of the Architecture decisions in the tutorial: anything that must exist on a cold or headless launch is started from the root layout, and the project layout just builds its Stack.",
    },
    {
      id: "fitness-tracker-03",
      type: "mcq",
      level: 1,
      topics: ["Location & Sensors", "Performance"],
      files: ["src/projects/fitness-tracker/tracking/config.ts", "src/projects/fitness-tracker/models/Workout.ts"],
      prompt:
        "Look at `locationTaskOptions(mode, title)` in `tracking/config.ts`. What does the **battery-saver** (`\"saver\"`) mode actually change compared with `\"accurate\"`?\n\nSearch: read `locationTaskOptions` and compare both branches line by line against the table in the tutorial's Tracking pipeline & battery section.",
      choices: [
        "`Balanced` accuracy, 25 m / 10 s intervals, and deferred batches every 100 m or 60 s",
        "`BestForNavigation` accuracy, but only one fix per minute",
        "It switches from `startLocationUpdatesAsync` to significant-change monitoring",
        "The same OS settings, but the pipeline drops every other point before writing",
      ],
      answer: 0,
      links: [
        { title: "Expo Location", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
        { title: "Apple: CLActivityType", url: "https://developer.apple.com/documentation/corelocation/clactivitytype" },
      ],
      explain:
        "Saver mode returns `Balanced` accuracy, `distanceInterval: 25`, `timeInterval: 10_000`, `deferredUpdatesDistance: 100` and `deferredUpdatesInterval: 60_000`. Accurate mode uses `BestForNavigation` at 5 m / 1 s and no deferral. Deferred updates let the OS batch fixes and wake JS less often, which is where most of the saving comes from. Saver mode is not significant-change monitoring and does not thin points in JS.\n\nBoth modes share `activityType: Fitness`, `pausesUpdatesAutomatically: false` (iOS would otherwise pause exactly when auto-pause needs to see you start again) and a foreground service. Because a deferred batch can hold dozens of fixes, the pipeline is written to process a whole batch in one transaction.\n\nThe tutorial treats measuring both modes on the same 30-minute route as the deliverable of that section: the options are a tunable trade-off, not a fixed answer.",
    },
    {
      id: "fitness-tracker-04",
      type: "mcq",
      level: 1,
      topics: ["Location & Sensors", "Architecture"],
      files: ["src/projects/fitness-tracker/models/Workout.ts", "src/projects/fitness-tracker/tracking/state.ts", "src/projects/fitness-tracker/tracking/metrics.ts"],
      prompt:
        "Every `Point` carries a `segment` number. When does it change, and why does the code care?\n\nSearch: `grep -rn segment src/projects/fitness-tracker --include=*.ts` and list who reads it.",
      choices: [
        "It increments on every resume, so distance, moving time and the drawn route never bridge a pause",
        "It is the 1 km split index, used to build the splits table",
        "It increments on every batch the OS delivers, so batches can be replayed in order",
        "It marks GPS signal loss, so the map can draw a dashed line across the gap",
      ],
      answer: 0,
      explain:
        "`resumeSession` in `state.ts` returns `segment: session.segment + 1`. `totalDistance`, `movingTime`, `computeSplits`, `simplifyRoute`, `paceColoredSegments` and the GPX export all skip or split on a segment change. A pause followed by a 2 km bus ride must not count as distance, and a straight line must not be drawn across the gap.\n\n`processFix` also skips the implied-speed and jitter checks against a point from the previous segment and restarts the Kalman smoother, so the first fix after a resume is accepted on its own merits.\n\nIf you skip the segment counter, the bug shows up only on real routes with pauses: totals look plausible in a straight-line test. The tutorial introduces segments in Architecture (the two rules that make the background path trustworthy) and lists Pause bridged by distance under failure modes. The counter lives in the persisted session, so it survives a process kill.",
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
        "Screens import `health` from `\"../health/sync\"`. On an iPhone this is HealthKit, and on Android it's Health Connect. How does the right implementation get chosen?\n\nSearch: open all three `health/sync*.ts` files and check which library each imports at the top.",
      choices: [
        "Metro resolves `sync.ios.ts` / `sync.android.ts` ahead of `sync.ts` at bundle time, so each platform's bundle only contains its own health library",
        "`sync.ts` calls `Platform.select` at runtime and lazily `require`s the right file",
        "`useHeartRate` does a dynamic `import()` based on `Platform.OS`",
        "A config plugin strips the unused health library from the native project",
      ],
      answer: 0,
      links: [
        { title: "Platform extensions (Expo glossary)", url: "https://docs.expo.dev/more/glossary-of-terms/" },
        { title: "Platform specific code (React Native)", url: "https://reactnative.dev/docs/platform-specific-code" },
      ],
      explain:
        "Metro resolves `.ios.ts` / `.android.ts` before the plain `.ts` file, so `@kingstinct/react-native-healthkit` never enters the Android bundle and `react-native-health-connect` never enters the iOS one. `sync.ts` is only the web/unsupported fallback, and all three implement the same `HealthSync` interface from `types.ts`, so screens import one name and stay platform-agnostic.\n\nA runtime `Platform.select` or a dynamic `import()` would still bundle both libraries, and importing a native library on the wrong platform can fail at evaluation time. HealthKit and Health Connect are very different APIs (workout sample plus route builder versus session, distance and calories records), so a shared interface is the right seam.\n\nIn the tutorial, see M8 (Health sync & export) and the Architecture decisions: platform splits use file extensions.",
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
        "History rows show a small route preview. Why does `WorkoutRow` render `RouteThumbnail` (a Skia `Path`) instead of a small `MapView`?\n\nSearch: read `WorkoutRow.tsx`, `RouteThumbnail.tsx`, and where `thumbnailPath` is called in `controller.ts`.",
      choices: [
        "Every MapView row would start a native map and fetch tiles. The thumbnail draws a few normalised points computed once at finish (`thumbnailPath`)",
        "react-native-maps can't render inside a FlashList",
        "MapView can't draw a `Polyline` on Android without a paid API key",
        "Skia is needed because thumbnails come from a static-maps web API that returns vector paths",
      ],
      answer: 0,
      links: [
        { title: "React Native Skia: Path", url: "https://wcandillon.github.io/react-native-skia/v2/docs/shapes/path/" },
        { title: "FlashList", url: "https://shopify.github.io/flash-list/" },
        { title: "Expo MapView", url: "https://docs.expo.dev/versions/latest/sdk/map-view/" },
      ],
      explain:
        "Fifty history rows each hosting a live `MapView` would each start a native map and fetch tiles. Instead `stopWorkout` computes `thumbnailPath(points)` **once** at finish: a Douglas-Peucker-simplified route normalised into a 0..1 box, stored on the workout row. `RouteThumbnail` only scales those pairs into a Skia path, so scrolling a list costs a few path draws.\n\nThe design principle is to move expensive work from render time to write time. The same idea appears on the detail and active screens, where `douglasPeucker` runs before the polyline reaches the map, because pushing thousands of raw coordinates into a native polyline kills the frame rate (tutorial Failure modes: rendering raw polylines).\n\nBuild it in M4 (Maps & visualization): thumbnails for the list, a real map only for the detail and active screens.",
    },
    {
      id: "fitness-tracker-07",
      type: "mcq",
      level: 1,
      topics: ["Gesture Handler", "Reanimated", "Skia", "Accessibility"],
      files: ["src/projects/fitness-tracker/components/HoldButton.tsx", "src/app/projects/fitness-tracker/workout/active.tsx"],
      prompt:
        "The Stop control on the active screen is a `HoldButton` (default `holdMs = 1200`). What happens if the user presses it and lets go after about 600 ms?\n\nSearch: read `HoldButton.tsx` and trace which gesture callback runs `onComplete`.",
      choices: [
        "The ring animates back to 0 (`onFinalize`) and `onComplete` is never called",
        "`onComplete` fires on release, with a confirmation alert",
        "The workout is paused instead of stopped",
        "The ring stays half-filled, so the next press finishes faster",
      ],
      answer: 0,
      links: [
        { title: "Gesture Handler: long press", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/long-press-gesture/" },
      ],
      explain:
        "`Gesture.LongPress().minDuration(holdMs)` only activates (`onStart` then `runOnJS(finish)`) once the hold reaches the minimum duration. `onBegin` starts `withTiming(1)` on a shared value that drives the Skia path's `end`. `onFinalize` always runs and cancels the animation with a short reset. Releasing at 600 ms therefore just rewinds the ring and `onComplete` never fires.\n\nThis is the anti-mistap rule from the tutorial's UI design: Stop requires a long-press with a filling ring, never a plain tap, because the user has sweaty hands and is out of breath. `finish` is called through `runOnJS` because gesture callbacks run as worklets on the UI thread while the controller is plain JS.\n\nNote the component is dumb: it receives `onComplete`, colours and a label, and the active screen decides that completing means `stopWorkout()`.",
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
        "In `usePermissions`, what does `request(\"background\")` do when foreground location has **not** been granted yet?\n\nSearch: read `request` in `usePermissions.ts` and the comment above `PERMISSION_ORDER`.",
      choices: [
        "It skips the request and just refreshes. Background location can only be asked for after foreground is granted",
        "It asks for foreground first, then immediately asks for background",
        "It opens the system Settings app, because background location can't be requested in-app",
        "It throws, and `PermissionFlow` shows the error inline",
      ],
      answer: 0,
      links: [
        { title: "Expo Location", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
        { title: "Android: Request location permissions", url: "https://developer.android.com/develop/sensors-and-location/location/permissions" },
      ],
      explain:
        "The hook reads `getForegroundPermissionsAsync()` and only calls `requestBackgroundPermissionsAsync()` when `fg.granted`. The comment on `PERMISSION_ORDER` gives the reason: on Android, asking for background first means the prompt never appears, and on Android 11+ background location is a separate trip to Settings anyway.\n\nThe order (foreground, background, motion, notifications) is encoded once, and the permissions screen marks the background step `locked` until the previous one is granted. `PermissionFlow` just renders that flag, which keeps the component dumb and reusable.\n\nThe tutorial lists Permission ordering under failure modes and builds the flow in M2/M3. Also note `blocked` versus `denied`: after a permanent denial the only path is `Linking.openSettings()`, and the hook refreshes when the app returns to the foreground.",
    },
    {
      id: "fitness-tracker-09",
      type: "text",
      level: 1,
      topics: ["Config Plugins", "Background Tasks"],
      files: ["plugins/withWorkoutCapabilities.js"],
      prompt:
        "`withWorkoutInfoPlist` uses `addUnique(...)` to add the string `\"location\"` to one Info.plist array. Without it, iOS suspends location updates once the app is backgrounded.\n\nWhich Info.plist **key** is it?\n\nSearch: open `withWorkoutInfoPlist` in `plugins/withWorkoutCapabilities.js` and also check the `expo-location` entry in `app.config.ts`.",
      accept: ["UIBackgroundModes"],
      links: [
        { title: "Apple: UIBackgroundModes", url: "https://developer.apple.com/documentation/bundleresources/information-property-list/uibackgroundmodes" },
        { title: "Apple: Handling location updates in the background", url: "https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background" },
      ],
      explain:
        "`plist.UIBackgroundModes = addUnique(plist.UIBackgroundModes, \"location\")`. This Info.plist array is what lets iOS keep delivering location updates while the app is backgrounded, together with the Always permission.\n\n`addUnique` matters because prebuild without `--clean` starts from the existing plist, and other plugins (here `expo-location` with `isIosBackgroundLocationEnabled`) may already have added the same mode. A plugin must be idempotent, or running it twice duplicates entries.\n\nThis is the first mod you write in the tutorial's Native layer, Step 2, and it is checked by `configPlugin.test.ts` without generating an `ios/` folder. Forgetting the mode compiles fine and only shows up as a route that stops when the screen locks.",
    },
    {
      id: "fitness-tracker-10",
      type: "text",
      level: 1,
      topics: ["SQLite", "Background Tasks"],
      files: ["src/projects/fitness-tracker/db/schema.ts"],
      prompt:
        "`schema.ts` says one PRAGMA \"is not optional here\": the background task writes points while the UI reads them.\n\nWhich SQLite **journal mode** does it set?\n\nSearch: read the comment above `PRAGMAS` in `db/schema.ts`.",
      accept: ["WAL", "journal_mode = WAL", "journal_mode=WAL", /^(pragma\s+)?journal_mode\s*=\s*wal;?$/i, "write-ahead logging", "write-ahead log", "write ahead logging"],
      links: [
        { title: "SQLite: Write-Ahead Logging", url: "https://www.sqlite.org/wal.html" },
        { title: "SQLite: busy_timeout pragma", url: "https://www.sqlite.org/pragma.html#pragma_busy_timeout" },
      ],
      explain:
        "`PRAGMA journal_mode = WAL`. In the default rollback-journal mode, readers block the writer. If the UI is reading points when a task batch tries to commit, the write waits, and a blocked write inside a task callback is a lost point or a callback that outlives its time budget. WAL lets readers and one writer proceed concurrently.\n\n`busy_timeout = 3000` covers the remaining contention between two writers, and `synchronous = NORMAL` is the usual safe pairing with WAL. `foreign_keys = ON` makes the `ON DELETE CASCADE` on points and splits actually delete rows.\n\nThe tutorial points out in Library hints that WAL matters more here than in the journal project because a background context writes while the UI reads. Set the PRAGMAs in your migration helper, before `user_version` migrations run.",
    },
    {
      id: "fitness-tracker-11",
      type: "text",
      level: 1,
      topics: ["Config Plugins", "Platform Differences", "Background Tasks"],
      files: ["plugins/withWorkoutCapabilities.js"],
      prompt:
        "One entry in `ANDROID_PERMISSIONS` has this comment: starting a location foreground service without it **throws at runtime, not build time** on Android 14+.\n\nWhich permission is it? (Full name or the short constant.)\n\nSearch: read the `ANDROID_PERMISSIONS` array and the test that asserts permissions in `configPlugin.test.ts`.",
      accept: ["android.permission.FOREGROUND_SERVICE_LOCATION", "FOREGROUND_SERVICE_LOCATION"],
      links: [
        { title: "Android 14: foreground service types are required", url: "https://developer.android.com/about/versions/14/changes/fgs-types-required" },
        { title: "Android: Foreground service types", url: "https://developer.android.com/develop/background-work/services/fgs/service-types" },
      ],
      explain:
        "`android.permission.FOREGROUND_SERVICE_LOCATION`. Since Android 14 each foreground service type needs its own permission on top of `FOREGROUND_SERVICE` and a declared `foregroundServiceType=\"location\"`. A missing one compiles and installs fine and only throws when `startLocationUpdatesAsync` starts the service, which is the worst time to find out.\n\nThe manifest entries come from two places: the `expo-location` plugin declares the service and its type (`isAndroidForegroundServiceEnabled`), and the hand-written plugin adds the permission list. `configPlugin.test.ts` asserts the list in memory, so the regression is caught without a device.\n\nThe tutorial covers this in the native-layer mod table and under Missing foreground service type in failure modes. Treat every Android permission as something your plugin test should pin.",
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
        "Read the three files in `sensors/` and how `active.tsx` / `useTodaySteps` use them. Select all that apply.\n\nSearch: read each file in `sensors/` and then grep where its exports are used (`grep -rn watchMovement\\|getTodaySteps\\|watchRelativeAltitude src`).",
      choices: [
        "Historical step counts (`Pedometer.getStepCountAsync`) are only used on iOS. On Android the Today ring counts only from when watching began",
        "Motion auto-pause decides \"moving\" from the variance of user acceleration magnitude over about a 2 s window",
        "DeviceMotion samples keep reaching JS while the phone is locked, so the background task can use them for auto-pause",
        "On iOS the barometer gives `relativeAltitude` directly. Otherwise it's derived from pressure, relative to the first reading",
        "The barometer delta replaces GPS altitude in `elevation_gain_m`",
      ],
      answer: [0, 1, 3],
      links: [
        { title: "Expo Pedometer", url: "https://docs.expo.dev/versions/latest/sdk/pedometer/" },
        { title: "Expo Barometer", url: "https://docs.expo.dev/versions/latest/sdk/barometer/" },
        { title: "Expo DeviceMotion", url: "https://docs.expo.dev/versions/latest/sdk/devicemotion/" },
      ],
      explain:
        "`getStepsBetween` returns `null` unless `Platform.OS === \"ios\"` because `Pedometer.getStepCountAsync` is iOS-only, so `useTodaySteps` shows base 0 plus the live delta on Android. `watchMovement` keeps a window of about two seconds of user-acceleration magnitudes and compares the variance to `MOVING_VARIANCE = 0.25`. Barometer `relativeAltitude` comes straight from the OS on iOS; on Android the code derives it from pressure against the first reading.\n\nSensors are **foreground only**: they are not delivered to JS while suspended, which is why background auto-pause uses GPS speed in `pipeline.ts`. The barometer delta is shown on the active screen only; stored elevation still comes from GPS altitude with hysteresis.\n\nLesson for your build: read each sensor's platform notes before designing a feature around it. See M5 (Sensors) in the tutorial.",
    },

    // ------------------------------------------------------------ Level 2
    {
      id: "fitness-tracker-13",
      type: "explain",
      level: 2,
      topics: ["Background Tasks", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/task.ts", "src/app/_layout.tsx"],
      prompt:
        "Explain why `tracking/task.ts` defines the location task at **module scope**, behind `TaskManager.isTaskDefined`, instead of in a `useEffect` on the active workout screen. What does the bug look like if you get this wrong? Also: why is `ingest(fixes)` awaited inside the task callback?\n\nSearch: read the header comment of `task.ts`, the root `_layout.tsx`, and the first item under Failure modes in the tutorial.",
      model:
        "The OS can relaunch the app headless, with no UI, to deliver a location batch. The only JS that runs then is what evaluates when the bundle loads, which is why the root layout imports `task.ts`. A task defined inside a component works perfectly in the foreground, because the screen is mounted. In the background it silently records nothing: the native side knows the task name, but no callback is registered. The `isTaskDefined` guard makes the module safe to evaluate more than once (fast refresh re-runs it). `ingest` is awaited because the OS may suspend the process as soon as the callback's promise settles, so the SQLite write has to finish first. The Live Activity action listener is registered at module scope for the same reason: lock-screen buttons must work with no screen mounted.",
      rubric: [
        "Headless relaunch: only module-evaluation code runs, and no React tree exists",
        "Imported from the root _layout.tsx, because project layouts don't load on a cold background launch",
        "Failure mode: works in the foreground, silently records nothing in the background",
        "isTaskDefined guard against double definition",
        "Awaiting ingest keeps the process alive until the write commits",
      ],
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" },
        { title: "Apple: Handling location updates in the background", url: "https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background" },
      ],
      explain:
        "See the header comment in `task.ts`. The OS can relaunch the app headless, with no UI, to deliver a location batch; the only JS that runs is what evaluates when the bundle loads. A task defined in a component works in the foreground and silently records nothing in the background. This is the single most common background-location bug, and it is invisible in foreground testing.\n\nThe design consequences you should be able to name: the module is imported from the root layout (project layouts do not load on a cold background launch), `isTaskDefined` makes re-evaluation safe, and the callback awaits `ingest` because the OS may suspend the process as soon as the promise settles.\n\nIn the tutorial this is the first failure mode and the first Architecture decision. Reproduce it deliberately once: move `defineTask` into a `useEffect` and watch a locked-screen walk record nothing.",
    },
    {
      id: "fitness-tracker-14",
      type: "explain",
      level: 2,
      topics: ["SQLite", "Background Tasks", "Architecture"],
      files: ["src/projects/fitness-tracker/db/client.ts", "src/projects/fitness-tracker/hooks/useLiveQuery.ts"],
      prompt:
        "The journal and camera projects use `<SQLiteProvider>`. The fitness tracker instead uses a lazy module-scope `getDb()` that caches a promise. Explain why, covering: who else needs the DB, `enableChangeListener`, and what the `.catch(() => { dbPromise = null; ... })` is for.\n\nSearch: read `db/client.ts` and compare with how the journal project opens its database (`grep -rn SQLiteProvider src`).",
      model:
        "The background task writes points with no React tree mounted, so it can't get a connection from a provider. It needs a plain module function. `getDb()` caches the promise, so concurrent callers share one open-and-migrate instead of racing two. The UI and the task must also share the same connection, because `addDatabaseChangeListener` only fires for writes made on the connection where `enableChangeListener` was turned on. That's what lets `useLiveQuery` react to background writes. If opening or migrating fails, the cached rejected promise would poison every later call, so the catch clears it and the next call retries.",
      rubric: [
        "The background task has no React tree, so a provider/context isn't available",
        "One cached promise means one open and one migrate, even with concurrent callers",
        "The change listener only sees writes on the same connection where it was enabled, so the UI and task share it",
        "Resetting dbPromise on failure allows a retry instead of a permanently rejected promise",
      ],
      links: [
        { title: "Expo SQLite", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
      ],
      explain:
        "The comment in `db/client.ts` names both reasons. The background task writes points with no React tree mounted, so it cannot get a connection from a provider; it needs a plain module function. And `addDatabaseChangeListener` only fires for writes made on the connection where `enableChangeListener` was set, so the UI and the task must share one connection for `useLiveQuery` to react to background writes.\n\n`getDb()` caches the promise, so concurrent callers share one open-and-migrate instead of racing two. If opening or migrating fails, a cached rejected promise would poison every later call, so the catch clears it and the next call retries.\n\nThe tutorial lists this under Architecture decisions (SQLite without a provider). Podcast downloads use the same pattern for the same reason. When you design your own background feature, ask first: who writes, and is a React tree mounted when they do?",
    },
    {
      id: "fitness-tracker-15",
      type: "order",
      level: 2,
      topics: ["Location & Sensors", "Testing"],
      files: ["src/projects/fitness-tracker/tracking/filters.ts", "src/projects/fitness-tracker/__tests__/filters.test.ts"],
      prompt:
        "Put the stages of `processFix(state, fix, options)` in the order the code runs them. Any rejection returns early.\n\nSearch: read `processFix` top to bottom and cross-check each stage against a test name in `filters.test.ts`.",
      items: [
        "`isValidFix`: reject non-finite or out-of-range coordinates, and (0, 0) \"null island\"",
        "Accuracy gate: reject if `fix.accuracy` > 25 m",
        "Stale gate: reject if the timestamp is not after the last accepted point's `t`",
        "Implied-speed gate (same segment only): reject if distance / time > `MAX_SPEED_MPS[activity]`",
        "`kalmanStep` smooths lat/lng, using the fix's accuracy as measurement noise",
        "Jitter gate: reject if the smoothed point is < 5 m from the last accepted point",
      ],
      links: [
        { title: "Expo Location", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
      ],
      explain:
        "That is the order in the code and in the tutorial's point-processing list. Cheap validity and accuracy gates run first. The stale check precedes the speed check (next question). Smoothing only runs on fixes that passed the outlier gates, so a GPS jump never drags the estimate. The jitter gate runs last, on the smoothed point, so standing still produces no new points.\n\nEach stage is a pure function of `(state, fix)` and has its own case in `filters.test.ts`, which is how you verify tracking correctness without going outside for every change. Persisting `FilterState` in the session row is what lets the same pipeline continue across background invocations.\n\nBuild it in M2 against a recorded GPX, before the background task exists.",
    },
    {
      id: "fitness-tracker-16",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors"],
      files: ["src/projects/fitness-tracker/tracking/filters.ts"],
      prompt:
        "In `processFix`, the stale check (`fix.timestamp <= last.t`) runs **before** the implied-speed check. What would go wrong if you swapped them?\n\nSearch: write the failing input by hand (same position, equal timestamps) and trace it through the snippet, then check the stale test in `filters.test.ts`.",
      code: "const dt = (fix.timestamp - last.t) / 1000;\nconst d = haversine(last, { lat: fix.latitude, lng: fix.longitude });\nif (d / dt > MAX_SPEED_MPS[options.activity]) return reject(\"speed\");",
      choices: [
        "`dt` could be 0 or negative, giving Infinity, NaN or a negative speed. Duplicate or out-of-order fixes could then pass the speed gate (NaN or negative compares false) or be rejected for the wrong reason",
        "Nothing. Both checks are pure, so their order can't change the result",
        "`haversine` is expensive, so the cheap timestamp comparison should run first. It's only a performance concern",
        "The Kalman state would be advanced twice for the same fix",
      ],
      answer: 0,
      explain:
        "The speed gate divides by `dt`. With `dt = 0` and an identical position, `0 / 0` is `NaN`, and `NaN > max` is `false`, so the duplicate would pass. A negative `dt` gives a negative speed, which also passes. Only `d > 0` with `dt = 0` gets caught, and it is mislabelled as a speed outlier. Checking stale first guarantees `dt > 0` before any division.\n\nPure functions can still have order-dependent correctness. Batches from the OS can contain duplicates and out-of-order fixes (the pipeline also sorts each batch by timestamp), so this is not a theoretical case.\n\nThe tutorial's pipeline list carries the note: after the stale check, so the speed division always has dt > 0. When you write gates, ask what each one assumes about the data the previous gate already guaranteed.",
    },
    {
      id: "fitness-tracker-17",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors", "Testing"],
      files: ["src/projects/fitness-tracker/tracking/filters.ts", "src/projects/fitness-tracker/__tests__/filters.test.ts"],
      prompt:
        "On a jitter rejection, `processFix` returns `reject(\"jitter\", { last, kalman })`. It keeps the **old** `last` but stores the **new** Kalman state. Why not move `last` forward too?\n\nSearch: read the `reject(\"jitter\", ...)` line and the test that feeds 300 noisy stationary fixes.",
      choices: [
        "The 5 m check is always against the last accepted point, so a slow drift of many sub-5 m steps can't add up to fake distance. The smoother still stays warm",
        "Moving `last` would make the next fix fail the stale check",
        "The jitter point is buffered and written with the next accepted point",
        "`last` is immutable, because `FilterState` is persisted as JSON",
      ],
      answer: 0,
      explain:
        "The 5 m check is always against the last accepted point. If `last` advanced on every jittery fix, each fix would be within 5 m of the previous one and the anchor would creep: some later fix would eventually be more than 5 m from an anchor that had already drifted, recording distance while standing still. Keeping the anchor fixed means a real net 5 m of movement is required.\n\nUpdating `kalman` keeps the variance and timestamp current, so the next real movement is not over-smoothed. The test stops standing-still drift from accumulating distance feeds 300 noisy stationary fixes and expects fewer than 10 accepted points.\n\nThis is the filter-level fix for the tutorial's failure mode GPS drift while stationary: stand still for five minutes without it and you record 200 m. Separate what you smooth (always) from what you commit (only on real movement).",
    },
    {
      id: "fitness-tracker-18",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors", "Testing"],
      files: ["src/projects/fitness-tracker/tracking/metrics.ts", "src/projects/fitness-tracker/__tests__/metrics.test.ts"],
      prompt:
        "`elevationChange` uses `ELEVATION_HYSTERESIS_M = 3`. What does it return for these GPS altitudes?\n\nSearch: read `elevationChange` and the hysteresis test, then step through the array by hand before choosing.",
      code: "elevationChange([100, 102, 101, 103, 106, 104])",
      choices: ["gain 6 m, loss 0 m", "gain 7 m, loss 3 m", "gain 3 m, loss 0 m", "gain 6 m, loss 2 m"],
      answer: 0,
      explain:
        "The reference starts at 100. 102 and 101 are within the 3 m threshold, so nothing changes. 103 is +3 from the reference: gain 3, and the reference moves to 103. 106 is +3: gain 3 more. 104 is -2, below the threshold. Total: gain 6, loss 0. Summing raw deltas would give 7 up and 3 down, which is exactly the noise hysteresis removes (a flat 10 km run would otherwise \"climb\" hundreds of metres).\n\n`stepElevation` is the incremental version used by the live pipeline, with the reference stored in the persisted session as `elevationRef`, and a test checks it agrees with the batch version. Having both is the point: the live path must be resumable across process kills, the batch path recomputes on finish.\n\nSee M5 in the tutorial for why barometer elevation is shown next to GPS elevation.",
    },
    {
      id: "fitness-tracker-19",
      type: "mcq",
      level: 2,
      topics: ["Background Tasks", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/queue.ts", "src/projects/fitness-tracker/tracking/controller.ts", "src/projects/fitness-tracker/tracking/pipeline.ts"],
      prompt:
        "Every session read-modify-write goes through `enqueue` in `tracking/queue.ts`: task batches, UI pause/resume, notification actions, motion auto-pause and the crash-recovery checks (`findRecoverable`, `reattach`). What does this implementation guarantee?\n\nSearch: `grep -rn enqueue src/projects/fitness-tracker` and list every caller; then read the code snippet slowly.",
      code: "let chain: Promise<unknown> = Promise.resolve();\n\nexport function enqueue<T>(job: () => Promise<T>): Promise<T> {\n  const run = chain.then(job, job);\n  chain = run.catch(() => undefined);\n  return run;\n}",
      choices: [
        "Jobs run strictly one at a time. A failed job doesn't stall later jobs, but its own caller still sees the rejection",
        "Jobs run in parallel, but results come back in submission order",
        "A failed job is retried once before the next job starts",
        "If one job fails, every job queued behind it is cancelled",
      ],
      answer: 0,
      explain:
        "`chain.then(job, job)` starts the job after the previous one settles, whether it succeeded or failed. `chain = run.catch(() => undefined)` keeps the chain itself from ever rejecting, while the returned `run` still rejects for its caller. That is a mutex built from a promise chain, and it is enough because JS is single-threaded.\n\nThe reason it exists: a GPS batch, a lock-screen pause, a motion auto-pause and crash recovery all read-modify-write the same session row. Interleaved, a pause would be silently overwritten or a batch double-counted. Recovery is queued too, otherwise it could delete the workout row of a start that is between `insertWorkout` and `saveSession`.\n\nIn the tutorial see Architecture (the two rules) and Racing session writers under failure modes. You will not see this bug in manual testing; it needs two actors at once.",
    },
    {
      id: "fitness-tracker-20",
      type: "mcq",
      level: 2,
      topics: ["Location & Sensors", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/autoPause.ts", "src/projects/fitness-tracker/hooks/useMotionAutoPause.ts"],
      prompt:
        "`DEFAULT_AUTO_PAUSE` pauses after 8 s of stillness but resumes after only 3 s of movement. Why the asymmetry?\n\nSearch: read the header of `autoPause.ts` and where `stepAutoPause` is called (`pipeline.ts`, `useMotionAutoPause.ts`).",
      choices: [
        "Pausing late costs little (a few seconds of standing time), while resuming late throws away real distance the user is covering",
        "GPS reports stops faster than starts, so the timings cancel each other out",
        "iOS requires auto-pause to resume within 3 s or it ends the background session",
        "A shorter resume window saves battery, because fewer stationary fixes are processed",
      ],
      answer: 0,
      explain:
        "The header of `autoPause.ts` says it: pausing late is cheap, resuming late loses real distance. While auto-paused the pipeline drops fixes (`session.status !== \"active\"`), so every extra second before resuming is distance gone for good. Hence 8 s to pause and 3 s to resume. A moving sample also resets the still timer, so one blip never pauses and one still sample never resumes.\n\n`stepAutoPause` is a pure state machine fed by two sources: GPS speed in the pipeline (works in the background) and DeviceMotion variance in `useMotionAutoPause` (faster, foreground only). Pure means the thresholds are unit-tested with plain timestamps.\n\nThe tutorial's M5 checkpoint sets targets (pause within 10 s, resume within 5 s) and tells you to tune: asymmetric thresholds are the first tuning step.",
    },
    {
      id: "fitness-tracker-21",
      type: "mcq",
      level: 2,
      topics: ["Performance", "Location & Sensors"],
      files: ["src/projects/fitness-tracker/utils/paceColor.ts", "src/projects/fitness-tracker/components/map/RouteMap.tsx", "src/app/projects/fitness-tracker/workout/active.tsx"],
      prompt:
        "The active screen passes `paceColoredSegments(douglasPeucker(points, 3))` to `RouteMap`. Apart from simplifying, how does `paceColoredSegments` keep the native map fast?\n\nSearch: read `utils/paceColor.ts` and `RouteMap.tsx` to see what a `<Polyline>` receives.",
      choices: [
        "It merges consecutive legs in the same pace bucket into one `<Polyline>`, so the map gets tens of native views instead of one per leg. It also breaks the line at segment boundaries",
        "It draws the route on a Skia canvas laid over the map instead of using `Polyline`",
        "It keeps only the last 300 points, so long workouts show a sliding window",
        "It builds one `Polyline` with a per-vertex colour array, so there's always exactly one native view",
      ],
      answer: 0,
      links: [
        { title: "Expo MapView", url: "https://docs.expo.dev/versions/latest/sdk/map-view/" },
      ],
      explain:
        "The function comment explains that one `<Polyline>` per leg would put thousands of native views on the map. Grouping consecutive legs by colour bucket brings that down to tens. The buckets are relative to this workout's own 10th-90th percentile pace, so a walk and a sprint both use the full palette. A cross-segment leg yields `NaN` pace, bucket -1, which ends the current line, so a pause is never drawn as a straight jump.\n\nThe pattern is layered reduction: `douglasPeucker` reduces points, `paceColoredSegments` reduces polylines, and the thumbnail reduces further for lists. Each layer protects a different bottleneck (JS memory, native view count, per-row work).\n\nThe tutorial's M4 checkpoint (a 3-hour hike with about 12k points renders in under a second) is the test of whether you did this.",
    },
    {
      id: "fitness-tracker-22",
      type: "order",
      level: 2,
      topics: ["Background Tasks", "SQLite", "Location & Sensors"],
      files: ["src/projects/fitness-tracker/tracking/task.ts", "src/projects/fitness-tracker/tracking/pipeline.ts", "src/projects/fitness-tracker/tracking/queue.ts"],
      prompt:
        "A deferred batch of 30 locations arrives while the phone is locked. Put what happens in order.\n\nSearch: follow the call chain starting at `defineTask` in `task.ts` through `ingest` in `pipeline.ts`.",
      items: [
        "The OS calls the callback registered with `TaskManager.defineTask(LOCATION_TASK)` with `data.locations`",
        "The task maps each `LocationObject` to a `RawFix` and awaits `ingest(fixes)`",
        "`ingest` puts `ingestNow` on the single promise chain in `queue.ts`",
        "`ingestNow` loads the session row from SQLite and returns early if there's none or it's manually paused",
        "Fixes are sorted by timestamp, and each one goes through auto-pause stepping and then `processFix`",
        "One `withTransactionAsync` writes the points, the rolling totals (`addRolling`) and the updated session, then `liveActivity.update` runs",
      ],
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" },
      ],
      explain:
        "That is the path through `task.ts`, `queue.ts` and `pipeline.ts`. The session is re-read from SQLite on every batch because the runtime may have been killed since the last one. Fixes are sorted because deferred batches can arrive out of order. Everything is committed in **one** `withTransactionAsync`, so points, rolling totals and the session can never disagree after a kill, and it is one commit instead of thirty.\n\nThe Live Activity update happens after the commit and is throttled to about 1 Hz, so the lock screen never shows data that is not yet durable. The callback awaits the whole chain because the OS may suspend the process once the promise settles.\n\nThis is the tutorial's central rule: persist every point immediately and let the UI read the database, not memory (Architecture, the warning box).",
    },
    {
      id: "fitness-tracker-23",
      type: "order",
      level: 2,
      topics: ["Background Tasks", "Location & Sensors", "SQLite"],
      files: ["src/projects/fitness-tracker/tracking/controller.ts"],
      prompt:
        "Put the steps of `startWorkout(options)` in `controller.ts` in order.\n\nSearch: read `startWorkout` in `controller.ts` and note why each step sits where it does.",
      items: [
        "If a session row already exists, re-arm tracking for it and return its workout id",
        "Throw unless foreground location permission is granted",
        "Read background permission (it decides `session.background`) plus battery level / low-power mode",
        "`insertWorkout` with status `'active'`",
        "`saveSession`, so the very first task invocation finds a session",
        "`ensureTracking` (`startLocationUpdatesAsync` or the `watchPositionAsync` fallback), then `liveActivity.start`",
      ],
      links: [
        { title: "Expo Location", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
      ],
      explain:
        "The early return makes start **idempotent**: a double tap, a notification action racing a UI tap, or a start after a kill converges on the existing workout. The session is saved before updates start, because the first batch can arrive immediately and `ingestNow` drops fixes when there is no session. Without background permission `session.background` is false and `ensureTracking` falls back to a foreground `watchPositionAsync`; the active screen then shows a keep-the-app-open banner.\n\nReading battery level and low-power mode at start (and battery at the end) stores what you need to compare tracking modes later, which is the measurement deliverable in the tutorial.\n\nSee M3 (Background tracking) for the order of operations and `controller.test.ts` for the race it protects against.",
    },
    {
      id: "fitness-tracker-24",
      type: "text",
      level: 2,
      topics: ["Native Modules", "Testing"],
      files: ["modules/live-activity/src/LiveActivityModule.ts", "modules/live-activity/index.ts"],
      prompt:
        "The JS side of the local module gets the native module with a function from `expo` that returns `null` (instead of throwing at import time) in Expo Go, on web and in Jest. That's what lets every wrapper function in `index.ts` degrade to a no-op.\n\nWhich function is it?\n\nSearch: open `modules/live-activity/src/LiveActivityModule.ts` and `index.ts`; compare with `requireNativeModule` in the Expo docs.",
      accept: ["requireOptionalNativeModule", /^requireOptionalNativeModule\s*(<[^>]>)?\s(\(.*\))?$/i],
      links: [
        { title: "requireOptionalNativeModule (expo)", url: "https://docs.expo.dev/versions/latest/sdk/expo/" },
      ],
      explain:
        "`requireOptionalNativeModule<LiveActivityNativeModule>(\"LiveActivity\")`. `requireNativeModule` throws as soon as the module is imported anywhere a development build is not running: Expo Go, web, and Jest tests that indirectly import the pipeline. With the optional variant `index.ts` can write `LiveActivityModule?.update(state)`, and `isAvailable()` simply returns `false`.\n\nThat makes the native module an enhancement rather than a hard dependency: tracking, SQLite and the UI keep working, and the permissions screen can explain that Live Activities need a development build. It also keeps the pipeline unit-testable.\n\nThe tutorial states the rule in Native layer, Step 3: load the module optionally so every wrapper degrades to a no-op.",
    },
    {
      id: "fitness-tracker-25",
      type: "text",
      level: 2,
      topics: ["SQLite", "React Hooks"],
      files: ["src/projects/fitness-tracker/hooks/useLiveQuery.ts", "src/projects/fitness-tracker/hooks/useLivePoints.ts", "src/projects/fitness-tracker/db/client.ts"],
      prompt:
        "`useLiveQuery` and `useLivePoints` re-read SQLite whenever a table changes, with no polling and no TanStack Query. Which `expo-sqlite` **function** do they subscribe with?\n\nSearch: `grep -rn addDatabaseChangeListener src` and read the debounce in each hook.",
      accept: ["addDatabaseChangeListener", /^addDatabaseChangeListener\s*(\(.*\))?$/i],
      links: [
        { title: "Expo SQLite", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
      ],
      explain:
        "`addDatabaseChangeListener(({ tableName }) => ...)`. It only receives events for connections opened with `enableChangeListener: true`, which `getDb()` sets. Because the background task writes through that same connection, the UI updates live from background writes without polling and without a cache layer. Both hooks debounce the callback (100 ms and 150 ms) because a batch insert fires one event per row.\n\nThis is the design that lets \"the UI reads the database, never task memory\" be true in practice: the database is the bus between a headless task and mounted screens. TanStack Query is deliberately not used for this local data; change events replace invalidation.\n\nSee Architecture decisions in the tutorial, and M4's bullet about live updates.",
    },
    {
      id: "fitness-tracker-26",
      type: "text",
      level: 2,
      topics: ["Config Plugins", "Testing"],
      files: ["src/projects/fitness-tracker/__tests__/configPlugin.test.ts"],
      prompt:
        "`configPlugin.test.ts` runs the plugin's mods in memory with `introspect: true`. No `ios/` or `android/` folder gets written. Which function from `expo/config-plugins` does it call?\n\nSearch: open `configPlugin.test.ts` and find the call that makes the mods run without writing files.",
      accept: ["compileModsAsync", /^compileModsAsync\s*(\(.*\))?$/i],
      links: [
        { title: "Debugging config plugins", url: "https://docs.expo.dev/config-plugins/development-and-debugging/" },
        { title: "Create and use config plugins", url: "https://docs.expo.dev/config-plugins/plugins/" },
      ],
      explain:
        "`compileModsAsync(config, { projectRoot, introspect: true, platforms: [\"ios\", \"android\"] })`. Introspection is what `npx expo config --type introspect` does: plist, entitlements and manifest mods run against Expo's templates and write their results back into the config, so the test asserts on `config.ios.infoPlist` and `_internal.modResults.android.manifest`. Dangerous mods (file copies) are skipped.\n\nThe test uses a fresh temp `projectRoot` so a leftover prebuilt `ios/` cannot leak the real app's entitlements into the assertions, and runs under `@jest-environment node`. Without in-memory tests the only feedback loop for a plugin is a multi-minute prebuild.\n\nThe tutorial dedicates a subsection to Testing the plugin in memory; the verification table lists what each case pins.",
    },
    {
      id: "fitness-tracker-27",
      type: "multi",
      level: 2,
      topics: ["SQLite", "React Hooks", "Expo Router", "Performance"],
      files: ["src/projects/fitness-tracker/hooks/useLiveQuery.ts", "src/projects/fitness-tracker/hooks/useWorkouts.ts"],
      prompt:
        "About `useLiveQuery` (used by `useWorkouts`, `useSession`, `useStats`, …). Select all that apply.\n\nSearch: read `useLiveQuery.ts` fully and then three callers in `useWorkouts.ts`.",
      choices: [
        "It re-runs `select` when a watched table changes, including after writes from the background location task",
        "It debounces change events by 100 ms, because a batch insert fires one event per row",
        "It stops listening while the screen is unfocused (`useIsFocused`) and reloads on refocus",
        "It caches results in the app-wide TanStack Query client under a `[\"fitness\", …]` key",
        "It polls the database once per second while a workout is active",
        "`select` must be referentially stable (module-level, or memoised by the React Compiler), otherwise the effect re-subscribes on every render",
      ],
      answer: [0, 1, 2, 5],
      links: [
        { title: "Expo SQLite", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
        { title: "React: useEffect", url: "https://react.dev/reference/react/useEffect" },
      ],
      explain:
        "The effect depends on `[select, watched, focused]`, which is why `select` must be referentially stable: module-level selectors such as `selectSession`, or inline closures the React Compiler memoises on their captured values. An unstable `select` re-subscribes on every render.\n\nThe focus gate exists because every fix batch writes `workouts`. Without it the Today, History and Stats tabs stacked under the active screen would re-run heavy queries about once a second while a workout is recording. The 100 ms debounce coalesces the one-event-per-row burst of a batch insert. There is no polling and no TanStack Query cache here: SQLite is the source of truth and change events replace invalidation.\n\nIn the tutorial see the milestone M4 live-update bullet and Architecture decisions.",
    },
    {
      id: "fitness-tracker-28",
      type: "multi",
      level: 2,
      topics: ["Config Plugins", "Expo Config & EAS"],
      files: ["plugins/withWorkoutCapabilities.js", "plugins/workout-widget/Info.plist"],
      prompt:
        "What does `withWorkoutCapabilities` do on the **iOS** side? Select all that apply.\n\nSearch: read the iOS functions in `withWorkoutCapabilities.js` and the matching `it(...)` cases in `configPlugin.test.ts`.",
      choices: [
        "Adds `\"location\"` to `UIBackgroundModes` without duplicating it",
        "Sets `NSSupportsLiveActivities = true`",
        "Sets `NSSupportsLiveActivitiesFrequentUpdates = true` so the activity can update at 1 Hz",
        "Adds the App Group to `com.apple.security.application-groups` and sets `com.apple.developer.healthkit`",
        "Copies the widget Swift sources into `ios/WorkoutWidget` with `withDangerousMod`, and registers an `app_extension` target with `withXcodeProject`",
        "Edits files in a committed `ios/` folder, which prebuild then keeps",
      ],
      answer: [0, 1, 3, 4],
      links: [
        { title: "Apple: NSSupportsLiveActivitiesFrequentUpdates", url: "https://developer.apple.com/documentation/bundleresources/information-property-list/nssupportsliveactivitiesfrequentupdates" },
        { title: "Apple: App Groups entitlement", url: "https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.application-groups" },
        { title: "Create and use config plugins", url: "https://docs.expo.dev/config-plugins/plugins/" },
      ],
      explain:
        "`NSSupportsLiveActivitiesFrequentUpdates` is set to **false**: updates are local, about 1 Hz and throttled in JS, so no push-token budget is needed. The plugin adds `location` to `UIBackgroundModes` without duplicates, sets `NSSupportsLiveActivities`, adds the App Group and the HealthKit entitlement, copies the widget sources with `withDangerousMod`, and registers the `WorkoutWidget` app-extension target with `withXcodeProject` (skipped if `pbxTargetByName` already finds it).\n\nThe plugin never edits a committed `ios/` folder: `/ios` is gitignored build output, and every native change must be reproducible from mods. That constraint is the whole reason the plugin exists.\n\nThe tutorial's Native layer Step 2 gives the mod table and the plugin shape. Write the mods one at a time and add a test per mod.",
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
        "Compare the Swift and Kotlin `LiveActivityModule` definitions (Expo Modules API). Select all that apply.\n\nSearch: open both `LiveActivityModule` files plus `expo-module.config.json`, then check the Expo Modules API reference for `Function` versus `AsyncFunction`.",
      choices: [
        "Both declare `Name(\"LiveActivity\")`, and that's the string the JS side passes to `requireOptionalNativeModule`",
        "`Events(\"onAction\")` declares the event JS subscribes to with `addListener(\"onAction\", …)`",
        "`Function(\"consumePendingAction\")` returns synchronously to JS, while `AsyncFunction(\"start\")` returns a Promise",
        "`AttributesRecord` / `StateRecord` with `@Field` turn the plain JS objects into typed native values",
        "The module only gets autolinked because it's listed in the `plugins` array of `app.config.ts`",
        "The Kotlin side implements Live Activities by back-porting ActivityKit to Android",
      ],
      answer: [0, 1, 2, 3],
      links: [
        { title: "Expo Modules API reference", url: "https://docs.expo.dev/modules/module-api/" },
        { title: "expo-module.config.json", url: "https://docs.expo.dev/modules/module-config/" },
        { title: "Expo autolinking and local modules", url: "https://docs.expo.dev/modules/autolinking/" },
      ],
      explain:
        "Autolinking finds local modules in `modules/` through `expo-module.config.json`, which lists `LiveActivityModule` for Apple and `expo.modules.liveactivity.LiveActivityModule` for Android. No `plugins` entry is involved. Both classes declare `Name(\"LiveActivity\")`, the string the JS side passes to `requireOptionalNativeModule`; the class names are irrelevant to JS. `Events(\"onAction\")` declares what `addListener` can subscribe to, `Function` returns synchronously, `AsyncFunction` returns a Promise, and `Record` types with `@Field` convert plain JS objects to typed native values.\n\nAndroid has no Live Activities: the Kotlin module shows an ongoing `NotificationCompat` notification with action buttons. JS sees one interface; the asymmetry stays on the native side.\n\nThe tutorial's Native layer Step 3 table lays out the concepts side by side.",
    },
    {
      id: "fitness-tracker-30",
      type: "explain",
      level: 2,
      topics: ["SQLite", "Location & Sensors", "Architecture"],
      files: ["src/projects/fitness-tracker/tracking/controller.ts", "src/projects/fitness-tracker/db/queries/workouts.ts", "src/projects/fitness-tracker/tracking/metrics.ts"],
      prompt:
        "During a workout, the pipeline keeps `distance_m`, `moving_ms` and the elevation columns up to date with `addRolling`. Yet `stopWorkout` overwrites them with values recomputed by `summarize(points)`. Explain both halves: why `addRolling` uses SQL increments (`distance_m = distance_m + ?` with `RETURNING *`), and why the finish recomputes from points.\n\nSearch: read `addRolling` in `db/queries/workouts.ts` and `stopWorkout` in `controller.ts`.",
      model:
        "The rolling values exist only so the live UI and Live Activity can show totals without re-reading thousands of points. `addRolling` increments in SQL, so concurrent or out-of-order batches can't lose an update through read-modify-write. `RETURNING *` hands back the new row without a second query. Points are the source of truth, though: the finish runs the same pure functions the tests verify against the GPX fixture, and the comment says the rolling values are for display only. `summarize` also produces what rolling totals can't, such as km splits with interpolated boundaries, max speed, the Douglas–Peucker thumbnail, and calories from the final moving time. So any drift in the incremental path never reaches history.",
      rubric: [
        "Rolling totals are for live display only. Points are the source of truth",
        "SQL increments avoid lost updates from read-modify-write, and RETURNING saves a re-read",
        "summarize(points) is the pure, tested path (GPX fixture)",
        "Finish also derives splits, thumbnail and calories, which only make sense over the full track",
      ],
      links: [
        { title: "Expo SQLite", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
        { title: "SQLite: RETURNING", url: "https://www.sqlite.org/lang_returning.html" },
      ],
      explain:
        "The rolling values exist only so the live UI and Live Activity can show totals without re-reading thousands of points. `addRolling` increments in SQL (`distance_m = distance_m + ?`), so batches cannot lose an update through a read-modify-write race, and `RETURNING *` hands back the new row without a second query.\n\nPoints are the source of truth. At finish, `stopWorkout` runs the same pure functions the tests verify against the GPX fixture and overwrites the totals; the code comment says the rolling values are for display only. `summarize` also produces what incremental totals cannot: kilometre splits with interpolated boundaries, max speed, the thumbnail path and calories from final moving time. Any drift in the incremental path therefore never reaches history.\n\nThis incremental-for-display, authoritative-at-finish split is described in the tutorial under Tracking pipeline.",
    },

    // ------------------------------------------------------------ Level 3
    {
      id: "fitness-tracker-31",
      type: "explain",
      level: 3,
      topics: ["Background Tasks", "SQLite", "Offline & Sync"],
      files: ["src/projects/fitness-tracker/tracking/state.ts", "src/projects/fitness-tracker/tracking/pipeline.ts", "src/projects/fitness-tracker/db/schema.ts"],
      prompt:
        "`Session` (stored as JSON in a single-row `session` table) holds `filter`, `elevationRef`, `autoPauseState`, `segment`, `pausedAt` and `pausedTotalMs`. Explain why this state lives in SQLite and not in module variables, and give at least two **concrete** bugs you'd see after the OS kills the JS runtime between two task batches if it were kept in memory.\n\nSearch: read `Session` in `state.ts`, then trace how each field is used in `pipeline.ts`.",
      model:
        "The JS runtime can be killed between two task invocations, and the next batch may start in a fresh headless runtime. So everything the next invocation needs must be persisted, and it's saved in the same transaction as the points. If `filter.last` were in memory, the first fix after a restart would skip the speed and jitter gates, and a GPS jump would be recorded. The Kalman smoother would also restart cold. Losing `elevationRef` restarts the hysteresis, and losing `autoPauseState` resets the still/moving timers, so auto-pause fires late or never. Losing `pausedAt` / `pausedTotalMs` breaks the elapsed clock, which is derived from timestamps (`activeElapsedMs`), not from a stopwatch. The single transaction also means the session can never be ahead of or behind the points it describes.",
      rubric: [
        "The runtime may die between invocations, and the next batch can run in a fresh headless process",
        "Concrete bug: speed/jitter gates bypassed or Kalman reset without filter.last",
        "Concrete bug: elevation hysteresis or auto-pause timers reset",
        "The elapsed time is derived from persisted timestamps, not an in-memory stopwatch",
        "The session is saved in the same transaction as the points, so they stay consistent",
      ],
      links: [
        { title: "Expo SQLite", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" },
      ],
      explain:
        "See the header comment in `state.ts`, the `CHECK (id = 1)` single-row table in `schema.ts`, and `useElapsed`. The JS runtime can die between two task invocations and the next batch may start in a fresh headless runtime, so everything it needs must be in the database, saved in the same transaction as the points.\n\nConcrete bugs if kept in memory: without `filter.last` the first fix after a restart skips the speed and jitter gates and a GPS jump is recorded; the Kalman smoother restarts cold. Losing `elevationRef` resets the hysteresis. Losing `autoPauseState` resets the still and moving timers so auto-pause fires late or never. Losing `pausedAt` and `pausedTotalMs` breaks the clock, which is derived from timestamps in `activeElapsedMs`, not a stopwatch.\n\nThe tutorial states the rule in Architecture (the session lives in SQLite). Design every background-resumable feature around \"what must the next invocation know?\"",
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
        "The process died mid-workout. Read `findRecoverable`, `reattach` and how the Today screen wires `RecoveryBanner`. Select all that apply.\n\nSearch: read `findRecoverable` and `reattach` in `controller.ts`, the Today screen's use of `RecoveryBanner`, and the three tests in `controller.test.ts`.",
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
      links: [
        { title: "Expo TaskManager", url: "https://docs.expo.dev/versions/latest/sdk/task-manager/" },
        { title: "Expo SQLite", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
      ],
      explain:
        "`findRecoverable` returns `{ session, tracking }`. For background sessions `tracking` is `hasStartedLocationUpdatesAsync`, so a workout that is still recording (the OS kept the service alive) shows no banner. Every accepted point was written when its batch arrived, so nothing lives only in memory; \"Finish\" recomputes totals from the stored points, and \"Resume\" calls `reattach()` which re-arms location without touching pause state. Orphan workout rows with no session are deleted.\n\nBoth functions are wrapped in `enqueue`. Without that, the Today screen's mount-time `findRecoverable` could run while a start is suspended between `insertWorkout` and `saveSession`, treat the new row as a kill-time orphan and delete it. `controller.test.ts` holds a start at exactly that point to pin it.\n\nSee M3 and the failure modes Points held in memory and Racing session writers.",
    },
    {
      id: "fitness-tracker-33",
      type: "mcq",
      level: 3,
      topics: ["Background Tasks", "Platform Differences"],
      files: ["src/projects/fitness-tracker/tracking/config.ts"],
      prompt:
        "In `locationTaskOptions`, the Android foreground service is configured with `killServiceOnDestroy: false`. Per expo-location's type docs, the flag is \"whether to destroy the foreground service if the app is killed\". The user swipes the app away from recents mid-run. What does `false` do, and why is it the right value here?\n\nSearch: read the `killServiceOnDestroy` option in the expo-location types under `node_modules/expo-location` rather than inferring from the name.",
      choices: [
        "It keeps the location foreground service, and recording, running after the swipe. `true` would destroy the service and end the recording with the app",
        "It stops tracking on swipe-away, so a forgotten workout doesn't drain the battery",
        "It removes the persistent notification but keeps the service",
        "It's an iOS-only flag that controls `showsBackgroundLocationIndicator`",
      ],
      answer: 0,
      links: [
        { title: "Expo Location", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
        { title: "Android: Foreground service types", url: "https://developer.android.com/develop/background-work/services/fgs/service-types" },
      ],
      explain:
        "`killServiceOnDestroy: true` would destroy the foreground service when the app's task is removed. `false` leaves it running, which is what a workout needs: the user can swipe the app away and recording continues. The headless task keeps writing to SQLite, and `findRecoverable` later reports `tracking: true`, so no recovery banner appears. With `true`, a swipe would end the service and the next launch would find a session with no running location source.\n\nThe lesson is generic: read library option docs and types before choosing defaults for a flag whose name you can read two ways. It is also why Android needs an exemption path for OEM battery managers, which can still kill the service (tutorial Platform reality check).\n\nPair this with the persisted session so that even if the service dies, recovery works.",
    },
    {
      id: "fitness-tracker-34",
      type: "mcq",
      level: 3,
      topics: ["Native Modules", "Performance"],
      files: ["src/projects/fitness-tracker/liveactivity/index.ts"],
      prompt:
        "`update(state, force)` in `liveactivity/index.ts` throttles to `MIN_INTERVAL_MS = 1000`. The last push happened at time T. Then `update(A)` is called at T+200 ms and `update(B)` at T+600 ms, both with `force = false`. What reaches the native module?\n\nSearch: trace the two calls on paper against `update()`, tracking `pending`, `latest` and `lastPush`.",
      choices: [
        "Only B, at about T+1000 ms",
        "A at T+1000 ms. B is dropped, because a timer was already pending",
        "A right away, then B at T+1600 ms",
        "Both A and B, back to back at T+1000 ms",
      ],
      answer: 0,
      links: [
        { title: "Apple: ActivityKit", url: "https://developer.apple.com/documentation/activitykit" },
      ],
      explain:
        "At T+200 ms the remaining wait is 800 ms and `pending` is null, so a timer is scheduled and `latest = A`. At T+600 ms `latest = B` is set, but a timer already exists, so nothing else is scheduled. When the timer fires it sends `latest`, which is B. This is a trailing throttle: it coalesces bursts and always delivers the newest state.\n\nStatus changes pass `force = true` (from `transition` and pipeline status flips), so a pause appears on the lock screen immediately instead of waiting up to a second. The throttle exists because iOS throttles or terminates an activity that is updated at GPS rate; the clock itself ticks natively from `timerStart`.\n\nThe tutorial lists Live Activity update storm under failure modes; the throttle lives in the thin `liveactivity/index.ts` wrapper so the pipeline cannot forget it.",
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
        "On Android, the user taps **End** on the ongoing workout notification while the JS runtime is gone. Later the app is launched, and the user stays on the launcher. What happens?\n\nSearch: follow the End tap from `WorkoutNotification.kt` to `LiveActivityActionReceiver.kt`, then to `startPendingActionReplay` in the root layout.",
      choices: [
        "`LiveActivityActionReceiver` finds no listener and stores the action in SharedPreferences. On launch, the root layout's `startPendingActionReplay()` runs `replayPendingAction()`, which calls `consumePendingAction()` and `handleAction(\"end\")`, without the tracker ever being opened",
        "The action stays parked until the user opens the fitness tracker, because only its project layout can replay it",
        "Android starts JS headlessly and calls the TaskManager location task with the action in `data`",
        "The tap is lost. Without a JS runtime, a `PendingIntent.getBroadcast` can't be delivered",
      ],
      answer: 0,
      links: [
        { title: "Android: BroadcastReceiver", url: "https://developer.android.com/reference/android/content/BroadcastReceiver" },
        { title: "Android: PendingIntent", url: "https://developer.android.com/reference/android/app/PendingIntent" },
        { title: "Android: SharedPreferences", url: "https://developer.android.com/reference/android/content/SharedPreferences" },
      ],
      explain:
        "The receiver's companion object holds a `@Volatile listener` set in the module's `OnCreate`. If it is null, the action is parked in the `workout_live_activity` SharedPreferences. `src/app/_layout.tsx` calls `startPendingActionReplay()` at module scope, so on any launch (headless included) `consumePending` reads and removes it and `handleAction(\"end\")` runs, and again on every `AppState` change to active.\n\nRunning it from the root is safe because `handleAction` touches no UI or navigation: it only calls the controller's queued entry points. If the replay lived in the fitness layout, a parked End would wait until the user opened the tracker while the foreground service kept recording. The broadcast itself is always delivered: it is a manifest-declared, non-exported receiver reached through the app's own immutable PendingIntents.\n\nThe tutorial covers this in Architecture decisions and the failure mode Action tapped while JS is dead.",
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
        "iOS 17: the user taps **Pause** on the lock-screen Live Activity. Put the hops in order.\n\nSearch: read `WorkoutActionIntent` and `WorkoutShared.deliver` in `WorkoutAttributes.swift`, the observer in `LiveActivityModule.swift`, then the listener in `task.ts`.",
      items: [
        "SwiftUI `Button(intent: WorkoutActionIntent(action: \"pause\"))` in the widget extension's UI is tapped",
        "`WorkoutActionIntent.perform()` (a `LiveActivityIntent`) runs in the app's process and calls `WorkoutShared.deliver(action:)`",
        "`deliver` writes the action into App Group `UserDefaults` and posts a Darwin notification",
        "`LiveActivityModule`'s `CFNotificationCenter` observer calls `flushPendingAction`, which consumes the stored action",
        "`sendEvent(\"onAction\")` reaches the listener registered at module scope in `tracking/task.ts`, which calls `handleAction`",
        "`pauseWorkout` → `transition` saves the session and force-updates the Live Activity",
      ],
      links: [
        { title: "Apple: LiveActivityIntent", url: "https://developer.apple.com/documentation/appintents/liveactivityintent" },
        { title: "Apple: CFNotificationCenter", url: "https://developer.apple.com/documentation/corefoundation/cfnotificationcenter" },
        { title: "Apple: Displaying live data with Live Activities", url: "https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities" },
      ],
      explain:
        "Storing the action and then signalling is the key pattern. The action lives in shared `UserDefaults` (`pendingActionKey`), so if JS is not listening `consumePendingAction()` can still pick it up later. A Darwin notification is posted because it crosses process boundaries, which `NotificationCenter.default` does not. A `LiveActivityIntent` runs `perform()` in the **app's** process, which is alive because it is tracking location, even though the button UI is rendered by the extension.\n\niOS 16 cannot host interactive buttons (`ActionButtons` renders `EmptyView`), which is why the Live Activity target is 16.4 but the buttons need 17. The final hop is `handleAction`, which goes through the queued controller so it cannot race a GPS batch.\n\nThe tutorial's M6 checkpoint (Pause actually pauses, even after a kill) tests exactly this chain.",
    },
    {
      id: "fitness-tracker-37",
      type: "mcq",
      level: 3,
      topics: ["Native Modules", "Config Plugins"],
      files: ["modules/live-activity/ios/WorkoutAttributes.swift", "plugins/withWorkoutCapabilities.js"],
      prompt:
        "`withWidgetSources` copies `modules/live-activity/ios/WorkoutAttributes.swift` byte for byte into the `WorkoutWidget` extension, instead of keeping a second hand-written copy there. Why does that matter?\n\nSearch: compare `SWIFT_SOURCES` and `SHARED_ATTRIBUTES` in the plugin with the header comment of `WorkoutAttributes.swift`.",
      choices: [
        "ActivityKit pairs the app's activity with the extension's UI by type name and Codable shape. Two copies that drift apart fail silently, so one source file keeps them identical. It also can't import `ExpoModulesCore`, because the extension doesn't link it",
        "Xcode can't reference a source file that lives outside `ios/`",
        "The widget extension could otherwise just import the `LiveActivity` pod, so copying only saves build time",
        "Copying makes the main app binary smaller, because the file moves out of the app target",
      ],
      answer: 0,
      links: [
        { title: "Apple: ActivityKit", url: "https://developer.apple.com/documentation/activitykit" },
        { title: "EAS Build app extensions", url: "https://docs.expo.dev/build-reference/app-extensions/" },
      ],
      explain:
        "The header of `WorkoutAttributes.swift` spells out the contract: ActivityKit pairs the app's activity with the extension's UI by type name and `Codable` shape, and a mismatch produces no error, just no Live Activity UI. One source file copied by the plugin keeps both targets identical. The same file holds `WorkoutShared` (App Group key, Darwin notification name) and `WorkoutActionIntent`, which both processes need, so it must stay free of `ExpoModulesCore`, which the extension does not link.\n\n`SWIFT_SOURCES` lists it, so the Xcode mod adds it to the extension's Sources build phase. This is a general approach to sharing code between an app and an extension generated by CNG: one canonical file, copied at prebuild, never forked.\n\nThe tutorial calls this out in a note in Native layer, Step 2.",
    },
    {
      id: "fitness-tracker-38",
      type: "text",
      level: 3,
      topics: ["Native Modules", "Config Plugins"],
      files: ["modules/live-activity/ios/WorkoutAttributes.swift", "plugins/withWorkoutCapabilities.js", "plugins/workout-widget/Info.plist"],
      prompt:
        "Neither the app nor the widget extension hard-codes the App Group id in Swift. `WorkoutShared.appGroup` reads it from an Info.plist key that the config plugin writes into **both** the app's plist and the extension's plist (replacing `__APP_GROUP__`).\n\nWhat is that Info.plist key?\n\nSearch: `grep -rn WorkoutAppGroup .` (excluding node_modules) and follow the value from `app.config.ts` to both plists.",
      accept: ["WorkoutAppGroup"],
      links: [
        { title: "Apple: App Groups entitlement", url: "https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.application-groups" },
        { title: "EAS Build app extensions", url: "https://docs.expo.dev/build-reference/app-extensions/" },
      ],
      explain:
        "`Bundle.main.object(forInfoDictionaryKey: \"WorkoutAppGroup\")`. `withWorkoutInfoPlist` sets it in the app, and `withWidgetSources` substitutes it into the extension's `Info.plist` in place of `__APP_GROUP__`. Both come from the single `appGroup` plugin prop, which `assertAppGroup` checks starts with `group.`, and the same prop feeds both entitlements files and the EAS `appExtensions` entry.\n\nThe tutorial calls an app/extension mismatch \"silent and maddening\": the widget just shows zeros and nothing logs an error. Deriving every use from one prop makes the mismatch impossible instead of merely unlikely.\n\nThis is the kind of defect a config plugin is for: encode the invariant once, fail fast on bad input, and test it in memory.",
    },
    {
      id: "fitness-tracker-39",
      type: "mcq",
      level: 3,
      topics: ["Config Plugins", "Testing"],
      files: ["src/projects/fitness-tracker/__tests__/configPlugin.test.ts", "plugins/withWorkoutCapabilities.js"],
      prompt:
        "`configPlugin.test.ts` applies the plugin twice in two tests. \"The run-once wrapper skips a second application\" uses the exported plugin. \"Each mod is idempotent on its own\" uses `withWorkoutCapabilitiesUnwrapped`. Why does the second test need the unwrapped function to exercise `addUnique` and `ensurePermissions`?\n\nSearch: read the end of `withWorkoutCapabilities.js` (the exports) and the two idempotency tests in `configPlugin.test.ts`.",
      choices: [
        "The export is wrapped in `createRunOncePlugin`, which records the plugin name in the config's plugin history. A second call returns the config unchanged, so with the wrapped export the second set of mods never registers and the dedupe logic never sees its own output",
        "The unwrapped function skips `assertAppGroup`, which would throw on the second call",
        "`compileModsAsync` deduplicates identical mods from the same plugin, so only the unwrapped one registers twice",
        "Introspection mode only runs mods from unwrapped plugins",
      ],
      answer: 0,
      links: [
        { title: "Create and use config plugins", url: "https://docs.expo.dev/config-plugins/plugins/" },
        { title: "Debugging config plugins", url: "https://docs.expo.dev/config-plugins/development-and-debugging/" },
      ],
      explain:
        "`createRunOncePlugin` records the plugin name in the config's plugin history, and a second call returns the config unchanged. A test that applies the wrapped export twice would therefore still pass even if `addUnique` were reduced to a plain concat. `module.exports.withWorkoutCapabilitiesUnwrapped` exists only so the second test can apply the raw function twice and make each mod prove its own idempotency.\n\nThat matters because of the real-world case: `prebuild` without `--clean` starts from native files that already contain your values. Idempotency is carried by `addUnique`, `ensurePermissions`, the receiver `some(...)` check, the `appExtensions` check and `pbxTargetByName`. Runtime behaviour still goes through the run-once export.\n\nThe tutorial's Testing the plugin in memory subsection recommends exactly this pairing.",
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
        "Lock-screen and home-screen surfaces have strict OS update budgets. Which of these mechanisms does the repo actually use to stay within them? Select all that apply.\n\nSearch: read `liveactivity/index.ts`, `tracking/widget.ts`, `TodayWidget.swift` and the chronometer lines in `WorkoutNotification.kt`.",
      choices: [
        "The JS wrapper throttles Live Activity updates to at most about one per second and always sends the latest state",
        "The clock ticks natively from `timerStart` (`Text(timerInterval:)` on iOS, `setUsesChronometer` on Android), so JS never pushes once per second just for the clock",
        "`syncWidget(steps)` only pushes when steps cross a 100-step bucket, debounced by 2 s",
        "A `setInterval` calls `setWidgetData` every second while the Today tab is open",
        "The TodayWidget timeline asks WidgetKit for a fresh entry every minute",
      ],
      answer: [0, 1, 2],
      links: [
        { title: "Apple: Keeping a widget up to date", url: "https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date" },
        { title: "Apple: WidgetKit", url: "https://developer.apple.com/documentation/widgetkit" },
        { title: "Android: NotificationCompat.Builder", url: "https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder" },
      ],
      explain:
        "`syncWidget`'s comment says \"Never on a timer\": pushes are event-driven and bucketed (every 100 steps, debounced 2 s), and a finished workout pushes immediately. The Live Activity wrapper throttles to about 1 Hz and always sends the latest state. The clock ticks natively from `timerStart` (`Text(timerInterval:)` on iOS, `setUsesChronometer` on Android), so JS never pushes once per second for the clock.\n\n`TodayProvider.getTimeline` uses a 30-minute `.after` policy only as a fallback to keep \"today\" correct across midnight. Real refreshes come from `WidgetCenter.reloadAllTimelines()` inside `setWidgetData`, and WidgetKit still budgets them. On iOS `update` also sets a 10-minute `staleDate`, so a dead pipeline greys the activity out instead of freezing a \"live\" distance.\n\nThe tutorial's M7 asks you to understand why you cannot update a widget every second.",
    },
    {
      id: "fitness-tracker-41",
      type: "explain",
      level: 3,
      topics: ["Config Plugins", "Expo Config & EAS"],
      files: ["app.config.ts", "plugins/withWorkoutCapabilities.js", "plugins/withSceneLifecycle.js"],
      prompt:
        "In `app.config.ts`, `./plugins/withWorkoutCapabilities` is listed **before** `expo-share-intent`, and `./plugins/withSceneLifecycle` is listed first of all. Explain the rule about plugin order that makes this deliberate, and what would go wrong with the App Group entitlement if `withWorkoutCapabilities` were moved after `expo-share-intent`.\n\nSearch: read the plugin-order comments in `app.config.ts` and `addUnique` in the plugin, and verify the rule with `EXPO_DEBUG=1 npx expo prebuild --no-install --platform ios` if you can.",
      model:
        "Each plugin wraps the mod chain for a file, so the mods registered by **later** plugins run **first**. To make your mod see the final value, you list your plugin earlier. expo-share-intent prepends its App Group to `com.apple.security.application-groups` without checking for duplicates. `app.config.ts` already lists that same group in `ios.entitlements`, so the array ends up with a duplicate. Listed earlier, `withWorkoutEntitlements` runs after share-intent, and `addUnique` collapses the array to one entry. If the order were swapped, it would dedupe first and share-intent would then add the duplicate back. The test \"collapses an App Group another plugin already duplicated\" covers that collapse. `withSceneLifecycle` is listed first for the same reason: its AppDelegate mod must run last, after every other plugin's edits.",
      rubric: [
        "Mods of later-listed plugins run first (reverse order)",
        "expo-share-intent adds the App Group without deduping",
        "withWorkoutCapabilities is listed earlier so it runs later and addUnique cleans the array",
        "Reversed order leaves a duplicate entitlement entry",
        "Same reasoning for withSceneLifecycle's AppDelegate mod running last",
      ],
      links: [
        { title: "Create and use config plugins", url: "https://docs.expo.dev/config-plugins/plugins/" },
        { title: "Debugging config plugins", url: "https://docs.expo.dev/config-plugins/development-and-debugging/" },
        { title: "Continuous Native Generation", url: "https://docs.expo.dev/workflow/continuous-native-generation/" },
      ],
      explain:
        "Both ordering comments are in the `plugins` array of `app.config.ts`, and the `addUnique` comment in the plugin says the same. Each plugin wraps the mod chain for a file, so mods registered by **later** plugins run **first**. To see the final value you list your plugin earlier. `expo-share-intent` prepends its App Group to `com.apple.security.application-groups` without deduping, and `app.config.ts` already lists the same group, so the array ends up with a duplicate. Listed earlier, `withWorkoutEntitlements` runs after share-intent and `addUnique` collapses it. Swapped, it would dedupe first and share-intent would add the duplicate back.\n\n`withSceneLifecycle` is first of all so its AppDelegate edit runs last, after every other plugin has finished. The test collapses an App Group another plugin already duplicated pins the behaviour.\n\nThe tutorial repeats the rule in the plugin-shape block and under failure modes (Plugin order).",
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
        "`WorkoutActivityState` sends `timerStart` (epoch ms = now − active elapsed) as well as `elapsedSec`. Explain why the lock-screen clock is driven by `timerStart` instead of JS pushing a new `elapsedSec` every second, how pauses are handled, and how Android gets the same effect.\n\nSearch: read `ElapsedText` in `WorkoutLiveActivity.swift`, the chronometer branch in `WorkoutNotification.kt`, and `buildState` in `liveactivity/index.ts`.",
      model:
        "Native UI can render a self-ticking timer from a fixed start instant. On iOS that's `Text(timerInterval: timerStart...distantFuture)`, and on Android it's `setUsesChronometer(true).setWhen(timerStart)`. The clock then advances every second with no JS involvement. That matters because iOS throttles or kills an activity that's updated too often, and the JS might be suspended between GPS batches anyway. JS only pushes when distance, pace or status changes, throttled to about 1 Hz, with forced pushes on status changes. `buildState` computes `timerStart = now - activeElapsedMs(session)`, so paused time is already excluded. While paused, `ElapsedText` shows the static `elapsedSec` and the Android notification turns the chronometer off. The payload stays small (iOS caps it at 4 KB).",
      rubric: [
        "Native self-ticking timer from a start instant (Text(timerInterval:) / chronometer)",
        "Avoids per-second updates: iOS budget/throttling, and JS may be suspended",
        "timerStart = now − active elapsed, so pauses are already subtracted",
        "Paused state shows the static elapsedSec, with the chronometer off on Android",
      ],
      links: [
        { title: "Apple: SwiftUI Text", url: "https://developer.apple.com/documentation/swiftui/text" },
        { title: "Android: NotificationCompat.Builder", url: "https://developer.android.com/reference/androidx/core/app/NotificationCompat.Builder" },
        { title: "Apple: Displaying live data with Live Activities", url: "https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities" },
      ],
      explain:
        "Native UI can render a self-ticking timer from a fixed start instant: `Text(timerInterval: timerStart...distantFuture)` on iOS, `setUsesChronometer(true).setWhen(timerStart)` on Android. The clock advances every second without JS, which matters because iOS throttles or kills over-updated activities and JS may be suspended between GPS batches anyway. JS pushes only when distance, pace or status changes, throttled to about 1 Hz and forced on status changes.\n\n`buildState` computes `timerStart = now - activeElapsedMs(session)`, so paused time is already excluded. While paused, `ElapsedText` shows the static `elapsedSec` and the Android notification turns the chronometer off, because a self-ticking clock cannot know about the pause. Keep the payload small (iOS caps content at 4 KB).\n\nThe tutorial's native-layer Step 3 ends with this design rule: send an instant, not a counter.",
    },
  ],
});

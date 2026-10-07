QUIZ.register({
  slug: "camera-social",
  number: "02",
  title: "Camera & social capture",
  doc: "../02-camera-social.html",
  summary:
    "Trains the camera, media and editor stack as this repo builds it: permission gates, expo-camera lifecycle, worklets and gestures on the UI thread, the operation-list editor with Skia preview and export, the ingest pipeline into SQLite and the file system, the media library, and sharing in and out.",
  questions: [
    // ───────────────────────────── Level 1 ─────────────────────────────
    {
      id: "camera-social-01",
      type: "mcq",
      level: 1,
      topics: ["Expo Router", "Gesture Handler"],
      files: ["src/app/projects/camera-social/_layout.tsx"],
      prompt:
        "In the Camera & Social stack layout, the `editor/[assetId]` route is a `fullScreenModal` with `gestureEnabled: false`. Why turn the dismiss gesture off for this one screen?",
      choices: [
        "The crop overlay's pinch, pan and rotate gestures cover the whole screen. A swipe-to-dismiss would compete with them and could close the editor halfway through a crop.",
        "On Android, `fullScreenModal` crashes when gestures are on, so every full-screen modal needs it off.",
        "Expo Router requires `gestureEnabled: false` on any route with a dynamic segment such as `[assetId]`.",
        "It stops the React Compiler from re-memoizing the editor while the modal animates in.",
      ],
      answer: 0,
      explain:
        "The comment next to the option says it directly: \"Crop gestures own the whole screen; no swipe-to-dismiss.\" `CropOverlay` puts a `Gesture.Simultaneous(pinch, pan, rotation)` detector over the whole stage, so the native modal's dismiss gesture would fight it. Dynamic segments have nothing to do with gestures, and the option is a per-screen choice, not a platform requirement. The cancel button (with its \"Discard edits?\" alert) becomes the only way out, which also protects unsaved edits.",
    },
    {
      id: "camera-social-02",
      type: "text",
      level: 1,
      topics: ["SQLite", "Expo Router"],
      files: [
        "src/app/projects/camera-social/_layout.tsx",
        "src/projects/camera-social/db/schema.ts",
      ],
      prompt:
        "The project layout wraps everything in `<SQLiteProvider databaseName=\"camera-social.db\" … useSuspense>`. Which **prop name** on `SQLiteProvider` runs `migrate`, so that no screen can query the database before the schema exists?",
      accept: ["onInit", "onInit={migrate}"],
      explain:
        "`onInit={migrate}` runs once when the database opens. Because of `useSuspense`, the provider suspends until it finishes, and the surrounding `<Suspense fallback={<Booting />}>` shows a spinner in the meantime. That means `useSQLiteContext()` in any child screen always gets a migrated database. The project owns its own file (`DATABASE_NAME = \"camera-social.db\"`) because of isolation rule 3: projects never share a database.",
    },
    {
      id: "camera-social-03",
      type: "mcq",
      level: 1,
      topics: ["Permissions", "Media"],
      files: ["src/projects/camera-social/components/PermissionGate.tsx"],
      prompt:
        "`PermissionGate` gets this permission response for the camera. Which state does `gateState()` return, and what does the user see?",
      code: "{ granted: false, status: \"denied\", canAskAgain: false, expires: \"never\" }",
      choices: [
        "`\"blocked\"`: a lock icon, the settings hint, and an **Open Settings** button that calls `Linking.openSettings()`",
        "`\"rationale\"`: the explanation screen again, with **Allow access** calling `onRequest()`",
        "`\"loading\"`: a spinner until the next AppState change",
        "`\"granted\"`: the children render and expo-camera shows its own error",
      ],
      answer: 0,
      explain:
        "`gateState` returns `\"blocked\"` only when `status === \"denied\" && !canAskAgain`. In that case the OS won't show the system prompt again, so calling `requestPermission()` would just resolve silently. The comment calls this \"the silent dead end\", and the gate sends the user to Settings instead. `\"rationale\"` covers undetermined status and denials that can still be asked again. The gate also listens for `AppState` going `\"active\"` and calls `onRecheck` (the hook's `getPermission`), because coming back from Settings doesn't trigger a re-render by itself.",
    },
    {
      id: "camera-social-04",
      type: "mcq",
      level: 1,
      topics: ["Permissions", "Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "In `camera.tsx`, the camera permission is granted but the **microphone** permission is denied. The user switches to VIDEO mode. What happens?",
      choices: [
        "Recording still works but has no sound (`mute={micState !== \"granted\"}`), and a banner offers to request the mic or open Settings",
        "The shutter is disabled in video mode until the microphone is granted",
        "A second `PermissionGate` replaces the camera preview with a microphone rationale screen",
        "`recordAsync` rejects and the red toast shows \"Recording failed\"",
      ],
      answer: 0,
      explain:
        "Only the camera permission is behind `PermissionGate`. The mic is a soft dependency: `micState = gateState(micPermission)` drives the `mute` prop on `CameraView` and a `micBanner` Pressable. If the mic is blocked the banner opens Settings; otherwise it calls `requestMic().then(getMic)`. That's a deliberate UX choice, so a missing optional permission degrades one feature instead of blocking the whole screen. The banner is hidden while recording and while the mic state is still loading.",
    },
    {
      id: "camera-social-05",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "`CameraCapture` passes `active={…}` to the `CameraView` and, on Android, decides whether to mount it at all, based on one **expo-router hook**. Name the hook.",
      accept: ["useIsFocused", "useIsFocused()"],
      explain:
        "`const isFocused = useIsFocused();` comes from `expo-router`. AGENTS.md forbids `@react-navigation/*` imports. When you tap the last-shot button, `post/[id]` is pushed on top of the camera, and the camera screen stays mounted underneath. Without `isFocused`, the sensor would keep running there, draining the battery and leaving a frozen preview when you come back. The comment in the file spells out both effects.",
    },
    {
      id: "camera-social-06",
      type: "text",
      level: 1,
      topics: ["Reanimated"],
      files: [
        "src/app/projects/camera-social/camera.tsx",
        "src/projects/camera-social/components/camera/FocusRing.tsx",
        "src/projects/camera-social/utils/zoom.ts",
      ],
      prompt:
        "`onShutterUI` in `camera.tsx`, `show()` in `FocusRing.tsx` and `factorToZoom()` in `utils/zoom.ts` all start with the same string directive. It tells the Worklets Babel plugin to compile them so they can run on the UI thread. What is the directive? Type the word.",
      accept: ["worklet", /^['"]?worklet['"]?;?$/i],
      explain:
        "`\"worklet\";` marks a function so the plugin can serialize it to the UI runtime. Callbacks you chain directly on a `Gesture.X()` builder or pass to `useAnimatedStyle` are workletized automatically. Standalone helpers you call from them, like `pinchToZoom`, the crop math, or the `onPressUI` prop that `ShutterButton` calls inside `onBegin`, need the explicit directive. Without it you get a runtime error about calling a non-worklet function on the UI thread.",
    },
    {
      id: "camera-social-07",
      type: "text",
      level: 1,
      topics: ["Reanimated", "Gesture Handler"],
      files: [
        "src/app/projects/camera-social/camera.tsx",
        "src/projects/camera-social/components/editor/CropOverlay.tsx",
      ],
      prompt:
        "Gesture callbacks run on the UI thread, but `controller.flip`, `refocus` and `openLibrary` are ordinary JS functions. Which function, imported from `react-native-worklets`, does the camera use to call them from a gesture?",
      accept: ["scheduleOnRN", "scheduleOnRN()"],
      explain:
        "`scheduleOnRN(fn, ...args)` queues `fn` to run on the React Native (JS) thread. In Reanimated 4 / react-native-worklets it replaces the older `runOnJS(fn)(args)`. You need it because JS closures such as router calls and `setState` can't run synchronously inside a worklet. Note how `stepMode` gets its argument: `scheduleOnRN(stepMode, 1)`. The same pattern sends the final crop rect back in `CropOverlay.emitCurrent`.",
    },
    {
      id: "camera-social-08",
      type: "mcq",
      level: 1,
      topics: ["Reanimated", "React Compiler"],
      files: [
        "src/projects/camera-social/hooks/useCameraController.ts",
        "src/projects/camera-social/components/editor/VideoTrimEditor.tsx",
      ],
      prompt:
        "Every shared value in this slice is read with `zoom.get()` and written with `zoom.set(…)`, never with `zoom.value`. Why does the repo stick to that style?",
      choices: [
        "With the React Compiler on, `sv.value = x` is a property mutation on a value a hook returned, which the compiler's rules flag. `get()`/`set()` are method calls, so they're safe.",
        "`.value` was removed in Reanimated 4, so `get`/`set` are the only API left.",
        "`.set()` is the only way to write from the JS thread; `.value` only works inside worklets.",
        "`.get()` makes the component re-render when the value changes, so the screen stays in sync.",
      ],
      answer: 0,
      explain:
        "AGENTS.md (React Compiler rules) says: don't mutate a value returned from a hook, call a method instead. `VideoTrimEditor` and `TrimmedVideoView` use `player.seekBy()` instead of `player.currentTime = …` for the same reason. `.value` still exists, but `get`/`set` is the compiler-friendly form. Neither one triggers a React render: shared values reach the UI via animated styles and props, not via state.",
    },
    {
      id: "camera-social-09",
      type: "mcq",
      level: 1,
      topics: ["File System", "SQLite"],
      files: [
        "src/projects/camera-social/media/paths.ts",
        "src/projects/camera-social/media/storage.ts",
        "src/projects/camera-social/db/schema.ts",
      ],
      prompt:
        "The `captures` table stores `path` and `thumb_path` as paths **relative** to the Documents directory, and `absoluteUri()` resolves them every time a row is read. Why not store the absolute `file:///…` URI?",
      choices: [
        "On iOS the absolute container path (`…/Application/<UUID>/Documents`) can change across reinstalls, restores and some updates, so a stored absolute path can point to nowhere",
        "SQLite TEXT columns are limited in length, and absolute URIs often exceed that limit",
        "expo-image can't load `file://` URIs, so the path has to be rebuilt at render time",
        "Relative paths let the iOS and Android builds share one database through iCloud",
      ],
      answer: 0,
      explain:
        "The comment in `paths.ts` says: resolve at read time, never persist the absolute form. The test \"resolves against a *new* container path\" in `utils.test.ts` shows `resolveRelativePath` rebuilding the URI against a different container UUID. `toRelativePath` also accepts both `file:/` and `file:///` spellings, because different native APIs return different forms. Already-absolute URIs such as `content://` pass straight through.",
    },
    {
      id: "camera-social-10",
      type: "multi",
      level: 1,
      topics: ["Gesture Handler", "Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "Look at the `previewGesture` built in `CameraCapture`. Select all the gestures that are actually implemented on the camera preview.",
      choices: [
        "Pinch changes the zoom shared value through `pinchToZoom`",
        "Double-tap switches between the front and back camera",
        "Single tap shows the focus ring and forces a refocus",
        "Fling up goes to the Library tab (`router.dismissTo`)",
        "Long-press records video while held",
        "Swipe down closes the camera",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "`Gesture.Race(pinch, flingUp, flingLeft, flingRight, Gesture.Exclusive(doubleTap, singleTap))`: whichever gesture is recognized first wins, so a pinch never also fires a tap. `Exclusive` makes the single tap wait until the double tap has failed. Fling left and right step through the modes. Video is tap-to-start and tap-to-stop on `ShutterButton`; there is no long-press recording. The camera closes with the X button in `CameraTopBar` (`router.back()`), not a swipe.",
    },
    {
      id: "camera-social-11",
      type: "text",
      level: 1,
      topics: ["Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "expo-camera has no API to focus on a tapped point. The `refocus()` helper fakes tap-to-focus by turning one `CameraView` **prop** off and back on 60 ms later. Name that prop.",
      accept: ["autofocus", "autoFocus"],
      explain:
        "`setAutofocus(\"off\"); setTimeout(() => setAutofocus(\"on\"), 60);` makes the camera start a new focus pass. The ring is only visual: `ring.show(e.x, e.y)` runs as a worklet on the UI thread, then `scheduleOnRN(refocus)` changes the React state. It's a small, honest workaround: the doc comment admits the library doesn't support point-of-interest focus.",
    },
    {
      id: "camera-social-12",
      type: "mcq",
      level: 1,
      topics: ["Media", "Permissions"],
      files: ["src/projects/camera-social/utils/shareOut.ts"],
      prompt:
        "`saveToGallery()` starts with `MediaLibrary.requestPermissionsAsync(true)`. What does the `true` argument ask for, and why?",
      choices: [
        "Write-only access. Adding a file to an album doesn't need read access to the library, and on iOS the add-only prompt is much less alarming.",
        "A forced re-prompt, even if the user denied access before",
        "Access to the GPS location stored in media (ACCESS_MEDIA_LOCATION)",
        "The iOS limited-selection picker, instead of full access",
      ],
      answer: 0,
      explain:
        "The first parameter is `writeOnly`. Asking for the narrowest permission that does the job is good permission UX: the comment calls it \"a much less scary prompt than full library read access\". The function then reuses the dedicated `\"Why Not RN\"` album (`Album.get`, then `Asset.create(uri, album)`) or creates it with the first asset, so captures never get scattered across the camera roll. Browsing the library (`useAssets`) is what needs full read access, and the separate Library tab gate asks for that.",
    },

    // ───────────────────────────── Level 2 ─────────────────────────────
    {
      id: "camera-social-13",
      type: "mcq",
      level: 2,
      topics: ["Media", "Platform Differences"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "`camera.tsx` computes `const cameraMounted = Platform.OS === \"ios\" || isFocused;` **and** passes `active={isFocused}`. Why the platform split?",
      choices: [
        "`active` is iOS-only. On Android the only way to release the camera when the screen loses focus is to unmount `CameraView`.",
        "Android crashes if two `CameraView`s are mounted, so iOS keeps its view mounted just to be faster.",
        "`isFocused` is always `false` on iOS inside a `fullScreenModal`, so iOS must always mount.",
        "Unmounting on iOS would reset the camera permission to undetermined.",
      ],
      answer: 0,
      explain:
        "The comment says: \"iOS via `active`, Android by unmounting (the prop is iOS-only).\" On iOS, keeping the view mounted with `active={false}` pauses the session and resumes quickly. Android has no such switch, so the view leaves the tree. Either way the sensor is released when you push `post/[id]` on top, which prevents battery drain and a frozen preview. This is a typical React Native pattern: one prop works on one platform, and the other platform needs a structural workaround.",
    },
    {
      id: "camera-social-14",
      type: "mcq",
      level: 2,
      topics: ["React Hooks", "Performance"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "While recording, an interval fires every **250 ms** and calls `setElapsedSec(Math.round((Date.now() - startedAt) / 1000))`. Yet the camera screen re-renders about **once per second**. Why?",
      choices: [
        "React skips the update when `setState` gets the same value as before (`Object.is`). Three of the four ticks each second store an unchanged whole number.",
        "The React Compiler memoizes the interval callback, so it only runs once per second.",
        "React Native throttles `setInterval` to at most one call per second while the camera is active.",
        "`useEffect` batches the four updates into one commit at the end of each second.",
      ],
      answer: 0,
      explain:
        "Storing only the rounded seconds is the trick, and the comment says so: \"React skips the render when the value is unchanged.\" Ticking faster than once a second keeps the label close to the wall clock without drifting. The value is rounded the same way as `formatDuration`, so the label flips at the same moments. The cleanup clears the interval and resets the value to 0 when recording stops. The compiler memoizes values; it doesn't change how often a timer fires.",
    },
    {
      id: "camera-social-15",
      type: "mcq",
      level: 2,
      topics: ["Reanimated", "Performance"],
      files: [
        "src/app/projects/camera-social/camera.tsx",
        "src/projects/camera-social/hooks/useCameraController.ts",
      ],
      prompt:
        "The zoom label uses `useAnimatedReaction(() => Math.round(zoomToFactor(zoom.get()) * 10) / 10, (v, prev) => { if (v !== prev) scheduleOnRN(setFactor, v); })`, while the camera itself gets zoom through `useAnimatedProps`. Why not just call `setFactor` from the pinch's `onUpdate`?",
      choices: [
        "A pinch updates every frame on the UI thread. Sending each frame to JS would re-render the whole camera screen per frame. The reaction only crosses threads when the displayed value (0.1 steps) changes, and zoom reaches the native view without React at all.",
        "`setState` can't be called from the JS thread while a gesture is active.",
        "`useAnimatedReaction` runs on the JS thread, so it's cheaper than a gesture callback.",
        "`CameraView`'s `zoom` prop only accepts React state, so `setFactor` must drive it.",
      ],
      answer: 0,
      explain:
        "`useCameraController` keeps zoom as a shared value \"so a pinch never re-renders the screen\". `Animated.createAnimatedComponent(CameraView)` plus `useAnimatedProps(() => ({ zoom: zoom.get() }))` sends it straight to the native view. `useAnimatedReaction` runs on the UI thread and acts as a filter: React only hears about changes the user can actually see. `ShutterButton` does something similar: the Skia `<Path end={ringEnd}>` gets a derived value directly, so the recording ring animates with no React renders.",
    },
    {
      id: "camera-social-16",
      type: "mcq",
      level: 2,
      topics: ["Media"],
      files: [
        "src/projects/camera-social/utils/zoom.ts",
        "src/projects/camera-social/__tests__/utils.test.ts",
      ],
      prompt:
        "With `MAX_ZOOM_FACTOR = 10`, expo-camera's linear `zoom` shared value is at **0.5**. What does the zoom label show (`formatFactor` of the factor rounded to 0.1)?",
      choices: ["3.2×", "5×", "5.5×", "2×"],
      answer: 0,
      explain:
        "`zoomToFactor(z) = max ** z`, so 10^0.5 ≈ 3.16, which rounds to 3.2, and the label reads \"3.2×\". The curve is logarithmic because perceived zoom is multiplicative. With a linear mapping, 0.5 would mean 5.5× and pinches would feel sluggish when wide and twitchy at tele. `pinchToZoom` converts to a factor, multiplies by the pinch scale, and converts back, so the same pinch doubles the zoom anywhere in the range. The test \"the same pinch doubles the factor anywhere in the range\" checks that 1×→2× and 4×→8×.",
    },
    {
      id: "camera-social-17",
      type: "order",
      level: 2,
      topics: ["SQLite"],
      files: ["src/projects/camera-social/db/schema.ts"],
      prompt:
        "Put the steps of `migrate(db)` in the order they run on a fresh install.",
      items: [
        "Set `PRAGMA journal_mode = WAL`",
        "Read the current `PRAGMA user_version`",
        "Open a transaction for version `next = version + 1`",
        "Execute `MIGRATIONS[next]` (CREATE TABLE captures, settings, index)",
        "Write `PRAGMA user_version = next` inside the same transaction",
        "Loop until `version === SCHEMA_VERSION`",
      ],
      explain:
        "`user_version` is a free integer in the database header, which makes it a natural schema version. Bumping it in the **same** `withTransactionAsync` as the DDL means a crash halfway through leaves neither the tables nor the version number behind, and the next launch simply retries. WAL lets readers (the feed) and the writer (ingest) work at the same time. To add v2, you append `MIGRATIONS[2]` and bump `SCHEMA_VERSION`; existing users then run only the new step.",
    },
    {
      id: "camera-social-18",
      type: "multi",
      level: 2,
      topics: ["SQLite", "React Hooks"],
      files: [
        "src/projects/camera-social/hooks/useCaptures.ts",
        "src/app/projects/camera-social/_layout.tsx",
      ],
      prompt:
        "The feed, viewer and profile stay live without TanStack Query, thanks to `useCapturesQuery` in `hooks/useCaptures.ts`. Select all the statements that are true.",
      choices: [
        "It subscribes with `addDatabaseChangeListener` and re-runs `select(db)` after changes",
        "It ignores events whose `databaseFilePath` doesn't end in `camera-social.db`, because the listener is process-wide and fires for every project's database",
        "It merges a burst of per-row events (rapid-fire shutter) into one reload with a 40 ms timer",
        "Change events only arrive because the provider is opened with `options={{ enableChangeListener: true }}`",
        "It caches results in the app-wide TanStack `QueryClient` under `[\"camera-social\", …]` keys",
        "`useCaptureItem` passes a new inline `select` arrow on every render, so the effect re-subscribes on every render",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "This is a hand-rolled \"live query\": load once, subscribe, reload with a debounce, and guard with `cancelled` on unmount. The file-name filter is what keeps the journal, fitness and podcast databases from waking up the feed. There's no TanStack involvement here, because local SQLite is the source of truth. `useCaptureItem` wraps `select` in `useCallback([id])`, and the other hooks pass stable module-level functions (`listCaptureGrid`), so the `[db, select]` effect only re-subscribes when the id changes.",
    },
    {
      id: "camera-social-19",
      type: "order",
      level: 2,
      topics: ["Media", "File System"],
      files: [
        "src/projects/camera-social/media/ingest.ts",
        "src/projects/camera-social/media/thumbnails.ts",
        "src/projects/camera-social/media/exif.ts",
      ],
      prompt: "Put the steps of `ingestPhoto()` in the order they run.",
      items: [
        "Bake EXIF orientation into the pixels if `Orientation ≠ 1` (`normalizeOrientation`)",
        "Move (if `ownsFile`) or copy the file into `Documents/camera-social/originals`",
        "Measure width and height with the manipulator if the input didn't provide them",
        "Create the ~400 px thumbnail, deleting the copied original if this fails",
        "Insert the `captures` row with relative paths and the size from `fileSize()`",
      ],
      explain:
        "The pipeline turns a temp file into a durable row, and nothing downstream ever sees a cache-dir URI. Camera, manipulator and share-extension outputs live in places the OS may clear, so ingest always lands the file in Documents. When orientation is baked in, `withUprightOrientation` rewrites the stored EXIF to `Orientation: 1`; otherwise viewers would rotate the already-rotated pixels again. The `try/catch` around the thumbnail cleans up the copied file, so a failure doesn't leave an orphan with no row.",
    },
    {
      id: "camera-social-20",
      type: "mcq",
      level: 2,
      topics: ["Media", "Performance", "Platform Differences"],
      files: [
        "src/projects/camera-social/hooks/useAssets.ts",
        "src/projects/camera-social/components/library/AssetCell.tsx",
      ],
      prompt:
        "`gridUri(id)` in `useAssets.ts` returns `ph://${id}` on iOS and the bare `id` on Android. The library grid never resolves a real file path per cell. Why?",
      choices: [
        "Resolving each asset's file is a native round-trip per cell (on iOS possibly an iCloud download). With `ph://`, expo-image asks PhotoKit for a sized thumbnail, and on Android the id is already a `content://` URI.",
        "`ph://` URIs skip the media-library permission check, so the grid can render before access is granted.",
        "FlashList can only recycle cells whose image source uses a custom URL scheme.",
        "Android also needs `ph://`, but falls back to `content://` when PhotoKit isn't available.",
      ],
      answer: 0,
      explain:
        "The grid only needs a thumbnail, and expo-image understands PhotoKit local identifiers. `AssetCell` adds `allowDownscaling` and `cachePolicy=\"memory\"`, so a 5,000-photo library stays at flat memory. The expensive `resolveLibraryAsset` (`asset.getInfo()` plus EXIF) runs only on an explicit Edit, Add or Share, as its doc comment requires. The platform difference is real: iOS ids are PHAsset identifiers, and Android ids are already loadable URIs.",
    },
    {
      id: "camera-social-21",
      type: "text",
      level: 2,
      topics: ["Media", "Permissions", "Platform Differences"],
      files: [
        "src/projects/camera-social/hooks/useAssets.ts",
        "src/projects/camera-social/components/library/LimitedAccessBanner.tsx",
      ],
      prompt:
        "`useAssets` decides whether to show the iOS **Limited access · Manage** banner from one field on the media-library permission response. That field has the value `\"limited\"` when the user only shared some photos. Name the field.",
      accept: ["accessPrivileges", "permission.accessPrivileges"],
      explain:
        "`const limited = permission?.accessPrivileges === \"limited\";`. In limited mode `granted` is still `true`, so checking `granted` alone would hide the fact that most of the library is invisible. `manageLimitedAccess()` calls `MediaLibrary.presentPermissionsPicker()` and then `refresh()`, and `MediaLibrary.addListener` also refreshes when the selection changes. The empty state switches its wording to \"No photos shared with this app yet.\"",
    },
    {
      id: "camera-social-22",
      type: "multi",
      level: 2,
      topics: ["Gesture Handler"],
      files: [
        "src/app/projects/camera-social/post/[id].tsx",
        "src/projects/camera-social/components/viewer/ZoomableImage.tsx",
        "src/projects/camera-social/components/viewer/DismissibleContainer.tsx",
      ],
      prompt:
        "The post viewer stacks three gesture owners: a horizontal pager, a pinch-zoom image, and drag-down-to-dismiss. Select all the mechanisms that stop them from fighting.",
      choices: [
        "`ZoomableImage`'s pan uses `manualActivation(true)`: at 1× it calls `manager.fail()`, and it only `activate()`s when zoomed in",
        "The `FlatList` pager has `scrollEnabled={!zoomed}`, fed by `onZoomChange`",
        "`DismissibleContainer` is `enabled={!zoomed}`, activates after 14 px down (`activeOffsetY`) and fails beyond 18 px sideways (`failOffsetX`)",
        "Double-tap and single-tap are combined with `Gesture.Exclusive`, so a double-tap never also fires the single tap",
        "All image gestures are wrapped in `Gesture.Race`, so pinch and pan can never run together",
        "The pager is a FlashList with `pagingEnabled`, which yields to child gestures automatically",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "The approach is to decide who owns the touch based on state. At 1×, horizontal swipes belong to the pager and vertical drags to the dismiss container, so the image's pan steps aside. Once zoomed, the image claims the pan and the other two are switched off from JS. `ZoomableImage` uses `Gesture.Simultaneous(pinch, pan, Exclusive(doubleTap, singleTap))`, which is the opposite of a Race, so you can pinch and pan at the same time. The pager is a plain `FlatList` with `getItemLayout` and `initialScrollIndex`.",
    },
    {
      id: "camera-social-23",
      type: "mcq",
      level: 2,
      topics: ["Deep Linking", "Testing"],
      files: [
        "src/projects/camera-social/utils/linkRewrite.ts",
        "src/projects/camera-social/__tests__/linkRewrite.test.ts",
        "src/app/+native-intent.tsx",
      ],
      prompt:
        "What does `rewriteCameraSocialPath(\"/projects/camera-social/post/abc\", DOMAIN)` return, and why is that correct?",
      choices: [
        "`null`. The custom-scheme path already matches a real route, so no rewriter matches and `redirectSystemPath` returns the path unchanged.",
        "`\"/projects/camera-social/post/abc\"`, because the rewriter normalizes every post path to the namespaced form",
        "`SHARE_INBOUND_ROUTE`, because any camera-social path without a post id goes to the inbound screen",
        "It throws, and the `try/catch` in `+native-intent.tsx` swallows the error",
      ],
      answer: 0,
      explain:
        "The rewriter only handles URL shapes that **aren't** routes: the share-extension callback (`dataUrl=` goes to the inbound screen) and the universal link `https://<linkDomain>/post/<id>` (goes to `/projects/camera-social/post/<id>`). The test \"leaves other hosts, projects and malformed ids alone\" includes exactly this input. Returning `null` means \"not mine\", so `+native-intent` tries the store rewriter (which needs an `https://` host) and then falls back to `return path`. Foreign hosts and ids failing `/^[A-Za-z0-9_-]+$/` (such as `a%20b`) are also rejected, so an attacker-crafted link can't inject an odd route.",
    },
    {
      id: "camera-social-24",
      type: "explain",
      level: 2,
      topics: ["Deep Linking", "Platform Differences", "Architecture"],
      files: [
        "src/app/_layout.tsx",
        "src/app/+native-intent.tsx",
        "src/projects/camera-social/hooks/useInboundShareRouting.ts",
        "src/app/projects/camera-social/share-inbound.tsx",
        "app.config.ts",
      ],
      prompt:
        "Trace a photo shared from another app into Why-Not-ReactNative, on iOS and on Android. Explain:\n\n- why both the `dataUrl=` rewrite in `+native-intent.tsx` **and** `useInboundShareRouting` exist\n- why `ShareIntentProvider` sits in the **root** layout with `resetOnBackground: false`\n- why `share-inbound.tsx` calls `share.reset()` after importing",
      model:
        "On iOS the expo-share-intent share extension opens the app with a URL like `whynotreactnative://dataUrl=…ShareKey`. That isn't a route, so `rewriteCameraSocialPath` sends it to `/projects/camera-social/share-inbound`, where the provider reads the payload from the native module. On Android a share is a SEND **intent**, not a URL, so `+native-intent` never sees it. Instead `useInboundShareRouting` (mounted at the root through the `ShareIntentRouting` component) watches `hasShareIntent` and pushes the inbound route from wherever the user is. The provider must be at the root because a share can arrive while the user is in the launcher or another project, before the camera-social layout has ever mounted. `resetOnBackground: false` keeps the payload alive until it has been imported, instead of dropping it when the app is backgrounded. After import (or discard) the screen calls `share.reset()`. Otherwise `hasShareIntent` stays true, and the routing effect would push the inbound screen again the next time the pathname changes.",
      rubric: [
        "iOS uses a URL callback (`dataUrl=`) rewritten by `+native-intent`; Android uses an intent that only the hook can catch",
        "The provider and routing hook live at the root because shares arrive regardless of which project is open",
        "`resetOnBackground: false` keeps the share until it has been imported",
        "`reset()` clears `hasShareIntent`, so the effect doesn't re-open the inbound screen",
        "Importing copies the files out of the extension's shared container through the normal ingest (origin `\"share\"`)",
      ],
      explain:
        "Inbound sharing reaches the app through two different paths, a URL on iOS and an intent on Android, so it needs two handlers that send the user to one screen. The pure rewriter is unit-tested in `linkRewrite.test.ts`, and the hook is a thin effect in `useInboundShareRouting.ts`. The config side, in `app.config.ts`, is the `expo-share-intent` plugin with `iosActivationRules` and `androidIntentFilters` for `image/*` and `video/*`.",
    },
    {
      id: "camera-social-25",
      type: "text",
      level: 2,
      topics: ["Media", "React Compiler"],
      files: [
        "src/projects/camera-social/components/viewer/TrimmedVideoView.tsx",
        "src/projects/camera-social/components/editor/VideoTrimEditor.tsx",
      ],
      prompt:
        "Trim is stored as metadata (`trim_start_ms`, `trim_end_ms`), so the expo-video player has to enforce it. Outside the `useVideoPlayer` setup callback, both video components avoid `player.currentTime = x`. Which **player method** do they call to jump back to the trim start?",
      accept: ["seekBy", "player.seekBy", "seekBy()"],
      explain:
        "`player.seekBy(to - currentTime)` runs inside a `timeUpdate` listener (`useEventListener(player, \"timeUpdate\", …)`), and `timeUpdateEventInterval` sets how often it fires (0.25 s in the viewer, 0.1 s in the editor). The viewer also calls it from `playToEnd`, because it loops by hand instead of using native `loop`. Assigning `currentTime` outside setup would mutate a value a hook returned, which the React Compiler forbids. `seekBy` is the same native seek, so it does the same job. Inside the setup callback `p.currentTime = start` is fine, because `p` is a callback parameter, not a hook's return value.",
    },
    {
      id: "camera-social-26",
      type: "order",
      level: 2,
      topics: ["Media", "Skia"],
      files: [
        "src/projects/camera-social/editor/applyOperations.ts",
        "src/projects/camera-social/editor/nativeDeps.ts",
      ],
      prompt:
        "Put the steps of `applyOperations(source, ops, deps)` in order. It runs when the user taps **Save** on a photo edit.",
      items: [
        "Reduce the op list to one `ResolvedEdit` with `resolveOperations`",
        "Rotate with the manipulator (if `rotation !== 0`)",
        "Flip horizontally and/or vertically (if set)",
        "Crop using `cropToPixels(edit.crop, orientedSize(source, rotation))`",
        "Render and save a JPEG at `EXPORT_QUALITY` (0.92)",
        "Bake the color matrix with Skia, only if it isn't the identity",
      ],
      explain:
        "Geometry runs in the canonical order `crop(flip(rotate(source)))`, the same order the Skia preview uses, so the preview matches the output. The crop's pixel rect is computed against the **rotated** dimensions (`orientedSize`), because the normalized rect describes the image as displayed after rotation. Each stage is skipped when it isn't needed (`hasGeometry`, `isIdentity`), so a pure color edit never re-encodes geometry. A no-op edit returns the source URI unchanged, which the editor checks with `result.uri === source.uri`.",
    },
    {
      id: "camera-social-27",
      type: "multi",
      level: 2,
      topics: ["FlashList", "Performance"],
      files: [
        "src/projects/camera-social/components/library/AssetGrid.tsx",
        "src/projects/camera-social/components/library/AssetCell.tsx",
        "src/app/projects/camera-social/(tab)/index.tsx",
        "src/projects/camera-social/components/feed/CaptureCell.tsx",
      ],
      prompt:
        "Select all the statements that are true about how this slice uses FlashList.",
      choices: [
        "`AssetGrid` passes `extraData={{ selectedIds, selecting }}` so recycled, memoized cells re-render when the selection changes",
        "`AssetCell` sets expo-image's `recyclingKey={id}` so a recycled view doesn't flash the previous asset while the new thumbnail decodes",
        "The feed uses `masonry` with `numColumns={2}`, and `CaptureCell` clamps each cell's aspect ratio to 0.6–1.6",
        "The post viewer's horizontal pager is also a FlashList",
        "Feed cells render the full-resolution original so the iOS zoom transition looks sharp",
      ],
      answer: [0, 1, 2],
      explain:
        "FlashList recycles views. A cell that scrolls out is reused for a different item, so anything identity-dependent needs care. `recyclingKey` resets expo-image's content, and `extraData` tells the list that data outside `data` changed (`renderItem` reads `selectedIds`, and `AssetCell` is `memo`'d). Clamping the masonry ratio stops panoramas from breaking the layout. The feed always renders `thumbUri` (~400 px). The post pager is a `FlatList` with `pagingEnabled`.",
    },
    {
      id: "camera-social-28",
      type: "explain",
      level: 2,
      topics: ["Reanimated", "Gesture Handler", "React Hooks"],
      files: [
        "src/projects/camera-social/components/editor/AdjustSlider.tsx",
        "src/app/projects/camera-social/editor/[assetId].tsx",
      ],
      prompt:
        "Follow a Brightness drag from `AdjustSlider` to the editor history. Explain why the thumb position is a **shared value** driven by a pan gesture, and why `PhotoEditor` keeps `draftAdjust` / `draftIntensity` instead of calling `history.push` on every `onChange`.",
      model:
        "`AdjustSlider` uses `Gesture.Pan().minDistance(0)`. Its `onBegin` and `onUpdate` callbacks run on the UI thread and write the thumb's `x` shared value, so the thumb tracks the finger at frame rate even if JS is busy. Each frame it also sends the numeric value to JS with `scheduleOnRN(onChange, v)`, and on release `onFinalize` sends `onCommit` once. In `PhotoEditor`, `onChange` only sets `draftAdjust`, which feeds `previewEdit` and the memoized color matrix, so the Skia preview updates live. `onCommit` clears the draft and pushes exactly one `{ type: \"adjust\" }` op. If every change were pushed, one drag would create dozens of undo steps and re-resolve the whole op list each frame. When not dragging, the thumb follows the external `value`, so undo and redo move it back.",
      rubric: [
        "Thumb movement happens on the UI thread through shared values, so it doesn't need React renders",
        "`onChange` goes to JS through `scheduleOnRN` for the live preview only",
        "Draft state drives the preview; only `onCommit` pushes one history op",
        "Pushing per change would flood the undo stack with dozens of steps per drag",
        "When idle, the slider follows the external value so undo and redo are reflected",
      ],
      explain:
        "The live-versus-committed split is the general pattern for any continuous control backed by an undo stack: preview the draft, commit on release. The slider comment states the same contract (\"Fires while dragging\" and \"Fires once on release (pushes one undo step)\"), and the editor comment says \"Slider drags preview live without pushing forty undo steps.\"",
    },

    // ───────────────────────────── Level 3 ─────────────────────────────
    {
      id: "camera-social-29",
      type: "mcq",
      level: 3,
      topics: ["React Hooks", "Testing"],
      files: [
        "src/projects/camera-social/editor/history.ts",
        "src/app/projects/camera-social/editor/[assetId].tsx",
        "src/projects/camera-social/__tests__/history.test.ts",
      ],
      prompt:
        "In the Adjust tool, the user drags **Brightness** to +0.4 and releases, then drags **Contrast** to +0.3 and releases. They tap **Undo** once. What does the photo look like?",
      choices: [
        "Only contrast goes back to 0; brightness stays at +0.4.",
        "Brightness and contrast both go back to 0. The reducer merged the two consecutive `adjust` ops into one undo step.",
        "Nothing changes, because `draftAdjust` is still set and hides the undo.",
        "Brightness goes back to 0, but contrast stays at +0.3.",
      ],
      answer: 0,
      explain:
        "Each commit pushes `{ type: \"adjust\", values: { ...current, [key]: v } }`, the full adjustment set, so an op doesn't say which slider moved. `mergesWithLast` in `history.ts` works that out: it compares the last op's values with the adjust state before it (the previous adjust op, or `NEUTRAL_ADJUST`) to find the single key it changed, and merges only if the new op changes nothing but that key. Contrast is a different key, so the push appends: `[adjust{b:.4}, adjust{b:.4,c:.3}]`, cursor 2. Undo moves the cursor to 1, which resolves to brightness +0.4 and contrast 0. A second Brightness drag straight after the first would replace it instead, so each control gets one undo step per run of edits. Filters follow the same rule by `name`. The tests \"keeps different adjust sliders as separate undo steps\" and \"collapses repeated drags of one adjust slider into one step\" in `history.test.ts` cover both cases.",
    },
    {
      id: "camera-social-30",
      type: "mcq",
      level: 3,
      topics: ["Media", "Testing"],
      files: [
        "src/projects/camera-social/editor/operations.ts",
        "src/projects/camera-social/__tests__/operations.test.ts",
      ],
      prompt:
        "`resolveOperations([{ type: \"flip\", axis: \"horizontal\" }, { type: \"rotate\", degrees: -90 }])`: what canonical edit comes out?",
      choices: [
        "`rotation: 270, flipH: false, flipV: true`",
        "`rotation: 270, flipH: true, flipV: false`",
        "`rotation: -90, flipH: true, flipV: false`",
        "`rotation: 90, flipH: false, flipV: true`",
      ],
      answer: 0,
      explain:
        "The canonical form is `crop(flip(rotate(source)))`, with rotation always applied first. The user flipped first, so the flip has to move after the rotation, and a horizontal mirror followed by a ±90° turn equals the turn followed by a **vertical** mirror. That's why the `rotate` case swaps `flipH`/`flipV`. Rotation is normalized with `((r + d) % 360 + 360) % 360`, so -90 becomes 270. The crop rect is carried along too (`rotateRect`/`flipRect`) so it stays on the same pixels. The test \"swaps flip axes when rotating\" checks exactly this case.",
    },
    {
      id: "camera-social-31",
      type: "order",
      level: 3,
      topics: ["Skia"],
      files: [
        "src/projects/camera-social/editor/colorMatrix.ts",
        "src/projects/camera-social/components/editor/EditPreview.tsx",
      ],
      prompt:
        "`multiply(a, b)` is documented as \"a ∘ b, apply `b` first, then `a`\". Given how `buildColorMatrix` composes its matrices, in what order are the color transforms effectively applied to a pixel?",
      items: [
        "Filter matrix, interpolated from identity by `intensity`",
        "Saturation (`1 + adjust.saturation`)",
        "Contrast",
        "Brightness offset",
      ],
      explain:
        "`buildColorMatrix` returns `multiply(adjustMatrix, filterMatrix)`, so the filter is applied first. `adjustMatrix = multiply(brightness, multiply(contrast, saturation))`, so saturation runs first, then contrast, then brightness. Composing everything into **one** 4×5 matrix means the GPU runs a single `<ColorMatrix>` in the preview and a single `ColorFilter.MakeMatrix` pass on export, never three passes. Order matters because matrix multiplication doesn't commute: brightening before raising contrast gives a different result than the reverse.",
    },
    {
      id: "camera-social-32",
      type: "multi",
      level: 3,
      topics: ["Media", "React Hooks", "Zustand"],
      files: [
        "src/projects/camera-social/hooks/useCapture.ts",
        "src/projects/camera-social/stores/captureStore.ts",
      ],
      prompt:
        "Ten fast taps on the shutter in `useCapture.takePhoto`. Select all the statements that are true.",
      choices: [
        "The `takePictureAsync` calls are chained on `queue.current` so they never overlap, because the native session rejects concurrent capture requests",
        "The promise `takePhoto` returns resolves once the sensor has the frame, before copy, thumbnail and DB work finish",
        "`queue.current = shot.catch(() => undefined)` stops one failed capture from rejecting every later capture in the chain",
        "`failCapture` decrements `pending` so the spinner on the last-shot button doesn't spin forever after an error",
        "Ingest is also serialized on the queue, so two `INSERT`s can never run at the same time",
        "`pending` lives in a persisted Zustand store, so in-flight captures survive an app restart",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "The design principle is \"the shutter only waits for the sensor, never for disk\". Only the sensor calls are serialized. Each `shot.then(ingestPhoto…)` branches off its own `shot`, so ingests can overlap, and SQLite/WAL handles concurrent inserts. Without the `.catch` on the queue link, a rejected promise would short-circuit every later `.then` and the camera would stop working until remount. `useCaptureStore` is a plain `create()` with no `persist`: it holds transient session UI state, while durable data lives in SQLite.",
    },
    {
      id: "camera-social-33",
      type: "multi",
      level: 3,
      topics: ["Gesture Handler", "Reanimated"],
      files: [
        "src/projects/camera-social/components/editor/CropOverlay.tsx",
        "src/projects/camera-social/editor/cropMath.ts",
      ],
      prompt: "Select all the statements that are true about `CropOverlay`.",
      choices: [
        "Pinch, pan and rotation are combined with `Gesture.Simultaneous`, so you can do all three at once",
        "On release, the pan uses `withDecay({ velocity, clamp: [-m.x, m.x] })` so momentum stops at the frame edge instead of overshooting",
        "A rotation past π/4 calls `onRotate(±90)` through `scheduleOnRN` and springs the visual tilt back to 0",
        "The crop rect is sent to JS on every pan frame so the parent always has the current rect",
        "The corner resize handle also works for fixed presets such as 1:1",
        "Only a normalized `NormRect` leaves the component; screen coordinates never reach the manipulator",
      ],
      answer: [0, 1, 2, 5],
      explain:
        "Every frame is clamped on the UI thread with worklet-safe helpers (`clampScale`, `clampTranslate`), so the image can never leave a gap inside the frame. `emitCurrent` only sends the rect on `onEnd`, and again once **both** momentum axes have settled (`onAxisSettled` counts the two decays down, stamped with a per-pan id so callbacks from a replaced decay are ignored), not per frame. The resize pan is `.enabled(aspect == null)`, and the handle only renders for free-form crops. `cropRectFromTransform` turns the transform into a resolution-independent 0..1 rect, the same rect `applyOperations` scales to full-resolution pixels.",
    },
    {
      id: "camera-social-34",
      type: "mcq",
      level: 3,
      topics: ["Media", "React Hooks"],
      files: ["src/projects/camera-social/hooks/useAssets.ts"],
      prompt:
        "In the Library tab, a page of **Recents** is still loading when the user picks another album. What stops the late Recents page from being added to the new album's grid?",
      choices: [
        "The `generation` ref. A reset increments `generation.current`, and when the old `await` resolves, `gen !== generation.current`, so it returns without touching state.",
        "The `inFlight` ref blocks the new album's request until the old one finishes.",
        "`MediaLibrary.Query` cancels the previous query when a new one starts.",
        "The `useEffect` cleanup aborts the old promise with an `AbortController`.",
      ],
      answer: 0,
      explain:
        "This is the \"generation token\" pattern for async races. The album-change effect deliberately clears `inFlight` and starts a reset fetch, so both requests are briefly in flight. Only the stamp comparison decides which result wins. Promises in JS can't be cancelled, and nothing here uses `AbortController`, so the stale result has to be ignored. Refs are the right tool because the check must see the latest value, not a value captured at render time. The same stamp guards `catch` and `finally`: a superseded request doesn't set `error`, and only the current generation clears `inFlight` and `loading`. Without that check the stale request's `finally` would clear both flags while the newer request is still running, so the spinner would vanish early and `loadMore` could start a second, overlapping page.",
    },
    {
      id: "camera-social-35",
      type: "mcq",
      level: 3,
      topics: ["Testing", "Architecture"],
      files: [
        "src/projects/camera-social/editor/applyOperations.ts",
        "src/projects/camera-social/editor/nativeDeps.ts",
        "src/projects/camera-social/__tests__/applyOperations.test.ts",
      ],
      prompt:
        "`applyOperations` takes an `ApplyDeps` argument and types the manipulator as a structural `ManipulatorContextLike`, instead of importing `expo-image-manipulator` and Skia directly. What does that design buy?",
      choices: [
        "The pure pipeline runs in Jest with a recording mock, so the test can check the exact call sequence (manipulate → rotate → flip → crop → render → save → color). `nativeDeps.ts` adapts the real APIs.",
        "TypeScript 6 can't type-check `expo-image-manipulator` imports in non-component files.",
        "It lets the editor run on the web, where Skia isn't available.",
        "Structural types are erased differently, which makes the export faster at runtime.",
      ],
      answer: 0,
      explain:
        "This is dependency injection through a structural type. `makeDeps()` in the test pushes every call into `calls` and asserts, for example, that a crop of the top-left quadrant followed by rotate 90 and flip H becomes `crop { originX: 0, originY: 0, width: 1500, height: 2000 }` on the rotated 3000×4000 image. `wrap()` in `nativeDeps.ts` adapts the real context and also calls `release()` on native objects. Native modules don't load under Jest, so without the seam this logic would only be testable on a device.",
    },
    {
      id: "camera-social-36",
      type: "text",
      level: 3,
      topics: ["Skia"],
      files: ["src/projects/camera-social/editor/nativeDeps.ts"],
      prompt:
        "`applyColorMatrix` in `nativeDeps.ts` decodes the JPEG with `Skia.Image.MakeImageFromEncoded`, draws it onto an offscreen surface with a paint, and encodes the snapshot. Which factory method on `Skia.ColorFilter` turns the 20-number matrix into the paint's GPU color filter?",
      accept: ["MakeMatrix", "ColorFilter.MakeMatrix", "Skia.ColorFilter.MakeMatrix"],
      explain:
        "`paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix))`, then `drawImageRect` on `Skia.Surface.MakeOffscreen`, then `makeImageSnapshot().encodeToBytes(JPEG, 92)`. The only bytes that reach JS are the **encoded** JPEG on its way to `scratchFile`. Raw pixels never do, which matters a lot for a 48 MP photo. One trade-off is deliberate: `MAX_SURFACE_EDGE = 4096` caps the color pass, because `MakeOffscreen` allocates a GPU render target limited by the device's max texture size (as low as 4096 on older Android GPUs), and a 48 MP image costs ~190 MB per RGBA copy. A color-filtered 48 MP export is therefore 4096 px on the long edge, and the returned size is the real one. `applyOperations` skips the pass entirely when `isIdentity(matrix)`, so geometry-only saves keep full resolution.",
    },
    {
      id: "camera-social-37",
      type: "explain",
      level: 3,
      topics: ["File System", "Media"],
      files: [
        "src/app/projects/camera-social/editor/[assetId].tsx",
        "src/projects/camera-social/media/ingest.ts",
        "src/projects/camera-social/media/storage.ts",
        "src/projects/camera-social/hooks/useCapture.ts",
      ],
      prompt:
        "Turn on **Save captures to gallery**, edit a camera photo, and tap Save. `PhotoEditor.save` calls `ingestPhoto(db, { uri: result.uri, …, ownsFile: true })`, then re-reads the new row with `getCapture(db, id)` and passes `saved.uri` to `saveToGallery`. Explain:\n\n- why it can't simply call `saveToGallery(result.uri)`\n- why the gallery error goes to `alertError` instead of an empty `.catch`\n- why `router.replace` to the new post still runs when the gallery save fails",
      model:
        "`applyOperations` returns a temp file (manipulator output or a Skia `scratchFile` in the cache). Because `ownsFile: true` is set and a camera photo's stored EXIF is already upright, `normalizeOrientation` returns null and `ingestPhoto` calls `moveIntoMedia(input.uri, ext)`, which runs `src.moveSync(dest)` and moves the file into `Documents/camera-social/originals`. After ingest, `result.uri` points to nothing, and `MediaLibrary.Asset.create` would fail. So the editor does what `useCapture.afterIngest` does: it looks the row up by id and uses `capture.uri`, which is resolved from the stored relative path. (When orientation normalization does run, a different file is moved and `result.uri` survives, so saving the temp path would only fail some of the time, which is another reason to always read the stored location.) An empty `.catch(() => undefined)` would turn any failure, such as a denied permission or a missing file, into a silent no-op for a setting the user turned on; `alertError(\"Saved, but not to your gallery\", e)` tells them. By then the edit is already stored in the app, so a gallery failure isn't a save failure. The catch wraps only the gallery call, so navigation continues. The outer `catch` is different: it keeps the editor open with \"Couldn't save\".",
      rubric: [
        "`ownsFile: true` leads to `moveIntoMedia`/`moveSync`, so the temp `result.uri` is gone after ingest",
        "The stored capture's `uri` (via `getCapture`) is the file's real location, the same pattern as `afterIngest`",
        "An empty catch would hide failures of a setting the user turned on; `alertError` surfaces them",
        "The gallery catch is local, so a gallery failure doesn't block or undo the edit that is already saved",
        "Edge case: when orientation normalization runs, a new file is moved and `result.uri` survives, so the temp path would only fail sometimes",
      ],
      explain:
        "Move versus copy is an ownership hand-off: once ingest owns the file, the caller's URI is stale, and the only location you can trust is the one ingest recorded. `useCapture.afterIngest` and the editor both follow that rule. The camera path keeps a commented, best-effort empty catch instead, because an alert per shot during rapid capture would get in the way; the editor saves one photo on an explicit tap, so it can afford to tell the user.",
    },
    {
      id: "camera-social-38",
      type: "explain",
      level: 3,
      topics: ["React Hooks", "SQLite", "Zustand", "Architecture"],
      files: [
        "src/projects/camera-social/hooks/useSettings.ts",
        "src/projects/camera-social/stores/settingsStore.ts",
        "src/projects/camera-social/__tests__/settings.test.ts",
        "src/app/projects/camera-social/(tab)/profile.tsx",
        "src/app/projects/camera-social/camera.tsx",
      ],
      prompt:
        "`useSettings()` reads a Zustand store (`stores/settingsStore.ts`) that is hydrated once from SQLite. `update(patch)` applies `patchSettings` to the store and only then calls `setSetting` with `useSettingsStore.getState().settings`. The Profile tab and the camera's quick-settings panel both use it. Suppose each `useSettings()` call kept its own `useState` copy instead. Describe a tap sequence that would lose a change, then explain how each part of the real design prevents it: the shared store, the write outside the state updater, and the `pending` field.",
      model:
        "With per-hook state: open the Profile tab once, and bottom tabs keep it mounted. Open the camera (a full-screen modal above the tabs) and turn Haptics off; the camera's copy writes `{…, haptics: false}`. Back on Profile, its own copy still says `haptics: true`. Toggling Keep EXIF there merges into that stale copy and writes the whole blob, which turns haptics back on. Two copies, last writer wins. The store leaves one copy: both screens subscribe with `useSettingsStore((s) => s.settings)`, so the camera's change re-renders Profile straight away, and `patchSettings` spreads each patch over the latest `state.settings`. The blob is still written whole, but it is always built from the single latest state, so no key can be reverted. The write runs after `setState`, reading `getState()`, because a state updater must be pure: StrictMode calls updaters twice, and a side effect inside one can double-write or write a stale value. Hydration runs once per database connection (`hydratedFrom`), not once per hook instance. Until it finishes, `hydrated` is false and `update` doesn't write, since writing defaults plus the patch would overwrite the stored blob. Patches made in that window go into `pending`; `hydrateSettings` lays them over the loaded values, and the merged result is then written.",
      rubric: [
        "Per-hook state: a mounted tab keeps a stale copy, and its whole-blob write reverts keys another screen changed",
        "One store shared by every caller, so all screens see the latest values and each patch merges per key into them",
        "The SQLite write runs outside the updater, from `getState()`, because updaters must be pure (StrictMode calls them twice)",
        "Writes wait for hydration; `pending` keeps early changes and `hydrateSettings` applies them over the stored blob",
        "Hydration happens once per database connection, not per hook instance",
      ],
      explain:
        "A hook that wraps persistent state isn't shared state, because every call site gets its own copy. Lifting it into a module-level store makes it shared, while SQLite stays the durable copy. The pure helpers (`parseSettings`, `patchSettings`, `hydrateSettings`) are covered in `settings.test.ts`. Compare `useCapturesQuery`, which keeps screens consistent a different way: every instance listens for database changes.",
    },
    {
      id: "camera-social-39",
      type: "explain",
      level: 3,
      topics: ["Media"],
      files: [
        "src/projects/camera-social/components/viewer/TrimmedVideoView.tsx",
        "src/projects/camera-social/utils/trim.ts",
        "src/projects/camera-social/__tests__/trim.test.ts",
        "src/app/projects/camera-social/editor/[assetId].tsx",
      ],
      prompt:
        "`TrimmedVideoView` sets `p.loop = false` in its `useVideoPlayer` setup and loops by hand: the `timeUpdate` and `playToEnd` listeners both ask `trimLoopSeek(…)` where to seek. `VideoTrimScreen.save` stores the trim end as `null` when the right handle stays at the end of the clip. Walk through a clip with `trimStartMs = 3000` and `trimEndMs = null`. What happens at the end of the clip, and what would go wrong if the setup used `p.loop = end == null` instead?",
      model:
        "Setup seeks to 0:03 (`p.currentTime = start` is fine there, because `p` is the callback parameter). During playback, `timeUpdate` calls `trimLoopSeek(currentTime, 3, null)`, which returns null because there is no end trim, so nothing happens. Native looping is off, so the player really stops at the end of the file and `playToEnd` fires. `trimLoopSeek(…, true)` returns 3, the handler seeks back with `seekBy(3 - currentTime)` and calls `play()` again if the page is still `active`. Every loop starts at 0:03. With `p.loop = end == null`, this clip would get native looping, which always restarts at 0:00. The first play would start at 0:03, but every later loop would replay the three seconds the user trimmed away, and the `timeUpdate` check couldn't catch it because it only acts on an end trim. Clips with an end trim would still be fine, since `timeUpdate` seeks back to `start` before the file ends. The cost of looping by hand is a tiny hitch at the loop point, even for untrimmed clips. The gain is one code path that respects the start for every combination of null and non-null start and end.",
      rubric: [
        "`timeUpdate` only acts when there is an end trim (`trimLoopSeek` returns null otherwise)",
        "With no end trim, `playToEnd` is the loop point, and it seeks to `start`, not 0",
        "Native `loop` restarts at 0:00, so it would replay the trimmed head when only the start is trimmed",
        "Seeks go through `seekBy`, and `play()` only resumes when the page is `active`",
        "The decision lives in the pure `utils/trim.ts` and is unit-tested in `trim.test.ts`",
      ],
      explain:
        "Non-destructive trim means every player enforces the window itself, and each combination of null start and end needs a code path. Moving the decision into a pure `trimLoopSeek` makes those cases testable; `trim.test.ts` includes \"loops to the trim start, not 0:00, when only the start is trimmed\". `VideoTrimEditor` has its own `timeUpdate` handler that always loops inside `range`, which works there because its range always has an end.",
    },
    {
      id: "camera-social-40",
      type: "explain",
      level: 3,
      topics: ["Skia", "Architecture", "Testing"],
      files: [
        "src/projects/camera-social/editor/operations.ts",
        "src/projects/camera-social/components/editor/EditPreview.tsx",
        "src/projects/camera-social/editor/nativeDeps.ts",
        "src/projects/camera-social/editor/editBase.ts",
        "src/projects/camera-social/__tests__/operations.test.ts",
      ],
      prompt:
        "The editor promises that \"preview ≠ output\" bugs are designed out, even though the preview draws a ≤1600 px proxy with Skia on the GPU and the export runs expo-image-manipulator on the full-resolution file. Explain the mechanisms that make this hold, and why re-editing an already edited photo doesn't stack JPEG generations.",
      model:
        "The editor never changes pixels while you work. It appends plain `Op`s, and both consumers derive from the same list through `resolveOperations`, which reduces it to one canonical edit, `crop(flip(rotate(source)))`. The preview turns that into `previewSteps`, applied as a Skia `<Group transform>`. The export runs manipulator `rotate → flip → crop` in the same order. The crop is a **normalized** 0..1 rect, so it is resolution-independent: the 1600 px proxy (`makePreviewProxy`) and the full-size original map onto it the same way, and `cropToPixels` only turns it into integers at export time. Color is a single `buildColorMatrix` result, used in the preview's `<ColorMatrix>` and the export's `ColorFilter.MakeMatrix`. Tests pin this down: `operations.test.ts` maps source corners through `applySteps` and checks they land on the canvas, and `applyOperations.test.ts` checks the call order. For re-editing, the derived row stores `source_id` and the `operations` JSON. `pickEditBase` reopens the untouched original with those ops back on the undo stack, so each save is one encode from the original instead of a JPEG of a JPEG.",
      rubric: [
        "A single op list, reduced by `resolveOperations` into one canonical order shared by preview and export",
        "The normalized crop rect makes proxy resolution irrelevant; pixels are computed only at export",
        "The same color matrix is used for the Skia preview and the export",
        "Tests on `previewSteps`/`applySteps` and the `applyOperations` call sequence enforce it",
        "`source_id` + stored `operations` + `pickEditBase` mean re-edits start from the original",
      ],
      explain:
        "Keeping one source of truth and having every renderer derive from it is the general cure for divergence between preview and output. Here that source is `Op[]`, persisted, so the same idea also gives non-destructive re-editing. The fallback in `pickEditBase` (original deleted, so edit the derivative with an empty history) is tested in `editBase.test.ts`.",
    },
  ],
});

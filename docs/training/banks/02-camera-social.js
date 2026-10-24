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
        "In the Camera & Social stack layout, the `editor/[assetId]` route is a `fullScreenModal` with `gestureEnabled: false`. Why turn the dismiss gesture off for this one screen?\n\nSearch first: Open `src/app/projects/camera-social/_layout.tsx` and read the comment above `gestureEnabled`, then check the Expo Router Stack docs for who provides this option.",
      choices: [
        "The crop overlay's pinch, pan and rotate gestures cover the whole screen. A swipe-to-dismiss would compete with them and could close the editor halfway through a crop.",
        "On Android, `fullScreenModal` crashes when gestures are on, so every full-screen modal needs it off.",
        "Expo Router requires `gestureEnabled: false` on any route with a dynamic segment such as `[assetId]`.",
        "It stops the React Compiler from re-memoizing the editor while the modal animates in.",
      ],
      answer: 0,
      explain:
        "The comment beside the option gives the intent: the crop gestures own the whole screen. `CropOverlay` places a `Gesture.Simultaneous(pinch, pan, rotation)` detector over the stage, so the native modal's swipe-to-dismiss would compete with it and could close the editor mid-crop. Dynamic segments have nothing to do with gestures, and `fullScreenModal` is not unsafe on Android; this is a per-screen decision.\n\n**Takeaway.** Presentation and gesture options belong in the project layout's `Stack.Screen`, because Expo Router has no route-level `options` export. The camera and editor are modals above the tabs, while `post/[id]` switches presentation by platform (see `supportsZoomTransition`). Turning the swipe off removes a convenience, so the editor must provide its own exit: the cancel button with a \"Discard edits?\" alert, which also protects unsaved work.\n\nYou meet this in docs/02-camera-social.html under **How it sits in the launcher** and milestone **M0**, where you declare the Stack screens.",
      links: [
        { title: "Expo Router: Stack", url: "https://docs.expo.dev/router/advanced/stack/" },
        { title: "Expo Router: modals", url: "https://docs.expo.dev/router/advanced/modals/" },
        { title: "Gesture Handler: gesture composition", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/" },
      ],
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
        "The project layout wraps everything in `<SQLiteProvider databaseName=\"camera-social.db\" … useSuspense>`. Which **prop name** on `SQLiteProvider` runs `migrate`, so that no screen can query the database before the schema exists?\n\nSearch first: Open the project layout and `db/schema.ts`; find the `SQLiteProvider` props in the expo-sqlite docs and identify the one that runs your migration function.",
      accept: ["onInit", "onInit={migrate}"],
      explain:
        "`onInit={migrate}` runs once when the database opens. With `useSuspense`, the provider suspends until `onInit` finishes and the surrounding `<Suspense fallback={<Booting />}>` shows a spinner, so `useSQLiteContext()` in any child always receives a migrated database. There is no window in which a screen can query a table that does not exist yet.\n\n**Takeaway.** The project owns its file (`DATABASE_NAME = \"camera-social.db\"`) because projects in this launcher never share a database; each runs its own `PRAGMA user_version` migrations. The provider also sets `enableChangeListener`, which the live-query hooks depend on later. If you ran the migration in a screen's effect instead, the first render would race it and a fresh install would crash on `no such table`.\n\nYou derive this in milestone **M0** (\"Dev build and the project slice\") and see the data model under **Architecture** in docs/02-camera-social.html.",
      links: [
        { title: "expo-sqlite API reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
        { title: "SQLite: PRAGMA user_version", url: "https://sqlite.org/pragma.html#pragma_user_version" },
        { title: "SQLite: write-ahead logging", url: "https://sqlite.org/wal.html" },
      ],
    },
    {
      id: "camera-social-03",
      type: "mcq",
      level: 1,
      topics: ["Permissions", "Media"],
      files: ["src/projects/camera-social/components/PermissionGate.tsx"],
      prompt:
        "`PermissionGate` gets this permission response for the camera. Which state does `gateState()` return, and what does the user see?\n\nSearch first: Open `components/PermissionGate.tsx` and trace `gateState()` with the given object; confirm what `canAskAgain` means in the expo-camera permission response.",
      code: "{ granted: false, status: \"denied\", canAskAgain: false, expires: \"never\" }",
      choices: [
        "`\"blocked\"`: a lock icon, the settings hint, and an **Open Settings** button that calls `Linking.openSettings()`",
        "`\"rationale\"`: the explanation screen again, with **Allow access** calling `onRequest()`",
        "`\"loading\"`: a spinner until the next AppState change",
        "`\"granted\"`: the children render and expo-camera shows its own error",
      ],
      answer: 0,
      explain:
        "`gateState` returns `\"blocked\"` only when `status === \"denied\" && !canAskAgain`. Then the OS will never show its prompt again, so `requestPermission()` would resolve silently and the screen would look dead. The code comment calls this the silent dead end. The gate shows a lock icon, the hint and **Open Settings**, which calls `Linking.openSettings()`. `\"rationale\"` covers undetermined status and denials that can still be asked again.\n\n**Failure mode if done otherwise.** A gate that only checks `granted` shows a black rectangle or a button that does nothing: the most common permission bug in shipped apps. Coming back from Settings does not trigger a re-render, so the gate also listens for `AppState` becoming `\"active\"` and calls `onRecheck`.\n\n**Takeaway.** The gate is dumb and reusable: it takes the permission object and callbacks, never a store. Pure `gateState()` is easy to unit-test. This is milestone **M1** and failure mode 1 in docs/02-camera-social.html, plus the permission state machine under **Architecture**.",
      links: [
        { title: "Apple: openSettingsURLString", url: "https://developer.apple.com/documentation/uikit/uiapplication/opensettingsurlstring" },
        { title: "React Native: Linking", url: "https://reactnative.dev/docs/linking" },
        { title: "React Native: AppState", url: "https://reactnative.dev/docs/appstate" },
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
      ],
    },
    {
      id: "camera-social-04",
      type: "mcq",
      level: 1,
      topics: ["Permissions", "Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "In `camera.tsx`, the camera permission is granted but the **microphone** permission is denied. The user switches to VIDEO mode. What happens?\n\nSearch first: Search `camera.tsx` for `micState` and `mute` and read how the banner behaves in each state; check the `mute` prop in the expo-camera reference.",
      choices: [
        "Recording still works but has no sound (`mute={micState !== \"granted\"}`), and a banner offers to request the mic or open Settings",
        "The shutter is disabled in video mode until the microphone is granted",
        "A second `PermissionGate` replaces the camera preview with a microphone rationale screen",
        "`recordAsync` rejects and the red toast shows \"Recording failed\"",
      ],
      answer: 0,
      explain:
        "Only the camera permission sits behind `PermissionGate`. The microphone is a soft dependency: `micState = gateState(micPermission)` drives the `mute` prop on `CameraView`, and a `micBanner` Pressable either calls `requestMic().then(getMic)` or, if blocked, opens Settings. The banner is hidden while recording and while the state is still loading.\n\n**Design decision.** A missing optional permission should degrade one feature, not block the screen. If a second `PermissionGate` wrapped the preview, a user who only wants silent clips or photos would be locked out of the camera. Photo and Scan modes never needed the microphone at all.\n\n**Failure mode if done otherwise.** Disabling the shutter or letting `recordAsync` reject would turn a recoverable situation into an error toast with no path forward.\n\nCompare with docs/02-camera-social.html milestones **M1** and **M7**, and with the permission state machine, which treats camera, microphone and media library as three separate permissions.",
      links: [
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
      ],
    },
    {
      id: "camera-social-05",
      type: "text",
      level: 1,
      topics: ["Expo Router", "Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "`CameraCapture` passes `active={…}` to the `CameraView` and, on Android, decides whether to mount it at all, based on one **expo-router hook**. Name the hook.\n\nSearch first: Open `camera.tsx` and read the comment above the focus value. Then look up the focus hooks in the Expo Router reference (not React Navigation).",
      accept: ["useIsFocused", "useIsFocused()"],
      explain:
        "`const isFocused = useIsFocused();` comes from `expo-router`; this repo forbids importing `@react-navigation/*` because the bundle fails on it. Tapping the last-shot button pushes `post/[id]` on top of the camera, but the camera screen stays mounted underneath, so without `isFocused` the sensor would keep running there. The in-file comment names both consequences: battery drain and a frozen preview when you return.\n\n**Takeaway.** In a stack, \"not visible\" does not mean \"unmounted\". Anything that holds hardware must be tied to focus, not mount. The value feeds `active` on iOS and gates mounting on Android (the next question explains why).\n\nThis is failure mode 2 (\"Camera not released\") and part of milestone **M1** in docs/02-camera-social.html. Reproduce it first by removing the guard and opening a post over the camera.",
      links: [
        { title: "expo-router API reference (hooks, Link.AppleZoom)", url: "https://docs.expo.dev/versions/latest/sdk/router/" },
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
      ],
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
        "`onShutterUI` in `camera.tsx`, `show()` in `FocusRing.tsx` and `factorToZoom()` in `utils/zoom.ts` all start with the same string directive. It tells the Worklets Babel plugin to compile them so they can run on the UI thread. What is the directive? Type the word.\n\nSearch first: Grep the slice for `\"worklet\"` and compare which functions have it with the gesture callbacks that call them; confirm the rule in the Worklets docs.",
      accept: ["worklet", /^['"]?worklet['"]?;?$/i],
      explain:
        "`\"worklet\";` marks a function so the Worklets Babel plugin can serialize it to the UI runtime. Callbacks you write inline on a `Gesture.X()` builder or inside `useAnimatedStyle` are workletized automatically. Standalone helpers called from them, such as `pinchToZoom`, `factorToZoom`, the crop math, or the `onPressUI` prop that `ShutterButton` calls inside `onBegin`, need the explicit directive. Without it you get a runtime error about calling a non-worklet function on the UI thread.\n\n**Takeaway.** Decide early which logic must run per frame on the UI thread. This project keeps that logic pure and small (zoom curve, clamping, rect math) so it can be a worklet and also be unit-tested in Jest like any function.\n\n**Failure mode.** A forgotten directive crashes only when the gesture first fires on a device, not at compile time.\n\nMeet this in milestone **M2** (shutter feedback, pinch zoom) and **M4** (crop clamping) of docs/02-camera-social.html.",
      links: [
        { title: "Worklets: troubleshooting (calling JS from a worklet)", url: "https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting" },
        { title: "Worklets: scheduleOnRN", url: "https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN" },
      ],
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
        "Gesture callbacks run on the UI thread, but `controller.flip`, `refocus` and `openLibrary` are ordinary JS functions. Which function, imported from `react-native-worklets`, does the camera use to call them from a gesture?\n\nSearch first: Search the slice for `scheduleOnRN` and list every call site; read the Worklets docs page for its signature and the deprecation note on `runOnJS`.",
      accept: ["scheduleOnRN", "scheduleOnRN()"],
      explain:
        "`scheduleOnRN(fn, ...args)` from `react-native-worklets` queues `fn` on the React Native (JS) runtime. It replaces the deprecated `runOnJS(fn)(args)` and takes the arguments directly, as in `scheduleOnRN(stepMode, 1)`. You need it because router calls, `setState` and any non-worklet closure cannot run synchronously on the UI thread. The same call returns the final crop rect to React from `CropOverlay.emitCurrent`.\n\n**Design decision.** Keep the UI thread for per-frame work and cross to JS rarely and with small values: a recognized gesture, a committed rect, a displayed label. Crossing on every frame defeats the point of using gestures on the UI thread.\n\n**Failure mode.** Calling a plain JS function inside a gesture callback throws at runtime on a device.\n\nSee milestone **M2** and the Animation row of **Library hints** in docs/02-camera-social.html.",
      links: [
        { title: "Worklets: scheduleOnRN", url: "https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN" },
        { title: "Worklets: troubleshooting (calling JS from a worklet)", url: "https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting" },
      ],
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
        "Every shared value in this slice is read with `zoom.get()` and written with `zoom.set(…)`, never with `zoom.value`. Why does the repo stick to that style?\n\nSearch first: Check the Reanimated `useSharedValue` page for its React Compiler section, then grep the slice for `.value =` to confirm none remain.",
      choices: [
        "With the React Compiler on, `sv.value = x` is a property mutation on a value a hook returned, which the compiler's rules flag. `get()`/`set()` are method calls, so they're safe.",
        "`.value` was removed in Reanimated 4, so `get`/`set` are the only API left.",
        "`.set()` is the only way to write from the JS thread; `.value` only works inside worklets.",
        "`.get()` makes the component re-render when the value changes, so the screen stays in sync.",
      ],
      answer: 0,
      explain:
        "With the React Compiler on, `sv.value = x` is a property assignment on a value a hook returned, which the compiler's rules flag. Reanimated documents `get()` and `set()` as the compiler-compliant form: they are method calls, so the compiler treats them as safe. `.value` still exists; the choice is about the compiler, not about a removed API or about threads. Neither `get()` nor `set()` causes a React render, because shared values reach the UI through animated styles and props.\n\n**Takeaway.** The same rule applies to other hooks: use `player.seekBy()` rather than `player.currentTime = x` (the video components do exactly this). Learn the rule once and apply it to every hook result.\n\n**Failure mode if ignored.** `npm run lint` fails with the React Compiler rules at error severity, so the milestone is not done.\n\nThis is part of the quality bar in docs/02-camera-social.html (milestone commands under **Build order**).",
      links: [
        { title: "Reanimated: useSharedValue", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue" },
        { title: "Expo: React Compiler guide", url: "https://docs.expo.dev/guides/react-compiler/" },
      ],
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
        "The `captures` table stores `path` and `thumb_path` as paths **relative** to the Documents directory, and `absoluteUri()` resolves them every time a row is read. Why not store the absolute `file:///…` URI?\n\nSearch first: Read `media/paths.ts` and its test in `__tests__/utils.test.ts`; then read Apple's file system guide on where container paths come from.",
      choices: [
        "On iOS the absolute container path (`…/Application/<UUID>/Documents`) can change across reinstalls, restores and some updates, so a stored absolute path can point to nowhere",
        "SQLite TEXT columns are limited in length, and absolute URIs often exceed that limit",
        "expo-image can't load `file://` URIs, so the path has to be rebuilt at render time",
        "Relative paths let the iOS and Android builds share one database through iCloud",
      ],
      answer: 0,
      explain:
        "On iOS the application container path (`.../Application/<UUID>/Documents`) can change across reinstalls, device restores and some updates, so a stored absolute `file:///` URI can point to nowhere. The comment in `paths.ts` states the rule: resolve at read time, never persist the absolute form. `absoluteUri()` re-joins the relative path with the current `Paths.document.uri` on every read, and the test that resolves against a *new* container path proves it. `toRelativePath` accepts both `file:/` and `file:///` spellings because native APIs return both, and `content://` URIs pass through untouched.\n\n**Takeaway.** Persist what you own (a path inside your folder) and derive what the OS owns (the container prefix). The same thinking explains why ingest copies out of the cache directory, which the OS may evict.\n\nRead failure mode 3 (\"Cache directory eviction\") and the **Data model** bullets in docs/02-camera-social.html.",
      links: [
        { title: "Apple: FileManager", url: "https://developer.apple.com/documentation/foundation/filemanager" },
        { title: "Apple: File System Programming Guide", url: "https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html" },
        { title: "expo-file-system API reference", url: "https://docs.expo.dev/versions/latest/sdk/filesystem/" },
      ],
    },
    {
      id: "camera-social-10",
      type: "multi",
      level: 1,
      topics: ["Gesture Handler", "Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "Look at the `previewGesture` built in `CameraCapture`. Select all the gestures that are actually implemented on the camera preview.\n\nSearch first: Open `camera.tsx`, find `previewGesture`, and read the gesture composition docs to decide which of the six listed behaviours actually exist.",
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
        "`Gesture.Race(pinch, flingUp, flingLeft, flingRight, Gesture.Exclusive(doubleTap, singleTap))`: whichever gesture is recognized first wins, so a pinch never also fires a tap. `Exclusive` makes the single tap wait until the double tap has failed, otherwise every flip would also refocus. Fling up goes to the Library tab, left and right step through the modes. There is no long-press recording: video is tap-to-start, tap-to-stop on `ShutterButton`, and the camera closes with the X in `CameraTopBar`, not by swiping.\n\n**Design decision.** Choose the composition by the relationship you want: `Race` for mutually exclusive, `Exclusive` for \"this one only if that one failed\", `Simultaneous` for cooperating gestures (crop, zoomable image).\n\n**Failure mode.** Mixing them up gives double-firing taps or a pinch that is swallowed by a pan (failure mode 6).\n\nSee **UI design** and milestone **M2** in docs/02-camera-social.html.",
      links: [
        { title: "Gesture Handler: gesture composition", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/" },
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
      ],
    },
    {
      id: "camera-social-11",
      type: "text",
      level: 1,
      topics: ["Media"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "expo-camera has no API to focus on a tapped point. The `refocus()` helper fakes tap-to-focus by turning one `CameraView` **prop** off and back on 60 ms later. Name that prop.\n\nSearch first: Find `refocus` in `camera.tsx`, then confirm in the expo-camera reference what the prop does and which platforms support it.",
      accept: ["autofocus", "autoFocus"],
      explain:
        "`setAutofocus(\"off\"); setTimeout(() => setAutofocus(\"on\"), 60);` makes the camera start a fresh focus pass. The ring is only feedback: `ring.show(e.x, e.y)` runs as a worklet on the UI thread, then `scheduleOnRN(refocus)` changes React state. The doc comment is candid that expo-camera has no point-of-interest API, so this is a workaround, not a feature. Check the prop's platform notes in the reference before relying on it: it is documented as iOS-only.\n\n**Takeaway.** When a library lacks an API, prefer a small, documented workaround behind one function over forking or switching libraries. If tap-to-focus precision matters to your product, that is the point to evaluate `react-native-vision-camera`, which docs/02-camera-social.html lists as an alternative.\n\nPart of the interaction details under **UI design** and milestone **M2**.",
      links: [
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
      ],
    },
    {
      id: "camera-social-12",
      type: "mcq",
      level: 1,
      topics: ["Media", "Permissions"],
      files: ["src/projects/camera-social/utils/shareOut.ts"],
      prompt:
        "`saveToGallery()` starts with `MediaLibrary.requestPermissionsAsync(true)`. What does the `true` argument ask for, and why?\n\nSearch first: Open `utils/shareOut.ts` and read the comment; then check `requestPermissionsAsync` in the expo-media-library reference to see what its first argument means.",
      choices: [
        "Write-only access. Adding a file to the library doesn't need read access to it, and on iOS the add-only prompt is much less alarming.",
        "A forced re-prompt, even if the user denied access before",
        "Access to the GPS location stored in media (ACCESS_MEDIA_LOCATION)",
        "The iOS limited-selection picker, instead of full access",
      ],
      answer: 0,
      explain:
        "The first parameter of `requestPermissionsAsync` is `writeOnly`. Saving a capture into an album needs no read access to the library, and asking for the narrowest permission that does the job gives a much less alarming prompt (the code comment says exactly that). The function then reuses the dedicated `\"Why Not RN\"` album (`Album.get`, then `Asset.create(uri, album)`) or creates it with the first asset, so captures never scatter across the camera roll.\n\n**iOS caveat.** Add-only access is enough to add a file, but reading or creating an album needs **full** access. So on iOS the function then calls `getPermissionsAsync(false)`, a read check that never prompts, and when `accessPrivileges !== \"all\"` it saves with `Asset.create(uri)` and no album: the photo lands in Recents instead of the save failing. Only with full access does it go through `Album.get` / `Album.create`.\n\n**Design decision.** Permissions are requested per capability: camera for the preview, microphone for sound, write-only for saving, full read only for the Library tab (`useAssets`). Each has its own failure path.\n\n**Failure mode if done otherwise.** Asking for full library access on the first shutter tap invites a denial that then breaks the Library tab too.\n\nMeet this in milestone **M6** (save to the gallery) and the permission section of docs/02-camera-social.html.",
      links: [
        { title: "expo-media-library API reference", url: "https://docs.expo.dev/versions/latest/sdk/media-library/" },
        { title: "Apple: Delivering an enhanced privacy experience in your Photos app", url: "https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app" },
      ],
    },

    // ───────────────────────────── Level 2 ─────────────────────────────
    {
      id: "camera-social-13",
      type: "mcq",
      level: 2,
      topics: ["Media", "Platform Differences"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "`camera.tsx` computes `const cameraMounted = Platform.OS === \"ios\" || isFocused;` **and** passes `active={isFocused}`. Why the platform split?\n\nSearch first: Read the platform notes for the `active` prop in the expo-camera reference, then re-read the `cameraMounted` line in `camera.tsx`.",
      choices: [
        "`active` is iOS-only. On Android the only way to release the camera when the screen loses focus is to unmount `CameraView`.",
        "Android crashes if two `CameraView`s are mounted, so iOS keeps its view mounted just to be faster.",
        "`isFocused` is always `false` on iOS inside a `fullScreenModal`, so iOS must always mount.",
        "Unmounting on iOS would reset the camera permission to undetermined.",
      ],
      answer: 0,
      explain:
        "The comment says it: iOS releases the camera through `active`, Android by unmounting, because `active` is documented as iOS-only. On iOS the view stays mounted with `active={false}`, which pauses the session and resumes quickly. On Android the view must leave the tree for the sensor to be released. `Platform.OS === \"ios\" || isFocused` expresses that in one line. Permissions are untouched either way; unmounting does not reset them.\n\n**Takeaway.** In React Native one prop often works on one platform only, and the other needs a structural workaround. Read the platform notes in the API reference before choosing the mechanism, and keep the platform split in one clearly commented place.\n\n**Failure mode if ignored.** On Android the sensor stays on while another screen is on top, and the preview is frozen when you return (failure mode 2). Verify on a real Android device, not just iOS.",
      links: [
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
        { title: "React Native: Platform", url: "https://reactnative.dev/docs/platform" },
      ],
    },
    {
      id: "camera-social-14",
      type: "mcq",
      level: 2,
      topics: ["React Hooks", "Performance"],
      files: ["src/app/projects/camera-social/camera.tsx"],
      prompt:
        "While recording, an interval fires every **250 ms** and calls `setElapsedSec(Math.round((Date.now() - startedAt) / 1000))`. Yet the camera screen re-renders about **once per second**. Why?\n\nSearch first: Find the interval in `camera.tsx`, then read the React docs section on how `useState` handles identical values to explain the render count.",
      choices: [
        "React skips the update when `setState` gets the same value as before (`Object.is`). Three of the four ticks each second store an unchanged whole number.",
        "The React Compiler memoizes the interval callback, so it only runs once per second.",
        "React Native throttles `setInterval` to at most one call per second while the camera is active.",
        "`useEffect` batches the four updates into one commit at the end of each second.",
      ],
      answer: 0,
      explain:
        "`useState` bails out when the new value is equal (`Object.is`) to the current one, so a timer that fires every 250 ms but stores `Math.round(seconds)` only changes React state about once per second. The code comment says so. Ticking faster than once a second keeps the label close to wall-clock time without drift, and rounding matches `formatDuration`, so the label flips at the same moments. The cleanup clears the interval and resets to 0 when recording stops. The React Compiler memoizes values and does not change timer frequency, and React Native does not throttle `setInterval`.\n\n**Design decision.** Store the smallest value the UI shows, not the raw measurement. Related: the recording ring is a Skia path driven by a derived shared value, so it animates with no React renders at all.\n\nSee milestone **M7** (recording progress) in docs/02-camera-social.html.",
      links: [
        { title: "React: useState (bailing out on equal values)", url: "https://react.dev/reference/react/useState" },
        { title: "React Native: AppState", url: "https://reactnative.dev/docs/appstate" },
      ],
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
        "The zoom label uses `useAnimatedReaction(() => Math.round(zoomToFactor(zoom.get()) * 10) / 10, (v, prev) => { if (v !== prev) scheduleOnRN(setFactor, v); })`, while the camera itself gets zoom through `useAnimatedProps`. Why not just call `setFactor` from the pinch's `onUpdate`?\n\nSearch first: Search for `useAnimatedReaction` and `useAnimatedProps` in `camera.tsx`; read both Reanimated pages and decide what each hook is for.",
      choices: [
        "A pinch updates every frame on the UI thread. Sending each frame to JS would re-render the whole camera screen per frame. The reaction only crosses threads when the displayed value (0.1 steps) changes, and zoom reaches the native view without React at all.",
        "`setState` can't be called from the JS thread while a gesture is active.",
        "`useAnimatedReaction` runs on the JS thread, so it's cheaper than a gesture callback.",
        "`CameraView`'s `zoom` prop only accepts React state, so `setFactor` must drive it.",
      ],
      answer: 0,
      explain:
        "A pinch produces updates every frame on the UI thread. Calling `setFactor` from `onUpdate` would re-render the whole camera screen per frame. Instead `useCameraController` keeps zoom as a shared value, and `Animated.createAnimatedComponent(CameraView)` plus `useAnimatedProps(() => ({ zoom: zoom.get() }))` pushes it straight to the native view with no React involvement. `useAnimatedReaction` runs on the UI thread as a filter: it rounds to 0.1 and only calls `scheduleOnRN(setFactor, v)` when the visible label would change.\n\n**Design decision.** Separate the value that drives hardware (continuous, UI thread) from the value that drives text (discrete, React). The same split appears in `ShutterButton`, where the Skia `<Path end={ringEnd}>` takes a derived value directly.\n\n**Failure mode if done otherwise.** Janky pinch and dropped frames as the JS thread floods with state updates.\n\nThis is milestone **M2** and the pinch-zoom bullet under **UI design** in docs/02-camera-social.html.",
      links: [
        { title: "Reanimated: useAnimatedReaction", url: "https://docs.swmansion.com/react-native-reanimated/docs/advanced/useAnimatedReaction" },
        { title: "Reanimated: useAnimatedProps", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps" },
        { title: "Reanimated: useSharedValue", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue" },
      ],
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
        "With `MAX_ZOOM_FACTOR = 10`, expo-camera's linear `zoom` shared value is at **0.5**. What does the zoom label show (`formatFactor` of the factor rounded to 0.1)?\n\nSearch first: Compute it by hand from `utils/zoom.ts`, then check the test in `__tests__/utils.test.ts`; confirm what range the camera's `zoom` prop expects.",
      choices: ["3.2×", "5×", "5.5×", "2×"],
      answer: 0,
      explain:
        "`zoomToFactor(z) = max ** z`, so 10^0.5 is about 3.16, rounds to 3.2, and `formatFactor` renders \"3.2×\". expo-camera's `zoom` prop is linear from 0 to 1, but perceived zoom is multiplicative, so the project maps through a logarithmic curve. With a linear mapping 0.5 would read as 5.5× and pinches feel sluggish wide and twitchy at tele. `pinchToZoom` converts to a factor, multiplies by the pinch scale, and converts back, so the same pinch doubles the zoom anywhere in the range; the test checks 1× to 2× and 4× to 8×.\n\n**Takeaway.** Put the math in a tiny pure module (`utils/zoom.ts`) marked `\"worklet\"` so it runs on the UI thread and is still Jest-testable. The 10× maximum is a typical value, not a device fact; real devices vary.\n\nSee **Interaction details worth building properly** in docs/02-camera-social.html.",
      links: [
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
        { title: "Reanimated: useSharedValue", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue" },
      ],
    },
    {
      id: "camera-social-17",
      type: "order",
      level: 2,
      topics: ["SQLite"],
      files: ["src/projects/camera-social/db/schema.ts"],
      prompt:
        "Put the steps of `migrate(db)` in the order they run on a fresh install.\n\nSearch first: Read `migrate()` in `db/schema.ts` line by line and then the SQLite pages on `user_version` and WAL.",
      items: [
        "Set `PRAGMA journal_mode = WAL`",
        "Read the current `PRAGMA user_version`",
        "Open a transaction for version `next = version + 1`",
        "Execute `MIGRATIONS[next]` (CREATE TABLE captures, settings, index)",
        "Write `PRAGMA user_version = next` inside the same transaction",
        "Loop until `version === SCHEMA_VERSION`",
      ],
      explain:
        "`user_version` is a free integer in the database header, a natural schema version. Bumping it in the **same** `withTransactionAsync` as the DDL means a crash halfway leaves neither the tables nor the version behind, and the next launch retries cleanly. WAL mode is set first so readers (the feed) and the writer (ingest) work at the same time. To add v2 you append `MIGRATIONS[2]` and bump `SCHEMA_VERSION`; existing users then run only the new step, and fresh installs run them all in order.\n\n**Failure mode if done otherwise.** Setting the version outside the transaction can record \"v1 done\" for a half-created schema, which is then never repaired.\n\n**Takeaway.** Treat migrations as an append-only list you never edit once shipped.\n\nThis is milestone **M0** and the **Data model** section in docs/02-camera-social.html.",
      links: [
        { title: "expo-sqlite API reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
        { title: "SQLite: PRAGMA user_version", url: "https://sqlite.org/pragma.html#pragma_user_version" },
        { title: "SQLite: write-ahead logging", url: "https://sqlite.org/wal.html" },
      ],
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
        "The feed, viewer and profile stay live without TanStack Query, thanks to `useCapturesQuery` in `hooks/useCaptures.ts`. Select all the statements that are true.\n\nSearch first: Open `hooks/useCaptures.ts` and read every effect dependency; then find the change-listener option in the expo-sqlite reference.",
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
        "This is a hand-rolled \"live query\": load once, subscribe to `addDatabaseChangeListener`, reload with a short debounce, and guard with a `cancelled` flag on unmount. Events only arrive because the provider is opened with `enableChangeListener: true`. The listener is process-wide, so the file-name filter (`camera-social.db`) keeps other projects' databases from waking the feed. The debounce merges a rapid-fire burst of per-row events into one reload. TanStack Query is not involved: local SQLite is the source of truth, and the app-wide client is for remote data.\n\n`useCaptureItem` wraps `select` in `useCallback([id])` and the other hooks pass stable module-level functions, so the `[db, fallback, select]` effect only re-subscribes when the id changes (`fallback` is the first `initial`, frozen in `useState`). Each result is stamped with the `select` that produced it (`source`), so when the id changes the hook returns the fallback with `loading: true` immediately instead of the previous capture's row.\n\n**Takeaway.** Subscribe once per hook, filter by source, and keep dependencies stable. See the **Data model** bullets in docs/02-camera-social.html.",
      links: [
        { title: "expo-sqlite API reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
        { title: "React: useCallback", url: "https://react.dev/reference/react/useCallback" },
      ],
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
      prompt: "Put the steps of `ingestPhoto()` in the order they run.\n\nSearch first: Read `ingestPhoto()` top to bottom and order the steps by the code, not by what feels logical; read the docs for the manipulator's save step.",
      items: [
        "Bake EXIF orientation into the pixels if `Orientation ≠ 1` (`normalizeOrientation`)",
        "Move (if `ownsFile`) or copy the file into `Documents/camera-social/originals`",
        "Measure width and height with the manipulator if the input didn't provide them",
        "Create the ~400 px thumbnail, deleting the copied original if this fails",
        "Insert the `captures` row with relative paths and the size from `fileSize()`",
      ],
      explain:
        "The pipeline turns a temp file into a durable row, and nothing downstream sees a cache-dir URI. Orientation is baked in first (re-encode when EXIF `Orientation` is not 1), then the file is moved (when `ownsFile`) or copied into `Documents/camera-social/originals`, dimensions are measured if the source lacked them, the ~400 px thumbnail is created (deleting the copied original if that fails), and finally the row is inserted with relative paths and the file size. When orientation is baked in, `withUprightOrientation` rewrites stored EXIF to `Orientation: 1`, otherwise viewers rotate the already-rotated pixels again.\n\n**Design decisions.** Files first, row last, so the database never points at something that does not exist. The `try/catch` around the thumbnail cleans up so a failure leaves no orphan.\n\nSee **The media pipeline** and failure modes 3 and 4 in docs/02-camera-social.html.",
      links: [
        { title: "Apple: CGImagePropertyOrientation", url: "https://developer.apple.com/documentation/imageio/cgimagepropertyorientation" },
        { title: "expo-image-manipulator API reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" },
        { title: "expo-file-system API reference", url: "https://docs.expo.dev/versions/latest/sdk/filesystem/" },
      ],
    },
    {
      id: "camera-social-20",
      type: "mcq",
      level: 2,
      topics: ["Media", "Performance", "Platform Differences"],
      files: [
        "src/projects/camera-social/hooks/useAssets.ts",
        "src/projects/camera-social/media/paths.ts",
        "src/projects/camera-social/components/library/AssetCell.tsx",
        "src/projects/camera-social/__tests__/utils.test.ts",
      ],
      prompt:
        "`useAssets.ts` builds each grid cell's source with `libraryGridUri(id, Platform.OS)` from `media/paths.ts`: on iOS a `ph://` PhotoKit URI, on Android the bare `id`. The library grid never resolves a real file path per cell. Why?\n\nSearch first: Read `libraryGridUri()` and its tests in `__tests__/utils.test.ts`, then `AssetCell`; look at the expo-image source options and Apple's PHImageManager to see why a sized request is cheaper.",
      choices: [
        "Resolving each asset's file is a native round-trip per cell (on iOS possibly an iCloud download). With `ph://`, expo-image asks PhotoKit for a sized thumbnail, and on Android the id is already a `content://` URI.",
        "`ph://` URIs skip the media-library permission check, so the grid can render before access is granted.",
        "FlashList can only recycle cells whose image source uses a custom URL scheme.",
        "Android also needs `ph://`, but falls back to `content://` when PhotoKit isn't available.",
      ],
      answer: 0,
      explain:
        "The grid only needs a thumbnail, and expo-image understands PhotoKit local identifiers: `ph://<id>` makes it ask PhotoKit for a sized thumbnail. Resolving each asset's real file is a native round-trip per cell and on iOS may trigger an iCloud download. On Android the asset id is already a loadable `content://` URI. SDK 57's expo-media-library already returns iOS ids as `ph://<localIdentifier>`, so `libraryGridUri` adds the scheme only to a bare id; prefixing every id gave `ph://ph://…` and a blank grid, and the tests pin both forms plus the Android pass-through. `AssetCell` adds `allowDownscaling` and `cachePolicy=\"memory\"`, so a 5,000-photo library stays at flat memory. The expensive `resolveLibraryAsset` (info plus EXIF) runs only on an explicit Edit, Add or Share.\n\n**Failure mode if done otherwise.** Resolving files per cell makes scrolling stutter and can download originals nobody looks at (failure mode 5, OOM and cost).\n\n**Takeaway.** Do the cheap thing per cell and the expensive thing per user intent.\n\nThis is milestone **M3** in docs/02-camera-social.html.",
      links: [
        { title: "expo-media-library API reference", url: "https://docs.expo.dev/versions/latest/sdk/media-library/" },
        { title: "expo-image API reference", url: "https://docs.expo.dev/versions/latest/sdk/image/" },
        { title: "Apple: PHImageManager", url: "https://developer.apple.com/documentation/photokit/phimagemanager" },
      ],
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
        "`useAssets` decides whether to show the iOS **Limited access · Manage** banner from one field on the media-library permission response. That field has the value `\"limited\"` when the user only shared some photos. Name the field.\n\nSearch first: Search `useAssets.ts` for the limited flag and read the media-library permission response type to find the exact field name.",
      accept: ["accessPrivileges", "permission.accessPrivileges"],
      explain:
        "`const limited = permission?.accessPrivileges === \"limited\";`. In limited mode `granted` is still `true`, so checking `granted` alone hides the fact that most of the library is invisible to the app. The banner then calls `MediaLibrary.presentPermissionsPicker()` and `refresh()`, and `MediaLibrary.addListener` also refreshes when the selection changes. The empty state changes its wording to \"No photos shared with this app yet.\"\n\n**Failure mode if done otherwise.** Users who chose \"Select Photos\" see a nearly empty grid with no explanation and conclude the app is broken.\n\n**Takeaway.** An iOS permission is not a boolean. Model it as a small state machine (undetermined, denied, limited, granted) and give each state a visible UI. Test it by choosing \"Select Photos\" on a device.\n\nSee milestone **M3** and the iOS limited-access branch of the permission state machine in docs/02-camera-social.html.",
      links: [
        { title: "expo-media-library API reference", url: "https://docs.expo.dev/versions/latest/sdk/media-library/" },
        { title: "Apple: Delivering an enhanced privacy experience in your Photos app", url: "https://developer.apple.com/documentation/photokit/delivering-an-enhanced-privacy-experience-in-your-photos-app" },
      ],
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
        "The post viewer stacks three gesture owners: a horizontal pager, a pinch-zoom image, and drag-down-to-dismiss. Select all the mechanisms that stop them from fighting.\n\nSearch first: Open the post screen, `ZoomableImage` and `DismissibleContainer` and mark each mechanism you can find in the code; check the pan gesture docs for `manualActivation` and the offset options.",
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
        "The approach is to decide who owns a touch from state, not by hoping. At 1× horizontal swipes belong to the pager and vertical drags to the dismiss container, so the image's pan calls `manager.fail()` through `manualActivation(true)`. Once zoomed, the image activates its pan and JS switches the other two off: `scrollEnabled={!zoomed}` on the pager and `enabled={!zoomed}` on the dismiss container (which uses `activeOffsetY` and `failOffsetX` thresholds). Taps use `Gesture.Exclusive` so a double-tap never also fires the single tap. `ZoomableImage` composes pinch, pan and taps with `Simultaneous`, the opposite of `Race`. The pager is a plain `FlatList`, not FlashList.\n\n**Failure mode.** Without this, the pager scrolls while you pan a zoomed photo, or a dismiss drag steals a pinch (failure mode 6).\n\nSee milestone **M5** in docs/02-camera-social.html.",
      links: [
        { title: "Gesture Handler: gesture composition", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/" },
        { title: "Gesture Handler: pan gesture", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture" },
        { title: "React Native: FlatList", url: "https://reactnative.dev/docs/flatlist" },
      ],
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
        "What does `rewriteCameraSocialPath(\"/projects/camera-social/post/abc\", DOMAIN)` return, and why is that correct?\n\nSearch first: Run the call mentally against `utils/linkRewrite.ts`, then read the test file and the Expo Router +native-intent page for the contract of the return value.",
      choices: [
        "`null`. The custom-scheme path already matches a real route, so no rewriter matches and `redirectSystemPath` returns the path unchanged.",
        "`\"/projects/camera-social/post/abc\"`, because the rewriter normalizes every post path to the namespaced form",
        "`SHARE_INBOUND_ROUTE`, because any camera-social path without a post id goes to the inbound screen",
        "It throws, and the `try/catch` in `+native-intent.tsx` swallows the error",
      ],
      answer: 0,
      explain:
        "The rewriter only handles URL shapes that are **not** already routes: the share-extension callback (`dataUrl=` goes to the inbound screen) and the universal link `https://<linkDomain>/post/<id>`. The custom-scheme path `/projects/camera-social/post/abc` already matches a route, so no rewriter claims it: `rewriteCameraSocialPath` returns `null`, `+native-intent` tries the store rewriter, then falls through to `return path`. The test \"leaves other hosts, projects and malformed ids alone\" includes this input. Foreign hosts and ids failing `/^[A-Za-z0-9_-]+$/` are rejected too, so a crafted link cannot inject an odd route.\n\n**Design decision.** `null` means \"not mine\", which lets many projects share one root file where the first match wins. Keep rewriters pure and never throw; the root wraps them in `try/catch` because an exception in `redirectSystemPath` can crash the app.\n\nSee **How it sits in the launcher** and milestone **M6** in docs/02-camera-social.html.",
      links: [
        { title: "Expo Router: +native-intent", url: "https://docs.expo.dev/router/advanced/native-intent" },
        { title: "expo-router API reference (hooks, Link.AppleZoom)", url: "https://docs.expo.dev/versions/latest/sdk/router/" },
      ],
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
        "Trace a photo shared from another app into Why-Not-ReactNative, on iOS and on Android. Explain:\n\n- why both the `dataUrl=` rewrite in `+native-intent.tsx` **and** `useInboundShareRouting` exist\n- why `ShareIntentProvider` sits in the **root** layout with `resetOnBackground: false`\n- why `share-inbound.tsx` calls `share.reset()` after importing\n\nSearch first: Follow the path from `app.config.ts` through `src/app/_layout.tsx`, `+native-intent.tsx` and the routing hook; read the expo-share-intent README for what `resetOnBackground` does.",
      model:
        "On iOS the expo-share-intent share extension opens the app with a URL like `whynotreactnative://dataUrl=…ShareKey`. That isn't a route, so `rewriteCameraSocialPath` sends it to `/projects/camera-social/share-inbound`, where the provider reads the payload from the native module. On Android a share is a SEND **intent**, not a URL, so `+native-intent` never sees it. Instead `useInboundShareRouting` (mounted at the root through the `ShareIntentRouting` component) watches `hasShareIntent` and pushes the inbound route from wherever the user is. The provider must be at the root because a share can arrive while the user is in the launcher or another project, before the camera-social layout has ever mounted. `resetOnBackground: false` keeps the payload alive until it has been imported, instead of dropping it when the app is backgrounded. After import (or discard) the screen calls `share.reset()`, which clears the payload so `hasShareIntent` goes false. The hook has a second guard: it remembers the last `shareIntent` object in a ref and routes each object only once, because expo-share-intent creates a new object per share. Swiping the inbound screen away without importing doesn't reset the intent, so keying on \"has files\" alone would push the screen straight back on the next pathname change. Discard also handles a cold start from the share extension, where there's nothing underneath: when `router.canGoBack()` is false it does `router.replace(\"/projects/camera-social\")` instead of `back()`.",
      rubric: [
        "iOS uses a URL callback (`dataUrl=`) rewritten by `+native-intent`; Android uses an intent that only the hook can catch",
        "The provider and routing hook live at the root because shares arrive regardless of which project is open",
        "`resetOnBackground: false` keeps the share until it has been imported",
        "The hook routes each `shareIntent` object once (ref identity), so dismissing the screen doesn't re-push it; `reset()` clears the payload after import",
        "Importing copies the files out of the extension's shared container through the normal ingest (origin `\"share\"`)",
        "Optional: Discard falls back to `router.replace` when `canGoBack()` is false (cold start from the extension)",
      ],
      explain:
        "Inbound sharing arrives by two different paths. On iOS the share extension opens the app with a URL containing `dataUrl=`; that is not a route, so the pure `rewriteCameraSocialPath` sends it to the inbound screen, and the provider reads the payload from the native module. On Android a share is a SEND **intent**, not a URL, so `+native-intent` never sees it; `useInboundShareRouting` watches `hasShareIntent` and pushes the same route from wherever the user is.\n\nThe provider lives in the **root** layout because a share can arrive while the user is in the launcher or another project, before this project's layout has ever mounted. `resetOnBackground: false` keeps the payload until it is imported (the default is true). `share.reset()` clears the payload after import or discard. Because a swiped-away screen leaves the intent in place, the hook also stores the last routed `shareIntent` in a ref and skips an object it has already routed (expo-share-intent makes a new object per share), so the screen is not pushed back on the next pathname change. Discard checks `router.canGoBack()` and falls back to `router.replace(\"/projects/camera-social\")` after a cold start from the extension.\n\n**Config side.** The `expo-share-intent` plugin in `app.config.ts` needs an App Group, `iosActivationRules` and `androidIntentFilters`.\n\nSee milestone **M6** and the **Launcher** table in docs/02-camera-social.html.",
      links: [
        { title: "Expo Router: +native-intent", url: "https://docs.expo.dev/router/advanced/native-intent" },
        { title: "expo-share-intent on GitHub", url: "https://github.com/achorein/expo-share-intent" },
        { title: "Apple: Configuring app groups", url: "https://developer.apple.com/documentation/xcode/configuring-app-groups" },
        { title: "Android: receive simple data from other apps", url: "https://developer.android.com/training/sharing/receive" },
      ],
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
        "Trim is stored as metadata (`trim_start_ms`, `trim_end_ms`), so the expo-video player has to enforce it. Outside the `useVideoPlayer` setup callback, both video components avoid `player.currentTime = x`. Which **player method** do they call to jump back to the trim start?\n\nSearch first: Search both video components for `seekBy`, then read the VideoPlayer methods in the expo-video reference.",
      accept: ["seekBy", "player.seekBy", "seekBy()"],
      explain:
        "Because trim is stored as metadata, every player has to enforce the window itself. Both components call `player.seekBy(to - currentTime)` inside a `timeUpdate` listener (`useEventListener(player, \"timeUpdate\", ...)`), with `timeUpdateEventInterval` setting how often it fires. The viewer also calls it from `playToEnd` because it loops by hand rather than using native `loop`. Assigning `currentTime` outside setup would mutate a value a hook returned, which the React Compiler rules forbid. Inside the setup callback `p.currentTime = start` is fine because `p` is the callback parameter. `seekBy` is documented as not frame-accurate, which is fine for a loop point.\n\n**Takeaway.** Non-destructive editing moves complexity from the file into the player. Keep the decision pure (`utils/trim.ts`) and the side effects thin.\n\nSee milestone **M7** in docs/02-camera-social.html.",
      links: [
        { title: "expo-video API reference", url: "https://docs.expo.dev/versions/latest/sdk/video/" },
        { title: "Expo: React Compiler guide", url: "https://docs.expo.dev/guides/react-compiler/" },
      ],
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
        "Put the steps of `applyOperations(source, ops, deps)` in order. It runs when the user taps **Save** on a photo edit.\n\nSearch first: Read `applyOperations()` and note each condition guarding a stage; check the chainable manipulator methods in the expo-image-manipulator reference.",
      items: [
        "Reduce the op list to one `ResolvedEdit` with `resolveOperations`",
        "Rotate with the manipulator (if `rotation !== 0`)",
        "Flip horizontally and/or vertically (if set)",
        "Crop using `cropToPixels(edit.crop, orientedSize(source, rotation))`",
        "Render and save a JPEG at `EXPORT_QUALITY` (0.92)",
        "Bake the color matrix with Skia, only if it isn't the identity",
      ],
      explain:
        "Geometry runs in the canonical order `crop(flip(rotate(source)))`, the same order the Skia preview applies, so the preview matches the output. The crop's pixel rect is computed against the **rotated** dimensions (`orientedSize`) because the normalized rect describes the image as displayed after rotation. Each stage is skipped when not needed (`hasGeometry`, `isIdentity`), so a pure colour edit never re-encodes geometry, and the Skia colour pass runs last and only for a non-identity matrix. A no-op edit returns the source URI, which the editor checks with `result.uri === source.uri`.\n\n**Failure mode if reordered.** Cropping before rotating applies the rect to the wrong axes, and the saved file is offset from the preview (failure mode 7).\n\n**Takeaway.** Make the order a documented invariant and pin it with a test that records the call sequence.\n\nSee **Key architectural decision: the editor as an operation list** in docs/02-camera-social.html.",
      links: [
        { title: "expo-image-manipulator API reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" },
        { title: "Skia: color filters (ColorMatrix)", url: "https://wcandillon.github.io/react-native-skia/v2/docs/color-filters/" },
      ],
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
        "Select all the statements that are true about how this slice uses FlashList.\n\nSearch first: Read `AssetGrid`, `AssetCell`, the feed screen and `CaptureCell`; check what `extraData` and `recyclingKey` do in their docs.",
      choices: [
        "`AssetGrid` passes `extraData={{ selectedIds, selecting }}` so recycled, memoized cells re-render when the selection changes",
        "`AssetCell` sets expo-image's `recyclingKey={id}` so a recycled view doesn't flash the previous asset while the new thumbnail decodes",
        "The feed uses `masonry` with `numColumns={2}`, and `CaptureCell` clamps each cell's aspect ratio to 0.6–1.6",
        "The post viewer's horizontal pager is also a FlashList",
        "Feed cells render the full-resolution original so the iOS zoom transition looks sharp",
      ],
      answer: [0, 1, 2],
      explain:
        "FlashList recycles views: a cell that scrolls out is reused for a different item, so anything identity-dependent needs care. expo-image's `recyclingKey` resets its content so the previous asset does not flash while the new thumbnail decodes. `extraData` tells the list that data outside `data` changed, which matters because `renderItem` reads `selectedIds` and `AssetCell` is memoized. The feed uses `masonry` with `numColumns={2}`, and `CaptureCell` clamps the aspect ratio to 0.6 to 1.6 so a panorama cannot break the layout. The feed renders `thumbUri` (about 400 px), never the original, and the post pager is a `FlatList`.\n\n**Failure mode if ignored.** Selection checkmarks that do not update, or wrong images flashing in recycled cells.\n\n**Takeaway.** Memoized, recycled cells are fast only if you declare every input.\n\nSee milestones **M2** and **M3** in docs/02-camera-social.html.",
      links: [
        { title: "FlashList: usage (masonry, extraData)", url: "https://shopify.github.io/flash-list/docs/usage/" },
        { title: "FlashList: recycling", url: "https://shopify.github.io/flash-list/docs/recycling/" },
        { title: "expo-image API reference", url: "https://docs.expo.dev/versions/latest/sdk/image/" },
      ],
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
        "Follow a Brightness drag from `AdjustSlider` to the editor history. Explain why the thumb position is a **shared value** driven by a pan gesture, and why `PhotoEditor` keeps `draftAdjust` / `draftIntensity` instead of calling `history.push` on every `onChange`.\n\nSearch first: Follow one drag through `AdjustSlider.tsx` and the editor screen: list which values are shared values, which are draft state, and which are history ops.",
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
        "`AdjustSlider` uses `Gesture.Pan().minDistance(0)`. Its callbacks run on the UI thread and write the thumb's `x` shared value, so the thumb tracks the finger at frame rate even when JS is busy. Each frame the numeric value also crosses to JS with `scheduleOnRN(onChange, v)`, and `onFinalize` sends `onCommit` once on release. `PhotoEditor` only sets `draftAdjust` on change, which feeds `previewEdit` and the memoized colour matrix, so the Skia preview updates live. `onCommit` clears the draft and pushes exactly one `{ type: \"adjust\" }` op, giving one undo step per drag. When idle, the thumb follows the external `value`, so undo and redo move it back.\n\n**Pattern.** Preview a draft, commit on release. The comments in both files state the same contract.\n\n**Failure mode if every change were pushed.** Dozens of undo steps per drag and the whole op list re-resolved each frame.\n\nSee milestone **M4** in docs/02-camera-social.html.",
      links: [
        { title: "Reanimated: useSharedValue", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue" },
        { title: "Gesture Handler: pan gesture", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture" },
        { title: "Worklets: scheduleOnRN", url: "https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN" },
      ],
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
        "In the Adjust tool, the user drags **Brightness** to +0.4 and releases, then drags **Contrast** to +0.3 and releases. They tap **Undo** once. What does the photo look like?\n\nSearch first: Read `mergesWithLast` and `history.test.ts`, then simulate the two drags and one undo on paper.",
      choices: [
        "Only contrast goes back to 0; brightness stays at +0.4.",
        "Brightness and contrast both go back to 0. The reducer merged the two consecutive `adjust` ops into one undo step.",
        "Nothing changes, because `draftAdjust` is still set and hides the undo.",
        "Brightness goes back to 0, but contrast stays at +0.3.",
      ],
      answer: 0,
      explain:
        "Each commit pushes `{ type: \"adjust\", values: { ...current, [key]: v } }`, the full adjustment set, so an op does not say which slider moved. `mergesWithLast` in `history.ts` works that out by comparing the last op with the adjust state before it (the previous adjust op, or `NEUTRAL_ADJUST`) to find the single key it changed, and merges only if the new op changes nothing but that key. Contrast is a different key from brightness, so the push appends: `[adjust{b:.4}, adjust{b:.4,c:.3}]`, cursor 2. Undo moves the cursor to 1, which resolves to brightness +0.4 and contrast 0. Two drags of the same slider in a row would collapse into one step. Filters merge by `name`.\n\n**Takeaway.** Put the undo semantics in a pure reducer (`history.ts`) wrapped by `useEditorHistory`, and write the tests first: \"keeps different adjust sliders as separate undo steps\" and \"collapses repeated drags of one adjust slider\".\n\nSee milestone **M4** in docs/02-camera-social.html.",
      links: [
        { title: "React: useReducer", url: "https://react.dev/reference/react/useReducer" },
        { title: "React: keeping components pure", url: "https://react.dev/learn/keeping-components-pure" },
      ],
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
        "`resolveOperations([{ type: \"flip\", axis: \"horizontal\" }, { type: \"rotate\", degrees: -90 }])`: what canonical edit comes out?\n\nSearch first: Work the matrix on paper with a small asymmetrical image, then read `resolveOperations` and its test to confirm.",
      choices: [
        "`rotation: 270, flipH: false, flipV: true`",
        "`rotation: 270, flipH: true, flipV: false`",
        "`rotation: -90, flipH: true, flipV: false`",
        "`rotation: 90, flipH: false, flipV: true`",
      ],
      answer: 0,
      explain:
        "The canonical form is `crop(flip(rotate(source)))`, rotation first. The user flipped first, so the flip has to move after the rotation, and a horizontal mirror followed by a quarter turn equals the turn followed by a **vertical** mirror. That is why the `rotate` case swaps `flipH` and `flipV`. Rotation is normalized with `((r + d) % 360 + 360) % 360`, so -90 becomes 270, and any crop rect is carried along (`rotateRect`, `flipRect`) so it stays on the same pixels. The test \"swaps flip axes when rotating\" checks exactly this.\n\n**Why it matters.** The manipulator and the Skia preview must perform the same sequence, and the manipulator applies its actions in the order you chain them. Reducing arbitrary user order to one canonical order is what lets two renderers agree.\n\n**Failure mode.** Flipping the wrong axis after rotation gives a mirror image that looks right in one orientation and wrong in another.\n\nSee the operation-list section in docs/02-camera-social.html.",
      links: [
        { title: "expo-image-manipulator API reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" },
      ],
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
        "`multiply(a, b)` is documented as \"a ∘ b, apply `b` first, then `a`\". Given how `buildColorMatrix` composes its matrices, in what order are the color transforms effectively applied to a pixel?\n\nSearch first: Read the doc comment on `multiply` and the return of `buildColorMatrix`, then check how the Skia docs describe a 5x4 matrix.",
      items: [
        "Filter matrix, interpolated from identity by `intensity`",
        "Saturation (`1 + adjust.saturation`)",
        "Contrast",
        "Brightness offset",
      ],
      explain:
        "`buildColorMatrix` returns `multiply(adjustMatrix, filterMatrix)`, and `multiply(a, b)` applies `b` first, so the filter runs first. `adjustMatrix = multiply(brightness, multiply(contrast, saturation))`, so saturation runs next, then contrast, then brightness. The result is **one** 4×5 matrix: the preview uses a single `<ColorMatrix>` and the export a single `ColorFilter.MakeMatrix` pass, never three. Order matters because matrix multiplication does not commute: brightening before raising contrast gives a different image than the reverse.\n\n**Takeaway.** Compose in the math layer, not in the render layer. One matrix keeps the GPU cost flat however many controls the user touches, and keeps preview and export identical (failure mode 7).\n\nConfirm the order yourself by reading `colorMatrix.ts` and its use in `EditPreview`. See milestone **M4** in docs/02-camera-social.html.",
      links: [
        { title: "Skia: color filters (ColorMatrix)", url: "https://wcandillon.github.io/react-native-skia/v2/docs/color-filters/" },
        { title: "Skia: images", url: "https://wcandillon.github.io/react-native-skia/v2/docs/images/" },
      ],
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
        "Ten fast taps on the shutter in `useCapture.takePhoto`. Select all the statements that are true.\n\nSearch first: Read `useCapture.takePhoto` and `captureStore.ts`; trace ten rapid calls and mark what is serialized and what is not.",
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
        "The principle is \"the shutter only waits for the sensor, never for disk\". Sensor calls are chained on `queue.current` because the native session rejects overlapping capture requests; the promise returned by `takePhoto` resolves when the frame exists, before copy, thumbnail and DB work. `queue.current = shot.catch(() => undefined)` stops a failed capture from rejecting every later link. `failCapture` decrements `pending` so the last-shot spinner stops. Each `shot.then(ingestPhoto...)` branches off its own `shot`, so ingests can overlap and SQLite in WAL mode handles the concurrent inserts. `useCaptureStore` is a plain `create()` with no `persist`: it holds transient UI state while the durable data lives in SQLite.\n\n**Failure mode if done otherwise.** Awaiting ingest in the tap handler freezes the UI; no `.catch` on the queue link bricks the camera until remount.\n\nSee milestone **M2** and failure mode 8 in docs/02-camera-social.html.",
      links: [
        { title: "React: useRef", url: "https://react.dev/reference/react/useRef" },
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
      ],
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
      prompt: "Select all the statements that are true about `CropOverlay`.\n\nSearch first: Read `CropOverlay.tsx` and `cropMath.ts` alongside the tests; for each statement find the line that proves or contradicts it.",
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
        "Pinch, pan and rotation are combined with `Gesture.Simultaneous`, so all three work at once. Every frame is clamped on the UI thread with worklet-safe helpers (`clampScale`, `clampTranslate`), so the image can never leave a gap inside the frame. On release, `withDecay({ velocity, clamp })` gives momentum that stops at the frame edge. A rotation past π/4 calls `onRotate(±90)` via `scheduleOnRN` and springs the visual tilt back to 0. `emitCurrent` sends the rect only on `onEnd` and once both momentum axes have settled (a per-pan id ignores callbacks from a replaced decay), not per frame. The resize pan is `.enabled(aspect == null)`, so the handle works only for free-form crops. Only a normalized `NormRect` leaves the component.\n\n**Why it matters.** Screen coordinates never reach the manipulator, which removes the classic offset bug (failure mode 7).\n\nSee milestone **M4** in docs/02-camera-social.html.",
      links: [
        { title: "Gesture Handler: gesture composition", url: "https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/" },
        { title: "Reanimated: withDecay", url: "https://docs.swmansion.com/react-native-reanimated/docs/animations/withDecay" },
        { title: "Reanimated: useSharedValue", url: "https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue" },
      ],
    },
    {
      id: "camera-social-34",
      type: "mcq",
      level: 3,
      topics: ["Media", "React Hooks"],
      files: ["src/projects/camera-social/hooks/useAssets.ts"],
      prompt:
        "In the Library tab, a page of **Recents** is still loading when the user picks another album. What stops the late Recents page from being added to the new album's grid?\n\nSearch first: Search for `generation` in `useAssets.ts` and list every place it is read or written; read the React docs on refs to see why a ref and not state.",
      choices: [
        "The `generation` ref. A reset increments `generation.current`, and when the old `await` resolves, `gen !== generation.current`, so it returns without touching state.",
        "The `inFlight` ref blocks the new album's request until the old one finishes.",
        "`MediaLibrary.Query` cancels the previous query when a new one starts.",
        "The `useEffect` cleanup aborts the old promise with an `AbortController`.",
      ],
      answer: 0,
      explain:
        "This is the generation-token pattern for async races. The album-change effect clears `inFlight` and starts a reset fetch, so both requests are briefly in flight. Promises cannot be cancelled, and nothing here uses `AbortController`, so the stale result must be ignored: after the `await`, `gen !== generation.current` returns before touching state. Refs are the right tool because the check must see the latest value, not one captured at render time. The same stamp guards `catch` and `finally`: a superseded request does not set `error`, and only the current generation clears `inFlight` and `loading`. Otherwise the stale `finally` would clear both flags while the newer request still runs, so the spinner would vanish early and `loadMore` could start an overlapping page.\n\n**Takeaway.** Any paginated, filterable list needs a stamp. Reproduce the bug by switching albums rapidly on a large library.\n\nSee milestone **M3** and failure mode 9 in docs/02-camera-social.html.",
      links: [
        { title: "React: useRef", url: "https://react.dev/reference/react/useRef" },
      ],
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
        "`applyOperations` takes an `ApplyDeps` argument and types the manipulator as a structural `ManipulatorContextLike`, instead of importing `expo-image-manipulator` and Skia directly. What does that design buy?\n\nSearch first: Compare the type of `ApplyDeps` with `nativeDeps.ts` and the mock in `applyOperations.test.ts`; check the manipulator's real method names.",
      choices: [
        "The pure pipeline runs in Jest with a recording mock, so the test can check the exact call sequence (manipulate → rotate → flip → crop → render → save → color). `nativeDeps.ts` adapts the real APIs.",
        "TypeScript 6 can't type-check `expo-image-manipulator` imports in non-component files.",
        "It lets the editor run on the web, where Skia isn't available.",
        "Structural types are erased differently, which makes the export faster at runtime.",
      ],
      answer: 0,
      explain:
        "This is dependency injection through a structural type. `applyOperations` takes `ApplyDeps` and a `ManipulatorContextLike` instead of importing `expo-image-manipulator` and Skia, so the pure pipeline runs in Jest with a recording mock. The test asserts the exact call sequence (manipulate, rotate, flip, crop, render, save, colour) and a concrete crop rect. `nativeDeps.ts` adapts the real APIs and calls `release()` on native objects. Native modules do not load under Jest, so without the seam this logic could only be tested on a device by eye.\n\n**Design decision.** Isolate the unsafe, platform-bound part in one small file and keep everything else pure. The same approach covers history, link rewriting, trim and settings, which is why `__tests__` has a suite for each.\n\n**Failure mode if done otherwise.** Editor regressions are found by users, not by CI.\n\nSee **Architecture** (folder layout) and milestone **M4** in docs/02-camera-social.html.",
      links: [
        { title: "expo-image-manipulator API reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" },
        { title: "Skia: images", url: "https://wcandillon.github.io/react-native-skia/v2/docs/images/" },
      ],
    },
    {
      id: "camera-social-36",
      type: "text",
      level: 3,
      topics: ["Skia"],
      files: ["src/projects/camera-social/editor/nativeDeps.ts"],
      prompt:
        "`applyColorMatrix` in `nativeDeps.ts` decodes the JPEG with `Skia.Image.MakeImageFromEncoded`, draws it onto an offscreen surface with a paint, and encodes the snapshot. Which factory method on `Skia.ColorFilter` turns the 20-number matrix into the paint's GPU color filter?\n\nSearch first: Read `applyColorMatrix` and its header comment; look up `ColorFilter` in the Skia docs and name the factory that takes the 20 numbers.",
      accept: ["MakeMatrix", "ColorFilter.MakeMatrix", "Skia.ColorFilter.MakeMatrix"],
      explain:
        "`paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix))`, then `drawImageRect` onto `Skia.Surface.MakeOffscreen`, then `makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 92)`. The only bytes that reach JS are the **encoded** JPEG headed to `scratchFile`; raw pixels never do, which matters for a 48 MP photo. One deliberate trade-off: `MAX_SURFACE_EDGE = 4096` caps the colour pass, because `MakeOffscreen` allocates a GPU render target limited by the device's maximum texture size (as low as 4096 on older Android GPUs) and a 48 MP image costs about 190 MB per RGBA copy. A colour-filtered export is therefore 4096 px on the long edge, and the returned size is the real one. `applyOperations` skips the pass for an identity matrix, so geometry-only saves keep full resolution.\n\n**Takeaway.** Document limits where the trade-off is made. See \"Never move pixels through JS\" in docs/02-camera-social.html.",
      links: [
        { title: "Skia: color filters (ColorMatrix)", url: "https://wcandillon.github.io/react-native-skia/v2/docs/color-filters/" },
        { title: "Skia: images", url: "https://wcandillon.github.io/react-native-skia/v2/docs/images/" },
      ],
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
        "Turn on **Save captures to gallery**, edit a camera photo, and tap Save. `PhotoEditor.save` calls `ingestPhoto(db, { uri: result.uri, …, ownsFile: true })`, then re-reads the new row with `getCapture(db, id)` and passes `saved.uri` to `saveToGallery`. Explain:\n\n- why it can't simply call `saveToGallery(result.uri)`\n- why the gallery error goes to `alertError` instead of an empty `.catch`\n- why `router.replace` to the new post still runs when the gallery save fails\n\nSearch first: Trace `PhotoEditor.save` in the editor route into `ingestPhoto` and `moveIntoMedia`, then check what `moveSync` does to the source URI in the expo-file-system docs.",
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
        "`applyOperations` returns a temp file. With `ownsFile: true` and an already-upright camera photo, `normalizeOrientation` returns null and `ingestPhoto` calls `moveIntoMedia`, which `moveSync`s the file into Documents. Afterwards `result.uri` points to nothing, so `Asset.create` would fail. The editor therefore does what `useCapture.afterIngest` does: read the row back with `getCapture(db, id)` and pass its resolved `uri`. When orientation normalization runs, a different file is moved and `result.uri` survives, so the temp path would only fail sometimes, which is a reason to always read the stored location.\n\nAn empty `.catch` would silently ignore a failure of a setting the user turned on; `alertError(\"Saved, but not to your gallery\", e)` tells them. The edit is already stored, so the gallery catch is local and navigation continues; the outer `catch` keeps the editor open with \"Couldn't save\".\n\n**Rule.** Once ingest owns a file, the caller's URI is stale. See **Who owns the file?** under the pipeline in docs/02-camera-social.html.",
      links: [
        { title: "expo-file-system API reference", url: "https://docs.expo.dev/versions/latest/sdk/filesystem/" },
        { title: "expo-media-library API reference", url: "https://docs.expo.dev/versions/latest/sdk/media-library/" },
        { title: "Apple: File System Programming Guide", url: "https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html" },
      ],
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
        "`useSettings()` reads a Zustand store (`stores/settingsStore.ts`) that is hydrated once from SQLite. `update(patch)` applies `patchSettings` to the store and only then calls `setSetting` with `useSettingsStore.getState().settings`. The Profile tab and the camera's quick-settings panel both use it. Suppose each `useSettings()` call kept its own `useState` copy instead. Describe a tap sequence that would lose a change, then explain how each part of the real design prevents it: the shared store, the write outside the state updater, and the `pending` field.\n\nSearch first: Read `useSettings`, `settingsStore.ts` and `settings.test.ts`, and invent the tap sequence before reading the explanation.",
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
        "With per-hook `useState`, every call site gets its own copy. The Profile tab stays mounted under the camera modal, so after the camera turns Haptics off, Profile still holds `haptics: true`; toggling Keep EXIF there writes the whole blob and silently turns haptics back on. Last writer wins. A module-level Zustand store makes one shared copy: both screens subscribe to it and `patchSettings` merges each patch into the latest state, key by key.\n\nThe SQLite write runs after `setState`, reading `getState()`, because updater functions must be pure and StrictMode calls them twice. Hydration happens once per database connection (`hydratedFrom`), and until it finishes `update` does not write, since defaults plus a patch would overwrite the stored blob. Early patches go into `pending`, which `hydrateSettings` lays over the loaded values before the merged result is written.\n\n**Takeaway.** A hook around persistent state is not shared state. SQLite is the durable copy, the store is the live copy. Compare `useCapturesQuery`, which stays consistent by listening for database changes.\n\nSee the **Data model** bullets in docs/02-camera-social.html.",
      links: [
        { title: "React: StrictMode", url: "https://react.dev/reference/react/StrictMode" },
        { title: "React: keeping components pure", url: "https://react.dev/learn/keeping-components-pure" },
        { title: "expo-sqlite API reference", url: "https://docs.expo.dev/versions/latest/sdk/sqlite/" },
      ],
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
        "`TrimmedVideoView` sets `p.loop = false` in its `useVideoPlayer` setup and loops by hand: the `timeUpdate` and `playToEnd` listeners both ask `trimLoopSeek(…)` where to seek. `VideoTrimScreen.save` stores the trim end as `null` when the right handle stays at the end of the clip. Walk through a clip with `trimStartMs = 3000` and `trimEndMs = null`. What happens at the end of the clip, and what would go wrong if the setup used `p.loop = end == null` instead?\n\nSearch first: Read `utils/trim.ts` with its tests, then the listeners in `TrimmedVideoView`; check what the expo-video player does when `loop` is true.",
      model:
        "Setup seeks to 0:03 (`p.currentTime = start` is fine there, because `p` is the callback parameter). During playback, `timeUpdate` calls `trimLoopSeek(currentTime, 3, null)`. There is no end trim, and the position is not more than 0.1 s before the start, so it returns null and nothing happens. Native looping is off, so the player really stops at the end of the file and `playToEnd` fires. `trimLoopSeek(…, true)` returns 3, the handler seeks back with `seekBy(3 - currentTime)` and calls `play()` again if the page is still `active`. Every loop starts at 0:03. With `p.loop = end == null`, this clip would get native looping, which always restarts at 0:00. The player would jump to 0:00 and show the trimmed-away head until the next `timeUpdate` (every 0.25 s) notices `currentTime < start - 0.1` and seeks back to 0:03. So every loop would flash the footage the user cut, and two loop mechanisms (native restart and the hand-rolled clamp) would fight over the same transition. Clips with an end trim would still be fine, since `timeUpdate` seeks back to `start` before the file ends. The cost of looping by hand is a tiny hitch at the loop point, even for untrimmed clips. The gain is one code path that respects the start for every combination of null and non-null start and end.",
      rubric: [
        "`timeUpdate` acts only past an end trim or more than 0.1 s before the start; with neither it returns null",
        "With no end trim, `playToEnd` is the loop point, and it seeks to `start`, not 0",
        "Native `loop` restarts at 0:00, so the trimmed head would flash on every loop until the next `timeUpdate` clamps it back, with two loop mechanisms competing",
        "Seeks go through `seekBy`, and `play()` only resumes when the page is `active`",
        "The decision lives in the pure `utils/trim.ts` and is unit-tested in `trim.test.ts`",
      ],
      explain:
        "With `trimStartMs = 3000` and `trimEndMs = null`, setup seeks to 0:03. `timeUpdate` calls `trimLoopSeek(currentTime, 3, null)`, which returns null: there is no end trim and the position is not before the start. Native looping is off, so the clip really ends and `playToEnd` fires; `trimLoopSeek(..., true)` returns 3, the handler seeks back with `seekBy` and calls `play()` if the page is still active. Every loop starts at 0:03. With `p.loop = end == null`, native looping would restart at 0:00. The start clamp in `trimLoopSeek` (`currentSec < startSec - 0.1` returns `startSec`) would pull it back, but only on the next `timeUpdate`, so each loop would flash up to a quarter second of the trimmed head, and two loop mechanisms would compete. Clips with an end trim would be fine, since `timeUpdate` seeks back before the file ends.\n\n**Trade-off.** Looping by hand costs a tiny hitch at the loop point and buys one code path that respects the start for every combination of null start and end. The 0.1 s tolerance exists because a seek lands near, not exactly on, its target.\n\n**Takeaway.** Put the decision in a pure function with tests (`trim.test.ts`). See milestone **M7** in docs/02-camera-social.html.",
      links: [
        { title: "expo-video API reference", url: "https://docs.expo.dev/versions/latest/sdk/video/" },
        { title: "React: keeping components pure", url: "https://react.dev/learn/keeping-components-pure" },
      ],
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
        "The editor promises that \"preview ≠ output\" bugs are designed out, even though the preview draws a ≤1600 px proxy with Skia on the GPU and the export runs expo-image-manipulator on the full-resolution file. Explain the mechanisms that make this hold, and why re-editing an already edited photo doesn't stack JPEG generations.\n\nSearch first: Trace one crop from `CropOverlay` to the saved file, listing every place the rect is converted; then locate the tests that guard each conversion.",
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
        "The editor never changes pixels while you work. It appends plain `Op`s, and both consumers derive from the same list through `resolveOperations`, one canonical edit `crop(flip(rotate(source)))`. The preview turns it into `previewSteps` applied as a Skia `<Group transform>`; the export runs manipulator rotate, flip, crop in the same order. The crop is a **normalized** 0..1 rect, so the 1600 px proxy from `makePreviewProxy` and the full-size original map onto it the same way; `cropToPixels` produces integers only at export. Colour is a single `buildColorMatrix` result used by the preview `<ColorMatrix>` and the export `ColorFilter.MakeMatrix`. Tests pin it: `operations.test.ts` maps source corners through `applySteps`, `applyOperations.test.ts` checks the call order.\n\nRe-editing: the derived row stores `source_id` and `operations`; `pickEditBase` reopens the original with those ops on the undo stack, so each save is one encode from the original, not a JPEG of a JPEG.\n\n**General cure.** One source of truth that every renderer derives from. See the whole **Key architectural decision** section in docs/02-camera-social.html.",
      links: [
        { title: "expo-image-manipulator API reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" },
        { title: "Skia: color filters (ColorMatrix)", url: "https://wcandillon.github.io/react-native-skia/v2/docs/color-filters/" },
        { title: "Skia: images", url: "https://wcandillon.github.io/react-native-skia/v2/docs/images/" },
      ],
    },
    {
      id: "camera-social-41",
      type: "mcq",
      level: 3,
      topics: ["Reanimated", "Testing"],
      files: [
        "src/projects/camera-social/utils/zoom.ts",
        "src/projects/camera-social/hooks/useCameraController.ts",
        "src/projects/camera-social/__tests__/utils.test.ts",
      ],
      prompt:
        "An earlier version of `utils/zoom.ts` declared `function factorToZoom(factor: number, max = MAX_ZOOM_FACTOR) { \"worklet\"; … }`. Every Jest test passed and dev builds looked fine, yet a Release build crashed as soon as the camera screen opened. Why, and what does the current code do instead?\n\nSearch first: Read the comment above `factorToZoom` in `utils/zoom.ts`, then find where `useCameraController` calls these helpers from a gesture; check the worklets docs for what a worklet captures from its closure.",
      choices: [
        "The worklets plugin captures closure variables used in the function body, but not ones referenced only from a default parameter, so `MAX_ZOOM_FACTOR` is `undefined` on the UI runtime. The helpers now take an optional `maxFactor` and resolve `maxFactor ?? MAX_ZOOM_FACTOR` inside the body.",
        "Default parameters are a syntax error on the UI runtime, so the helpers now use `arguments.length` to detect a missing argument.",
        "Exported `const`s are frozen in Release builds, so `MAX_ZOOM_FACTOR` had to become a shared value read with `.get()`.",
        "Release builds strip the `\"worklet\"` directive, so the helpers ran on the JS thread and the camera's `zoom` prop received a promise.",
      ],
      answer: 0,
      explain:
        "A worklet is serialized to the UI runtime together with the closure variables the plugin finds in its **body**. A module constant referenced only from a default parameter (`max = MAX_ZOOM_FACTOR`) isn't captured, so on the UI thread the default evaluates to `undefined`, and the zoom math called from the camera's gesture and animated props breaks the Release build as the camera screen opens. The fix keeps the call sites unchanged: the parameter becomes `maxFactor?: number` and the body resolves `const max = maxFactor ?? MAX_ZOOM_FACTOR`, which the plugin does capture.\n\n**Why tests didn't catch it.** Jest calls the helpers as plain functions on the JS thread, where the default parameter works normally. Only a device run of the worklet path (ideally a Release build) exercises the capture.\n\n**Takeaway.** In a `\"worklet\"` function, read every outside value in the body. See milestone **M2** and the failure mode **A worklet that only crashes in Release** in docs/02-camera-social.html.",
      links: [
        { title: "Reanimated: worklets", url: "https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets" },
        { title: "Worklets: troubleshooting", url: "https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting" },
      ],
    },
    {
      id: "camera-social-42",
      type: "multi",
      level: 3,
      topics: ["Media", "Permissions", "Platform Differences", "Config Plugins"],
      files: [
        "src/projects/camera-social/hooks/useCapture.ts",
        "src/projects/camera-social/utils/shareOut.ts",
        "src/projects/camera-social/editor/nativeDeps.ts",
        "app.config.ts",
      ],
      prompt:
        "Several camera-social fixes work around platform behaviour rather than app bugs. Select all the statements that match the current code.\n\nSearch first: Read `stopRecording` in `hooks/useCapture.ts`, `saveToGallery` in `utils/shareOut.ts`, `decodeForSkia` in `editor/nativeDeps.ts`, and the permission constants at the top of `app.config.ts`.",
      choices: [
        "On iOS a `stopRecording()` that arrives before the native recorder has started is a silent no-op, so `useCapture` re-sends it every 250 ms, up to 20 times, until `recordAsync` settles",
        "On iOS `saveToGallery` checks `getPermissionsAsync(false)` without prompting and, unless `accessPrivileges` is `\"all\"`, saves with `Asset.create(uri)` and no album",
        "When Skia can't decode the file (HEIC), `decodeForSkia` transcodes it to JPEG with `expo-image-manipulator` and decodes again",
        "`expo-camera`, `expo-image-picker` and `expo-media-library` get the same `CAMERA_PERMISSION` / `PHOTOS_PERMISSION` strings, because iOS keeps one usage string per permission and the first plugin to set it wins",
        "`saveToGallery` requests full library access first and only falls back to write-only if the user declines",
        "The HEIC fallback converts pixels to a JS array and applies the colour matrix in a loop",
      ],
      answer: [0, 1, 2, 3],
      explain:
        "All four true statements are platform facts the code accommodates. iOS configures the movie output before recording starts, and `stopRecording()` in that window does nothing, so `useCapture` keeps re-sending it (250 ms, max 20 tries) and `cancelStopRetry()` runs as soon as `recordAsync` resolves or rejects. On iOS, adding to the library works with add-only access, but reading or creating an album needs full access; the non-prompting `getPermissionsAsync(false)` decides whether to use the album or just Recents. Skia's `MakeImageFromEncoded` returns null for HEIC, which a filter-only edit would pass straight through, so `decodeForSkia` lets the platform decoder re-encode it as JPEG first. iOS has one `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` per app, so every plugin gets the shared constants.\n\nThe false ones: `saveToGallery` only ever *requests* write-only access (`requestPermissionsAsync(true)`), and nothing moves pixels through JS; the fallback is a native transcode.\n\nSee **The media pipeline**, milestones **M6** and **M7**, and the failure modes in docs/02-camera-social.html.",
      links: [
        { title: "expo-camera API reference", url: "https://docs.expo.dev/versions/latest/sdk/camera/" },
        { title: "expo-media-library API reference", url: "https://docs.expo.dev/versions/latest/sdk/media-library/" },
        { title: "expo-image-manipulator API reference", url: "https://docs.expo.dev/versions/latest/sdk/imagemanipulator/" },
        { title: "Skia: images", url: "https://wcandillon.github.io/react-native-skia/v2/docs/images/" },
      ],
    },
  ],
});

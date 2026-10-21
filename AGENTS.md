# AGENTS.md

This file gives AI agents detailed guidance for working on the code in this repository.

## Project Overview

This is a React Native learning repo: a **launcher app** that holds six isolated sample projects,
one for each write-up in `docs/` (see `docs/learning-path.html`). Each project is a vertical slice of
routes, components, hooks, stores, API calls and models, kept under its own directories.

| # | Project | Slug | Doc |
| --- | --- | --- | --- |
| 01 | Offline-first journal (SQLite, FTS, outbox sync, biometric lock) | `offline-journal` | `docs/01-offline-journal.html` |
| 02 | Camera & social capture (camera, editor, media library, sharing) | `camera-social` | `docs/02-camera-social.html` |
| 03 | Production commerce app (auth, refresh, checkout, payments, push) | `store` | `docs/03-commerce-platform.html`, `docs/audit-03.html` |
| 04 | Background fitness tracker (location task, sensors, native module, widgets) | `fitness-tracker` | `docs/04-fitness-tracker.html` |
| 05 | Podcast player & release pipeline (audio, downloads, EAS Update, CI) | `podcast-player` | `docs/05-podcast-player.html`, `docs/release-05.html` |
| 06 | Tic-tac-toe with Zustand (warm-up) | `tic-tac-toe` | `docs/06-tic-tac-toe.html` |

**Key Tech Stack:**
- Expo SDK 57, React Native 0.86.3, React 19.2.3 with the React Compiler, TypeScript 6
- Expo Router (file-based, typed routes, `Stack.Protected`, `+native-intent`)
- TanStack Query v5 (one app-wide client) and Zustand v5
- expo-sqlite (journal, camera, fitness, podcast each have their own DB file)
- Reanimated 4 + react-native-worklets, Gesture Handler, Skia, FlashList v2
- Jest (`jest-expo`) for unit tests, Maestro for e2e

## Development Commands

```bash
npm start              # Expo dev server
npm run ios            # expo start --ios
npm run android        # expo run:android
npm run web
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint — exit code 0 and no output when clean
npm test               # jest (in this sandbox: npx jest --no-watchman)
npx expo export --platform ios --output-dir /tmp/out   # bundle check — catches what tsc can't
node docs/training/validate.mjs   # quiz banks: shape, answers, and that every referenced file exists
node docs/training/check-links.mjs   # official-docs links in the quiz banks (needs internet)
```

Most projects need a **development build**, not Expo Go:

```bash
eas build --profile development --platform ios --local
npx expo run:ios       # needs `cmake` for pod install (Hermes podspec)
```

**Installing packages:** use `npx expo install`. Behind the sandbox proxy, prefix it with
`EXPO_OFFLINE=1`; versions then come from the locally bundled SDK manifest.

## Architecture & Code Organization

### Top-Level Shape

```
src/
├── app/            routes only (expo-router owns this tree)
│   ├── _layout.tsx         root providers + root-level side effects (see below)
│   ├── +native-intent.tsx  rewrites external URLs onto namespaced routes
│   ├── index.tsx           launcher list, rendered from the registry
│   └── projects/<slug>/    each project's routes, with its own _layout.tsx
├── assets/         images, fonts
├── projects/<slug>/  per-project code: api/ components/ db/ hooks/ models/
│                     stores/ utils/ … and __tests__/
├── shared/         generic infra used by more than one project or the launcher
└── types/          global type declarations

app.config.ts       dynamic Expo config (replaces app.json)
modules/live-activity/  local Expo Module, Swift + Kotlin (Project 04)
plugins/            hand-written config plugins (Project 04)
.github/workflows/  ci.yml, release.yml, fingerprint.yml (Project 05)
.maestro/           e2e flows: store-checkout.yaml, podcast-smoke.yaml
docs/               GitHub Pages site (Settings → Pages → main, /docs; `.nojekyll`, so files are
                    served as-is): index.html front page, learning-path.html curriculum,
                    write-ups 00–06, audit-03.html, release-05.html, well-known templates.
                    Keep it plain HTML: a .md here is served as raw text.
docs/training/      code-reading quizzes, one bank per project (static page, see its README;
                    standalone quiz.css, no external deps, must keep working over file://)
```

`modules/` and `plugins/` sit at the repo root because Expo's autolinker and prebuild look for
them there. App code only touches the thin wrapper in `src/projects/fitness-tracker/liveactivity/`.

The project registry is `src/shared/config/projects.ts`, a typed array that the launcher maps
over (each entry has a `slug`; `singleScreen` marks a single-route project). The launcher row
is `src/shared/components/project-list-item.tsx`. The launcher and the root Stack have no
hardcoded knowledge of any project.

### Routing

- The root `src/app/_layout.tsx` declares **one** `Stack.Screen` per project
  (`projects/<slug>`, `headerShown: false`, generated from `PROJECTS`). Each project's own
  `_layout.tsx` owns its inner Stack: tabs, modals, `SQLiteProvider`, mini-player host, and so on.
- `projects/tic-tac-toe/index.tsx` is the one single-route project (`singleScreen: true`, declared
  as `projects/tic-tac-toe/index` with the registry `title` as its header). Its `combine` store and
  components stay in the route file. The pure game helpers live in
  `src/projects/tic-tac-toe/utils/game.ts` so they can be unit-tested.
- **Routes come from the file tree, not from `Stack.Screen` declarations.** Any file under
  `src/app/` is a reachable route. Non-route components must live in a slice, never under
  `src/app/`.
- Expo Router has **no route-level `options` export**. Set options from the parent layout's
  `Stack.Screen`, an inline `<Stack.Screen options={...} />`, or `navigation.setOptions()`.
- **Never import `@react-navigation/*`.** Since SDK 56, expo-router fails the *bundle* (not tsc)
  on it. Use `expo-router/react-navigation` (for example `useHeaderHeight`, themes) or
  `expo-router` (`useIsFocused`, `useFocusEffect`).
- Deep links are namespaced, because the launcher owns the root:
  `whynotreactnative://projects/<slug>/…`. Universal links (`https://<linkDomain>/p/<id>`,
  `/order/<id>`, `/post/<id>`) and the share-extension callback are rewritten in
  `+native-intent.tsx` by pure, unit-tested rewriters that live in each slice.

Store route groups (Project 03): `(auth)/{sign-in,sign-up,forgot}`, `onboarding`, and
`(app)/{(tab)/{index,categories,search,bag,account}, product/[id], products/[categoryId],
checkout/{address,shipping,payment,review}, order/[id], orders, wishlist}`. These are guarded
by `Stack.Protected` in `src/app/projects/store/_layout.tsx`. The group segments don't appear
in URLs, so the store tabs live at `/projects/store`.

### Root-level side effects (important)

A project layout only loads once the user opens that project. Anything that must exist on a
**headless or cold launch** is therefore started from `src/app/_layout.tsx`:

- `TaskManager.defineTask` modules: `offline-journal/sync/task`, `fitness-tracker/tracking/task`,
  `podcast-player/downloads/task`. Each one is guarded with `TaskManager.isTaskDefined`.
- Notification-tap routing: `startNotificationResponseListener()` (store) and
  `startJournalNotificationRouting()` (journal). These only listen and route. Push permission is
  requested from the store's signed-in session, never at the root.
- `startPendingActionReplay()` (fitness): replays a Live Activity / notification action that was
  parked while JS was dead, on launch and whenever the app becomes active. The replay only calls
  `pause/resume/stopWorkout`, so it's safe with no UI mounted.
- `ShareIntentProvider` plus `useInboundShareRouting()` (camera-social inbound share).

`expo-notifications` is process-global. Every push or local-notification payload carries a
project discriminator (`project: "store"`, or `url` starting with `/projects/offline-journal/`),
and each router ignores payloads that aren't its own.

### State Management

- **TanStack Query:** a single `QueryClient` in `src/shared/providers/QueryProvider.tsx`,
  mounted once at the root. That module also wires the process-global `focusManager` (AppState)
  and `onlineManager` (expo-network) once for every project. The client is exported so a
  project can attach a persister or query defaults from its own slice. Never mount a second
  provider. Each project owns its
  query keys in `src/projects/<slug>/utils/queryKeys.ts`, prefixed with its own root
  (`["store", …]`, `["podcast", …]`). The store persists only keys that start with `"store"`.
- **Zustand:** per-project stores in `src/projects/<slug>/stores/`. Persisted stores use
  AsyncStorage through `zustand/middleware`. Tic-tac-toe uses `combine`, declared inline.
- **SQLite:** each project opens its own database file and runs its own `PRAGMA user_version`
  migrations in WAL mode. The journal and camera use `SQLiteProvider onInit` in their layouts
  (the journal's sync task uses a lazy `getDb()`; both paths go through `migrateOnce`, because
  expo-sqlite shares one native connection for the same name and options). Fitness and podcast open the
  database lazily from a module-scope `db/client.ts`, because their background tasks write
  with no screen mounted.

### API Layer

- `src/shared/api/axios.ts` holds **project-agnostic defaults only**: timeout and headers, no
  base URL and no interceptors. Projects derive their own instances with
  `axiosInstance.create({ baseURL })`.
- The store's instances are in `src/projects/store/api/client.ts`. Auth handling
  (`api/interceptors.ts`: refresh once on a 401, replay once, sign out on failure) and the
  single-flight `api/refreshCoordinator.ts` are installed onto those instances only.
- When `EXPO_PUBLIC_STORE_BACKEND_URL` is unset, `api/mockServer.ts` is a persisted on-device
  backend with idempotency keys and server-owned order status.
- Naming: GET → `fetchX`, POST → `createX` or an action verb (`loginUser`), PUT/PATCH →
  `updateX`, DELETE → `deleteX`.

### Components

- **Components are dumb and reusable.** They take plain data and callbacks, never a store or
  view model. Screens own state through hooks and stores. When a list row must subscribe on
  its own for performance (FlashList rows reading a download store), the connected wrapper
  lives in `src/projects/<slug>/containers/` and renders a dumb row from `components/`
  (podcast: `MiniPlayerHost`, `LiveEpisodeRow`, `LiveTransferRow`).
- Shared primitives: `src/shared/components/` (`themed-text`, `themed-view`) and `ui/`
  (`icon-symbol` + `.ios`, and `content-unavailable-view`, which is theme-aware and takes
  optional `titleColor` / `descriptionColor` overrides and an `action` button).
- Platform-specific files use `.ios.tsx` / `.android.tsx` / `.web.ts`.
- `ColorSchemeName` includes `"unspecified"`, so narrow it before indexing:
  `colorScheme === "dark" ? "dark" : "light"`.

### React Compiler rules that bite

- Don't mutate a value returned from a hook (`player.currentTime = x`). Call a method instead
  (`player.seekBy(...)`).
- Don't read refs off an object during render (`refs.a`). Use one `const aRef = useRef()` each.
- Don't call `setState` synchronously in a `useEffect` body. Derive the value during render, or
  refresh it in `useFocusEffect`.
- `StyleSheet.absoluteFillObject` no longer exists in RN 0.86. Use `StyleSheet.absoluteFill`.

## Expo Configuration (`app.config.ts`)

- **Variants:** `APP_VARIANT` = `development` | `preview` | `production`, set per EAS profile.
  These give the bundle ids `org.imaginativeworld.whynotreactnative.dev` / `.preview` / base,
  installable side by side.
- **Runtime version:** `{ policy: "fingerprint" }`. EAS Updates use
  `https://u.expo.dev/<projectId>`. The channels are `development`, `preview` and
  `production` (see `eas.json`). `eas.json` `env` applies to **builds only**, and the bundle id
  feeds the fingerprint, so every `eas update` / `eas fingerprint:*` must set the matching
  `APP_VARIANT` or it computes the development runtime version. Publish with
  `eas update --channel <name>`, never a hand-picked `--branch`.
- **`extra`** is read through `src/shared/constants/env.ts`: `storeApiUrl`, `podcastIndexUrl`,
  `linkDomain`, `appGroup`, `stripePublishableKey`, `journalSyncUrl` (empty means the local dev
  server: `localhost` on iOS, `10.0.2.2` on the Android emulator).
- **Environment variables:** `APP_VARIANT`, `STORE_API_URL`, `LINK_DOMAIN`,
  `GOOGLE_MAPS_API_KEY`, `JOURNAL_SYNC_URL`, `EXPO_PUBLIC_STRIPE_KEY`,
  `EXPO_PUBLIC_STORE_BACKEND_URL`, `EXPO_PUBLIC_GOOGLE_{IOS,ANDROID,WEB}_CLIENT_ID`.
  Secrets go in EAS environment variables, never in the config.
- **iOS:** associated domains, the App Group `group.org.imaginativeworld.whynotreactnative`,
  Sign in with Apple, and `privacyManifests`.
- **Plugins:** expo-router, splash, sqlite, secure-store, notifications, local-authentication,
  image-picker, camera, media-library, video, audio (background playback), location
  (background + foreground service), sensors, maps, Stripe, HealthKit, Health Connect,
  `./plugins/withWorkoutCapabilities`, expo-share-intent.
- **Plugin order matters:** mods of *later* plugins run *first*. `withWorkoutCapabilities` is
  listed before `expo-share-intent` so that it runs after it and dedupes the shared App Group.
- New Architecture is on by default, React Compiler and typed routes are enabled, and there is
  no `newArchEnabled` flag.

### Continuous Native Generation

`/ios` and `/android` are gitignored build output. Every native change must be expressible in
`app.config.ts`, a config plugin or a local module. To verify a plugin:
`npx expo prebuild --platform ios --no-install --clean`, then inspect the generated project.
Two cautions:
- `prebuild` rewrites the `ios` script in package.json to `expo run:ios`. Restore that one line
  with a targeted edit. **Never `git checkout package.json`**, which also throws away
  uncommitted dependency changes.
- Back up a local `android/` folder before running `prebuild --clean` on it.

## Testing

- Unit tests live in `src/projects/<slug>/__tests__/*.test.ts`, never under `src/app/` (that
  would make them routes).
- Test pure modules: metrics/filters, queue and download policy, checkout machine, cart merge,
  link rewriters, operation-list editor math, and so on. The store's refresh test drives the
  real interceptors through a custom axios `adapter` (six concurrent 401s → one refresh).
- Config plugins are tested in memory with `compileModsAsync(config, { introspect: true })`
  under `@jest-environment node`. Import `ExpoConfig` from `expo/config`. Test the inner
  plugin, not the `createRunOncePlugin` wrapper, when checking that mods are idempotent.
- SQL (migrations, triggers, the journal sync engine) is tested against real SQLite through
  Node's built-in `node:sqlite` (Node 22.5+). See `src/projects/offline-journal/testing/nodeDatabase.ts`.
- TypeScript 6 doesn't auto-load `@types/*`, so `tsconfig.json` sets `"types": ["jest"]`.
- E2E: the Maestro flows in `.maestro/` use `appId: ${APP_ID}`. Pass
  `-e APP_ID=org.imaginativeworld.whynotreactnative.dev` (or `.preview`, as CI does).
- A milestone is done when typecheck, lint, test and both `expo export` platforms all pass.

## Path Configuration

The path alias `@/*` maps to the project root:
`import { env } from "@/src/shared/constants/env";`

| Path | Holds |
| --- | --- |
| `src/app/` | Routes only (expo-router) |
| `src/assets/` | Images, fonts |
| `src/projects/<slug>/` | One project's code |
| `src/shared/` | Generic infra: `api/`, `components/`, `config/`, `constants/`, `hooks/`, `providers/` |
| `src/types/` | Global type declarations |

### Isolation Rules

1. **No cross-project imports.** Nothing in `src/projects/camera-social/` may import from
   `src/projects/store/`. If two projects need the same thing, promote it to `src/shared/`
   deliberately. (`src/app/_layout.tsx` and `+native-intent.tsx` are the composition root and
   may import one entry point from each project.) `eslint.config.js` enforces this with
   `no-restricted-imports`, one block per slug, generated from the folders in `src/projects/`.
   It also stops `src/shared/` from importing any project.
2. **Shared stays small.** Promote a file only when a *second* project actually needs it.
3. **Each project owns its own query keys, stores, database and API endpoint files.**
4. **Components stay dumb.** A component never assumes a specific project's provider tree
   unless it lives in that project.

## Environment

- Bundle identifier / package (production): `org.imaginativeworld.whynotreactnative`. Dev and
  preview add `.dev` / `.preview`.
- URL scheme: `whynotreactnative://`
- EAS Project ID: `14c49066-d1a8-4fd8-a15b-4d290153a787`
- Lessons from building each project: `.agents/lessons/_learned.md`

# Why-Not-ReactNative

A hands-on Expo + React Native learning path. The app is a **launcher**: open it and pick one of
six isolated projects. Each one implements a write-up in [`docs/`](docs/index.html).

| # | Project | What it teaches |
| --- | --- | --- |
| 01 | [Offline Journal](docs/01-offline-journal.html) | SQLite migrations, FTS search, outbox sync, background task, local notifications, biometric lock |
| 02 | [Camera & Social](docs/02-camera-social.html) | Camera and permissions, Reanimated/Gesture editor with Skia filters, media library, inbound/outbound sharing, video |
| 03 | [Commerce](docs/03-commerce-platform.html) | Protected routes, token refresh, secure storage, OAuth, checkout, Stripe, push, universal links ([audit](docs/audit-03.md)) |
| 04 | [Fitness Tracker](docs/04-fitness-tracker.html) | Background location, sensors, maps, a config plugin, a Swift/Kotlin Expo Module, Live Activity, widgets, health sync |
| 05 | [Podcast Player](docs/05-podcast-player.html) | Background audio, lock screen, downloads, EAS Build/Update, rollouts, CI/CD ([runbook](docs/release-05.md)) |
| 06 | [Tic-Tac-Toe](docs/06-tic-tac-toe.html) | Zustand with TypeScript (warm-up) |

Built with Expo SDK 57, React Native 0.86, React 19.2 + React Compiler, Expo Router,
TanStack Query, Zustand, Reanimated 4 and Skia.

## Get started

```bash
npm install
npm start               # Expo dev server
```

Most projects use native modules that Expo Go doesn't include, so use a development build:

```bash
eas build --profile development --platform ios --local
# or: npx expo run:ios / npx expo run:android
```

Each build variant (`development`, `preview`, `production`) installs side by side with its own
bundle id. See [`app.config.ts`](app.config.ts) and [`eas.json`](eas.json).

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx expo export --platform ios   # bundle check
```

CI runs the same steps (see [`.github/workflows/`](.github/workflows)). E2E flows live in
[`.maestro/`](.maestro).

## Common commands

### Dev server

```bash
npx expo start                   # start Metro
npx expo start --clear           # start with a cleared Metro cache
npx expo start --dev-client      # open in the installed development build
npx expo start --tunnel          # reach a device that isn't on the same network
```

In the running dev server: `i` opens iOS, `a` opens Android, `w` opens web, `r` reloads,
`m` toggles the dev menu, and `j` opens the debugger.

### Native builds (local)

```bash
npx expo run:ios                 # build and launch on the iOS simulator
npx expo run:ios --device        # build onto a connected iPhone
npx expo run:android             # build and launch on an emulator or device
npx expo prebuild --clean        # regenerate ios/ and android/ from app.config.ts
npx expo prebuild --platform ios --no-install --clean   # inspect plugin output only
```

`ios/` and `android/` are generated and gitignored. After running `prebuild`, restore the
`ios` script in `package.json`, because prebuild rewrites it.

### Dependencies

```bash
npx expo install <package>       # install a version that matches the SDK
npx expo install --check         # list packages that don't match the SDK
npx expo install --fix           # upgrade those packages to matching versions
npx expo-doctor                  # check project health
npx expo config --type public    # print the resolved app.config.ts
```

### EAS Build, Update and Submit

```bash
eas login
eas build --profile development --platform ios            # simulator dev build
eas build --profile development-device --platform ios     # dev build for a physical device
eas build --profile preview --platform android            # internal APK
eas build --profile production --platform all
eas build --profile development --platform ios --local    # build on this machine
eas update --channel preview --message "fix: ..."         # ship an OTA update
eas submit --profile production --platform ios
eas env:list                                              # list EAS environment variables
```

### Testing

```bash
npx jest --watch                 # unit tests in watch mode
npx jest path/to/file.test.ts    # run a single test file
maestro test .maestro/           # e2e flows (needs a running dev or preview build)
```

### Troubleshooting

```bash
npx expo start --clear                        # stale bundle or a transform error
rm -rf node_modules && npm install            # broken install
cd ios && pod install --repo-update && cd ..  # stale pods after a native dependency change
npx expo prebuild --clean                     # native project drifted from the config
```

## Where things live

- `src/app/`: routes only. Each project has its own subtree at `src/app/projects/<slug>/`.
- `src/projects/<slug>/`: that project's code. Projects never import from each other.
- `src/shared/`: the small amount of infrastructure more than one project uses.
- `modules/`, `plugins/`: the local native module and config plugins (Project 04).

[`AGENTS.md`](AGENTS.md) has the full architecture and conventions.
[`docs/00-launcher-restructure.html`](docs/00-launcher-restructure.html) explains how the repo
became a launcher.

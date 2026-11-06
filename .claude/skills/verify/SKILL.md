---
name: verify
description: Drive the launcher app in the iOS simulator with Maestro to check flows and UI (padding, clipping).
---

Setup that worked (iPhone 17 Pro sim, existing WNRNDev dev build in DerivedData):

1. Boot sim, `xcrun simctl install booted <DerivedData>/WNRNDev-*/Build/Products/Debug-iphonesimulator/WNRNDev.app`.
2. Start Metro with the sandbox proxy removed, or the manifest request fails with
   "HTTP Proxy Network Error: Forbidden" and the dev launcher crashes:
   `env -u HTTP_PROXY -u http_proxy -u HTTPS_PROXY -u https_proxy EXPO_OFFLINE=1 APP_VARIANT=development npx expo start --dev-client --port 8081`
3. Maestro flow: `launchApp`, `openLink: org.imaginativeworld.whynotreactnative.dev://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`, optional tap "Open", then wait ~60s for the first bundle.
4. Dismiss the dev-menu intro, turn off "Tools button" in the dev menu (it overlaps headers).

Gotchas:
- mobile MCP can't install its agent here (GitHub download Forbidden). Use Maestro + `xcrun simctl io booted screenshot`.
- `takeScreenshot` needs a relative name plus `--test-output-dir`. Point taps need whole-number percentages (`"85%,43%"`). No `swipeUp`/`back` on iOS: use `swipe: start/end` and tap the back button.
- Tab bar labels are combined strings ("Calendar, tab, 2 of 4"): tap by point (y≈94%).
- Pipe maestro into `grep`, never `head` (SIGPIPE kills the run).
- Game/journal state persists between runs.

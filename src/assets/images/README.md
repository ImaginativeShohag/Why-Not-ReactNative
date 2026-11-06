# App icon

`icon.svg` is the vector source for the selected **WHY NOT? atom** design.
Its lettering and orbits are traced paths, with no embedded raster image or font
dependency. It closely reproduces the draft's geometry and colors; the generated
draft's raster texture and antialiasing are not identical to the vector render.

The Expo config uses PNG exports for native launcher compatibility:

- `icon.png`: opaque 1024 × 1024 icon for iOS and the Android legacy fallback.
- `adaptive-icon.png`: transparent 1024 × 1024 Android foreground with safe padding.
  Its navy background is set separately in `app.config.ts`.
- `favicon.png`: opaque 64 × 64 web icon.
- `splash-icon.png`: transparent artwork for the native splash in both themes,
  on the same navy background configured in `app.config.ts`.
- `monochrome-icon.png`: white alpha mask for Android themed launcher icons.
- `docs/assets/branding/`: SVG favicon/header logo, PNG fallback favicon, and
  Apple touch icon shared by every documentation page, including the quiz.

After editing the SVG, regenerate all app and website exports from the repository root:

```sh
node scripts/generate-app-icons.cjs
```

The script requires `sharp` in your tooling environment. If it is installed
outside the project, set `SHARP_MODULE_PATH` to that package's absolute path.
It is an asset-authoring tool, not an app runtime dependency.

Launcher icon changes require a new native build; an OTA update cannot replace
an installed app's launcher icon.

When `android/` already exists, regenerate its native resources before rebuilding:

```sh
npx expo prebuild --platform android --no-install
npx expo run:android
```

`expo run:android` can reuse the existing native project, so rebuilding alone
can retain old launcher resources after changing the source icons.

For iOS, regenerate with `npx expo prebuild --platform ios --no-install` before
the next native build as well. Check any script changes made by prebuild and
preserve the existing `ios` development command. The website files must be
published through the normal GitHub Pages deployment to update the live site.

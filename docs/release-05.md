# Project 05 · Release runbook

How this repo is built, updated over the air, rolled out, rolled back and
checked in CI. Every command below was checked against the current EAS CLI
docs. The doc's rule applies throughout: **an OTA may only carry JavaScript and
assets.**

## Build profiles (`eas.json`)

| Profile | Distribution | Channel | `APP_VARIANT` | Installs as |
| --- | --- | --- | --- | --- |
| `development` | internal, dev client, simulator | `development` | development | `org.imaginativeworld.whynotreactnative.dev` |
| `development-device` | internal, dev client, device | `development` | development | same as above |
| `preview` | internal (APK / ad-hoc) | `preview` | preview | `….preview` |
| `production` | store, `autoIncrement` | `production` | production | base id |

All three variants can be installed side by side, because `app.config.ts` gives
each one its own bundle id and name.

```bash
eas build --profile preview --platform android            # QR / link for testers
eas build --profile production --platform ios --local     # compare with the cloud build
eas submit --profile production --platform ios            # TestFlight
```

## Channels, branches, runtime versions

```
build  ──has──►  channel   (baked into the binary: "production")
                    │  mapped server-side, can change at any time
                    ▼
                 branch    ("preview", "release-1.4")
                    │
                    ▼
                 update    (JS bundle + assets)
```

- **Runtime version.** `app.config.ts` uses `runtimeVersion: { policy: "fingerprint" }`. The fingerprint hashes the native inputs: dependencies with native code, config plugins and `app.config.ts`. Add a native module or change a plugin and the runtime version changes, so older binaries stop receiving new updates. That's correct behaviour, and it's what makes "OTA with a missing native module" impossible.
- **Channel → branch mapping.** It lives on the server, not in the binary.
  The first build (or `eas update --channel`) for a channel creates the channel
  pointing at a branch with the same name, so out of the box `preview` reads
  `preview` and `production` reads `production`. This repo has exactly the three
  channels from `eas.json`: `development`, `preview`, `production`. There is no
  `staging` channel.

```bash
eas channel:view production                       # which branch does production read?
eas channel:edit production --branch release-1.4  # repoint it (e.g. for a release branch)
```

Publishing to a branch that no channel points at is the classic way to have
"nobody got the update". CI avoids it by publishing with `--channel preview`
(the update goes to whatever branch that channel reads) instead of a hardcoded
`--branch`. When you publish by branch yourself, check `eas channel:view` first.

- **`APP_VARIANT` when publishing.** `eas.json`'s `env` only applies to builds.
  `app.config.ts` changes the bundle id and name per variant, and the app config
  feeds the fingerprint, so `eas update` must run with the same `APP_VARIANT` as
  the target builds (`release.yml` sets it), or the update is stamped with the
  development runtime version and reaches nobody.

## Publishing and staged rollout (M7)

```bash
# 1. Publish to the release branch at 10%.
APP_VARIANT=production eas update --branch release-1.4 --environment production \
  --message "fix scrubber jump" --rollout-percentage 10

# 2. Watch the crash-free rate and errors, then widen.
eas update:edit <GROUP_ID> --rollout-percentage 50
eas update:edit <GROUP_ID> --rollout-percentage 100
```

Users outside the rollout keep getting the previous latest update on the branch.

**To check on a device:** relaunch twice. The first launch downloads the update
and the second applies it. That's the default `checkAutomatically: "ON_LOAD"`
with `fallbackToCacheTimeout: 0` in `app.config.ts`.

### Rollback drill

```bash
# The bad group must be the latest on its branch + runtime version.
eas update:rollback <BAD_GROUP_ID> --message "roll back scrubber change"
# → republishes the previous group, or rolls back to the embedded bundle if none.

# Mid-rollout alternative: undo the rollout itself.
eas update:revert-update-rollout
```

Practise this on purpose: publish a visible but non-crashing change, roll it
back, and confirm both phones come back to the good bundle.

### Branch rollout (whole-branch canary)

```bash
eas channel:rollout production        # move a channel to a new branch gradually
```

## In-app update experience (`src/projects/podcast-player/lib/updates.ts`)

| Mode | Where | Use for |
| --- | --- | --- |
| Silent (default) | expo-updates downloads on launch and applies on the next one | Most fixes |
| Prompt to restart | `UpdateBanner` ("Update ready · Restart", `reloadAsync()`) | Visible fixes |
| Channel surfing (testers only) | Podcast **Settings → Channel surfing**, using `switchChannel()` → `Updates.setUpdateRequestHeadersOverride({ "expo-channel-name": … })`. The chips offer the real channels (`development`, `preview`, `production`); a free-text field covers any other channel you create | Test a preview bundle on another build with the same runtime version |

## CI/CD (`.github/workflows/`)

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | every PR, pushes to `main`/`dev` | `npm ci` → typecheck → lint → jest → `expo export` for iOS and Android. The Maestro job runs only on PRs labelled `e2e`: it builds a preview APK on EAS, downloads it and runs every flow in `.maestro/` on Maestro Cloud with `APP_ID=org.imaginativeworld.whynotreactnative.preview`. |
| `release.yml` | push to `main` | `ota-preview`: `APP_VARIANT=preview eas update --channel preview --environment preview` (OTA to testers on preview builds) |
| `release.yml` | tag `v*` | `eas build --profile production --platform all --auto-submit`, then a GitHub release with notes |
| `fingerprint.yml` | nightly / manual | Compares the local fingerprint (`APP_VARIANT=production`, `--environment production`) with the last finished production build, per platform. **Warn-only by design:** drift is a `::warning::` and the job stays green, because it means "the next release needs a store build, not an OTA", not that something broke. Real errors (auth, `build:list`, `fingerprint:compare`, bad JSON) fail the job. `fingerprint:compare` exits 0 on drift, so drift is read from its `--json` hashes. |

**Maestro locally:** the flows take the app id as a parameter, because each
variant installs under its own id:
`maestro test -e APP_ID=org.imaginativeworld.whynotreactnative.dev .maestro/podcast-smoke.yaml`.

**Secrets:** `EXPO_TOKEN`, and `MAESTRO_CLOUD_API_KEY` for the e2e job.
Apple and Google credentials stay in EAS (`eas credentials`), never in GitHub.

**Source maps:** when a crash reporter is chosen (see `docs/audit-03.md`), add
its upload step after `eas update` / `eas build` in `release.yml`. A production
stack trace you can't read is one of the doc's failure modes.

## Store readiness (M8)

- **iOS privacy manifest.** Expo adds the SDK modules' manifests; the app declares its own required-reason APIs in `app.config.ts` under `ios.privacyManifests`:

  | API category | Reason | Why this app uses it |
  | --- | --- | --- |
  | `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | AsyncStorage / settings |
  | `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | Download manager and media files |
  | `NSPrivacyAccessedAPICategoryDiskSpace` | `E174.1` | Storage bar and download storage cap |
  | `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | React Native timing |

  Collected data types: none are sent off the device by the podcast player. The store and fitness projects declare their own (purchase history, health and fitness data, precise location).
- **Android data safety:** location (fitness), photos and videos (camera), health data (Health Connect), purchase history (store). No data is sold, and everything is encrypted in transit.
- **Screenshots:** have the Maestro flows end in `takeScreenshot`, then run them per device size.
- **Phased release:** App Store Connect's 7-day phased release, or Play's staged rollout. This sits on top of the OTA rollout above, which only covers JS.

## Failure-mode checklist

- [ ] Ship without `playsInSilentMode`. Mute-switch users get silence. (`playback/service.ts` sets it.)
- [ ] Resume after every interruption. Only resume if *we* paused, and only when the hint allows it.
- [ ] Unplug headphones and hear speaker blast. Route change must pause.
- [ ] Scrubber fight. Position updates must not overwrite the user's drag: `Scrubber.tsx` owns the position while dragging (`scrub`) and until the player confirms the seek (`settling`).
- [ ] Absolute paths in the DB. Downloads store `podcasts/<show>/<ep>.mp3` relative to Documents (`downloads/paths.ts`, tested).
- [ ] OTA with a missing native module. Prevented by the fingerprint runtime version; prove it once on a test channel.
- [ ] Channel/branch confusion. `eas channel:view` before every publish.
- [ ] Unbounded storage. The storage cap evicts played episodes only (`downloads/policy.ts`, tested).

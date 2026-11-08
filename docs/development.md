# Development

**Setup**

1. Clone the repo

```shell
$ git clone https://github.com/mrzmyr/pixy-mood-tracker.git
```

2. Install dependencies

```shell
$ bun install
```

3. Run the dev client with Metro on this checkout's simulator or emulator

```shell
$ bun app dev --platform=ios
$ bun app dev --platform=android
```

- Installs the cached dev client (Pixy Dev), starts Metro for this checkout, opens the app. Edits reload in the app.
- Dev client cache key is the native fingerprint only. Worktrees with the same native dependencies share one binary. Native compile runs only on a cache miss.
- Never search `ios/build` or `~/Library/Developer/Xcode/DerivedData` for builds. `bun builds list` shows every cached build.
- Phones: `bun ios --device <device-id>` or `bun android --device <device-name>` build and run the dev client with Metro in the foreground.

Android builds need Android SDK packages and JDK 17+. `bun android` resolves `ANDROID_HOME`, `ANDROID_SDK_ROOT`, the standard macOS SDK path, or Homebrew's Android command line tools, plus Homebrew's JDK 17. Set `ANDROID_HOME` or `JAVA_HOME` when using another install location.

### App variants

Three variants install side by side, each with its own name, icon, bundle ID, and URL scheme. [`app.config.ts`](../app.config.ts) picks one from `EXPO_PUBLIC_APP_VARIANT`, and fails when it is unset.

| Variant | App | Bundle ID | Scheme | Used for | PostHog / Sentry |
| --- | --- | --- | --- | --- | --- |
| `development` | Pixy Dev | `com.devmood.pixymoodtracker.dev` | `pixy-dev` | Dev client with Metro | Development |
| `preview` | Pixy Preview | `com.devmood.pixymoodtracker.preview` | `pixy-preview` | Release build for e2e and QA | Preview |
| `production` | Pixy | `com.devmood.pixymoodtracker` | `pixy` | TestFlight, App Store, Google Play | Production |

- `bun ios` and `bun android` build `development`. `bun ios:preview` and `bun android:preview` build a `preview` release. Set `EXPO_PUBLIC_APP_VARIANT` for anything else.
- Each variant reports to its own PostHog project ("Pixy App - Development", "Pixy App - Preview", "Pixy App - Production") and Sentry project. Sentry events carry the variant as `environment`.
- Sentry and EAS Observe report only from real devices on `preview` and `production` ([`src/lib/telemetry.ts`](../src/lib/telemetry.ts)). Development builds, simulators, emulators, and e2e runs send nothing; debug with Metro logs.
- Preview and production EAS builds upload source maps and native debug symbols to Sentry with the `SENTRY_AUTH_TOKEN` EAS secret. Builds without the token skip the upload: `bun ios`, `bun android`, and `bun app` set `SENTRY_DISABLE_AUTO_UPLOAD=true`. Set it yourself for `eas build --local`.
- Metro's `cacheVersion` includes the variant ([`metro.config.js`](../metro.config.js)), because inlined `EXPO_PUBLIC_*` values are not part of Metro's cache key.
- Development and preview icons carry a ribbon with the variant name (a label pill on Android adaptive icons). After changing `icon.png` or `adaptive-icon.png`, regenerate them with `swift scripts/generate-variant-icons.swift`.
- Development and preview builds add Settings > Development > Test data and `<scheme>://dev/fixture?id=<id>` to load [fixtures](../src/dev/fixtures/index.ts). Production bundles do not contain them: [`src/dev/index.ts`](../src/dev/index.ts) checks the inlined variant at the `require`, so Metro drops the code.
  - `chaos` fixture stress-tests the UI: every limit at max, text in many scripts and emoji, years with gaps, days with up to 100 entries, though the app has no per-day limit ([`chaos.ts`](../src/dev/fixtures/chaos.ts))
- Same builds add Settings > Development > Playground: components in every state, without touching user data. Deep link: `<scheme>://dev/playground/recap-story?deck=<id>&theme=light|dark`. Deck IDs: `all`, `month`, `<type>` (every case), `<type>/<index>` (one case).
  - Recap story slide states: [`slide-cases.ts`](../src/features/recaps/story/slide-cases.ts). New slide type without a case fails `tsc`.
  - Feature `playground.ts` entry: only `src/dev` may import it, so production bundles never reach it ([`oxlint.config.ts`](../oxlint.config.ts)).
- TestFlight builds are production builds. Apple promotes the tested TestFlight binary to the App Store.
- `ios/` and `android/` are generated ([Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)). [`scripts/run-native.ts`](../scripts/run-native.ts) reruns `expo prebuild --clean` when the variant or native fingerprint changed since the last prebuild. Never edit these folders.

### Feature flags

- PostHog feature flags. Keys, descriptions, and locations live in [`src/state/feature-flags/keys.ts`](../src/state/feature-flags/keys.ts)
- Read a flag with `useFeatureFlag(key)` ([`src/state/feature-flags/index.tsx`](../src/state/feature-flags/index.tsx))
- Each key needs a boolean flag with the same key in the PostHog project of every variant
- New key in `keys.ts`: create the PostHog flag in the same task. Do not ask first
  - Create it in all 3 EU app projects: Production `321829`, Preview `321849`, Development `321850`
  - Development and Preview: disabled
  - Production: disabled, or release condition limited to internal testers. Never roll out to users without request
  - Run `switch-project` before each create. The MCP keeps the last active project
- Never replace or delete existing release conditions or rollout percentages. Add a separate condition group instead
- Data changes behind a flag are additive and optional: new fields only, never renamed, removed, or retyped fields
  - Flag on, then off, then the feature deleted: no crash, no data loss, export and import still work
  - Entries without the new field render as before
  - Not possible: explain the breaking change and get the user's explicit consent before writing it
- Flags load only with consent: onboarding done and Settings > Privacy > Behavioral Data on. No flag request at startup (`preloadFeatureFlags: false`, [`src/shell/posthog-options.ts`](../src/shell/posthog-options.ts))
- Without consent, or until flags load, every flag is off. Turning consent off turns flags off. Flags cached in an earlier session are never read
- Development and preview builds override flags in Settings > Development > Feature flags, or with `<scheme>://dev/feature-flag?key=<key>&value=on|off|remote`. Overrides work without consent and end when the app restarts
- Production builds apply overrides only while flag `feature-flag-overrides` is on. That flag also shows Settings > Development > Feature flags. It needs consent, so testers agreed to the privacy policy. It is never overridable itself ([`src/state/feature-flags/overrides.ts`](../src/state/feature-flags/overrides.ts))
- Settings > Development is hidden in production builds. Flag `development`, flag `feature-flag-overrides`, or 20 taps on the version in Settings show it ([Settings screen](../src/features/settings/screens/settings/index.tsx)). Taps last until app restart. Development and preview builds always show it

### Announcements

- Calendar card from `https://pixy.day/api/announcements`. App picks the newest one matching version, platform, dates, and flag that the user has not dismissed ([`announcements.ts`](../src/features/calendar/screens/calendar/announcements.ts))
- Show a FeatureOS changelog post: add label `In-app` to it. Remove the label to hide the card. Website refreshes every 5 minutes
- Target by app version, platform, end date, or PostHog flag: add an entry to the manual list in the website repo (`src/lib/announcements.ts`)
- `flag` cards reach only users with analytics consent ([feature flags](#feature-flags))
- Never reuse an id: users who dismissed it skip the new card
- Builds before the announcements endpoint show the newest FeatureOS RSS post. Unpublish it in FeatureOS to hide it there

### Photos

- Code: [`src/features/photos`](../src/features/photos). Files: `Documents/photos/<id>.jpg`, 1600 px longest edge, JPEG 0.75
- Entries store file names, never paths. Unreferenced files go after logger close, entry delete, and app start. Never right after a data import
- Photos of the entry's day: iOS only. Android uses the system Photo Picker only. `app.json` blocks `READ_MEDIA_IMAGES` and related permissions (Google Play photo policy)
- No camera. `expo-image-picker` plugin sets `cameraPermission: false`: Android blocks `android.permission.CAMERA`, iOS drops `NSCameraUsageDescription`
- Export JSON holds photo metadata only, no files
- Backups: iOS iCloud and Finder backups include `Documents/photos`, restored with entries
- Android backups never include photos. #480 backs up the `database` domain only. Keep photos out: Android stops the whole app backup above 25 MB
- Preview builds: `<scheme>://dev/fake-files` swaps picker and library for [`fakePhotoSource`](../src/dev/fake-photo-source.ts). Library access starts `undetermined`

### Location

- Code: [`src/features/location`](../src/features/location). Switch in Settings > Check-in
- Switch on asks for location access while in use. Denied access keeps switch off
- New entries for today get current place passively: never asks, never marks draft dirty ([`usePassiveLocation`](../src/features/logger/hooks/use-passive-location.ts)). Other days start with "Add Location". Moving the time to another day drops the passive place. Edits keep stored place
- Rating slide: time bottom left, place bottom right. Place opens picker: search, current location, remove
- Picker map: iOS only, Apple Maps via `expo-maps`. Tap map to pin a place. Android has no map: Google Maps needs an API key, so `package.json` excludes `expo-maps` from Android autolinking ([`place-map.tsx`](../src/features/location/components/place-map.tsx))
- Entries store coordinates plus district and city. Name `null` when reverse geocoding fails offline
- Location stays on device and in JSON exports. Never in analytics: `logger:log_saved` sends `has_location` only
- Setting is device-bound, not in exports
- Simulator: `xcrun simctl location <udid> set <lat>,<lon>`. e2e: [`location.yaml`](../e2e/flows/location.yaml), needs network for place names

### Apple Health

- Code: [`src/features/health`](../src/features/health). Flag `apple-health`, iOS only. Settings > Check-in > Sleep is a page for everyone; flag on adds switch "Auto Fill" under "Apple Health"
- Library: [`@kingstinct/react-native-healthkit`](https://github.com/kingstinct/react-native-healthkit). Read sleep only. Keep `NSHealthUpdateUsageDescription` set (Apple rejects the binary without it when HealthKit is enabled) and drop background delivery
- Apple Sleep Score has no API. Pixy computes own score from sleep samples ([`sleep-score.ts`](../src/features/health/sleep-score.ts)). Score bands map to the 5 sleep qualities
- Switch on shows the Health access sheet. HealthKit hides read denial: switch stays on, entries get no sleep quality. Settings text points to Health app > Apps > Pixy
- Auto Fill on: new entries skip the sleep slide. Logger fills quality in background ([`useHealthSleepFill`](../src/features/logger/hooks/use-health-sleep-fill.ts)), same rule as sleep step: step on, first entry of day with sleep. Save waits up to 1 second for Apple Health. No sleep data: entry saves without quality
- Edits keep stored quality. Sleep slide in edit shows card above scale: total sleep and stacked bar of stages (awake, REM, core, deep), colors close to Apple Health. Without a watch: one "In Bed" bar
- Apple Health icon: Apple's artwork license forbids redistribution, so the repository never holds it. Config plugin [`with-apple-health-icon.cjs`](../tools/expo-plugins/with-apple-health-icon.cjs) adds it to the iOS asset catalog at prebuild from gitignored `assets/third-party/apple-health/`, or downloads Apple's disk image on macOS. Missing icon: build continues, rows show no icon
- Icon rules ([HIG HealthKit](https://developer.apple.com/design/human-interface-guidelines/healthkit)): "Apple Health" close to the icon, never a button, never altered. Icon is a white tile and vanishes on white rows, so [`apple-health-icon.tsx`](../src/features/health/components/apple-health-icon.tsx) draws a hairline gray outline around it. Apple's HIG lists borders as not allowed: product decision, check again before App Store review
- Entries store quality only. No Health values in entries, exports, or analytics
- Setting is device-bound, not in exports
- Simulator holds no watch sleep. Preview builds: `<scheme>://dev/fake-files` swaps Apple Health for [`fakeHealthSource`](../src/dev/fake-health-source.ts)

### App CLI

- Commands report host RAM on stderr before and after execution ([measurement](../scripts/cli/memory.ts)). Help and usage errors skip measurement.
- RAM feedback shows free RAM, available estimate, and budget above recommended **4 GiB headroom**. Low headroom advises waiting before another session.
- macOS estimate adds free, inactive, and speculative pages. Inactive pages may need writeback. Linux uses `MemAvailable`.
- Every device command takes exactly one device option:
  - `--platform=<ios|android>`: simulator or emulator that the CLI manages for this checkout
  - `--target=<target>`: one phone of the simlock fleet. See [Phones](#phones).
- `bun devices list` prints the option to copy for every device, plus state and problem. `--platform=<ios|android>` filters by OS.
- `bun app dev` installs the cached dev client, starts this checkout's Metro, and opens the app on it. Rerun to reload. Simulator and emulator only.
  - Hides the dev menu onboarding, launch menu, and floating button ([`scripts/cli/dev-client.ts`](../scripts/cli/dev-client.ts))
  - `--fixture=<id>` and `--flag=<key>=<on|off>,...` open the dev deep links after launch
- `bun app build` compiles a preview release with embedded JavaScript into the shared cache.
- `bun app install` installs the cached preview binary directly, no prebuild. Builds first when cache has no match.
- `bun app seed --fixture=<id>` loads a fixture and prints a screenshot path. Seeds the dev client while this checkout's `bun app dev` runs, else the preview app. `--variant=<dev|preview>` overrides.
- `bun app open` launches by app ID, waits for onboarding or calendar, then prints a screenshot path.
- `bun app close` ends the session, resets app data, and stops this checkout's Metro. See [Phones](#phones) for phone behavior.
- `bun e2e run [--paths=<path,...>]` closes the session, reinstalls the app, then runs Maestro flows. Default path: `e2e/flows`.
- `bun e2e run --video` records each flow attempt to `recording.mp4` in its artifacts folder and prints the paths.
- `bun release smoke --platform=ios` launches the production JS bundle in a copy of the cached iOS Release build. No native compile, about 2 minutes. Catches release-only startup crashes ([`scripts/cli/release-smoke.ts`](../scripts/cli/release-smoke.ts)).
- `bun builds list` lists cached builds. `bun builds rm --build=<id>` removes one. `bun builds prune` removes old builds and deleted checkout state.
- Commands take options only, no positional arguments. `bun <noun> <command> --help` lists options, examples, and errors.
- The CLI selects the preview variant. Metro stays off. `bun app dev` is the exception: development variant with Metro.

```shell
bun devices list
bun app install --platform=ios
bun app open --target=pixel-8-09yw
```

### Sitemap

- `bun sitemap capture|build|deploy`: screenshot of every screen and state in [`states.ts`](../scripts/sitemap/states.ts), flags off and on, as a static site on Vercel. `--help` lists options, output lines, and errors.
- Source is `origin/main` only. Capture fails on another HEAD or a dirty tree. `--ref=head` is for capture logic work and never deploys.
- Capture app: cached iOS Release shell plus `expo export` of the preview JS with `EXPO_PUBLIC_SITEMAP_CAPTURE=1`. No Metro, no LogBox, no network, no telemetry, no keyboard, reduced motion ([`sitemap-capture.tsx`](../src/shell/sitemap-capture.tsx)). Clock starts at 2026-03-18 09:41 Europe/Berlin on every launch ([polyfill](../scripts/sitemap/capture-polyfill.js)).
- Device profile is part of every input hash ([`profile.ts`](../scripts/sitemap/profile.ts)). Other runtime, other pixels: preflight fails.
- New screen: add it to `states.ts`. Wait for a testID; tap testIDs; label only for native header items. `bun run test:cli` checks ids, routes, fixtures, and strings.
- Flagged UI: elements in the flags-on tree that the flags-off tree lacks. Capture finds the flag by turning halves of the candidate flags on. `attribute` narrows candidates.
- Equal input hash reuses the cached PNG. `--verify=<n>` captures cached states again: a new PNG fails with `nondeterministic`. Never delete a cache entry to hide it.
- Deploy needs `SITEMAP_VERCEL_SCOPE`. Every deployment is immutable and behind Vercel Authentication. Production moves the project domain (`latest`). CI: [`sitemap.yml`](../.github/workflows/sitemap.yml).

### Phones

- Phones sit on a [simlock](https://github.com/callstackincubator/simlock) fleet. A phone can be connected to another Mac. The CLI never runs `devicectl` or `adb` on a phone.
- Setup: set `SIMLOCK_URL` (simlock gateway or daemon) and `SIMLOCK_TOKEN` (agent token). The phone's simlock worker needs agent-device installed and `capabilities.agent-device.enabled`. Without the two variables, `bun devices list` shows no phones.
- Target: slug of phone model plus last 4 characters of phone ID, for example `pixel-8-09yw`. `bun devices list` shows the state of each phone in simlock.
- simlock picks the phone. `--target` selects its platform and OS version. Two phones with the same platform and OS version are interchangeable.
- A command leases the phone just before it uses it. The lease stays for later commands of the same checkout. It ends with `bun app close --target=<target>`, or when simlock's lease time passes without use. Other checkouts wait while the lease runs.
- agent-device reaches the phone through simlock's agent-device proxy, in session `<target>-<checkout hash>`. Proxy state is in `~/.cache/pixy-mood-tracker/agent-device-phones/`, not in `~/.agent-device/`: a proxy connection there takes over every local simulator call.
- After the lease starts, the CLI wakes an Android phone. A phone with a PIN lock stays locked. Unlock it on its worker Mac.
- `bun app close` on a phone stops the preview app and ends the lease. simlock then removes every app installed during the lease. The phone stays on.
- iPhone builds are signed phone builds with cache key prefix `ios-device`, built on this Mac. Cache entry is reused only when its provisioning profile includes the phone. Android phones use the same build as the emulator.
- `bun e2e run --target` fails with `e2e_phone_unsupported`. agent-device `test --maestro` cannot run flows through the proxy yet ([simlock#1458](https://github.com/callstackincubator/simlock/issues/1458)). Run flows on the simulator or emulator.
- `bun app dev` has no phone support. Use `bun ios --device <udid>` or `bun android --device <name>` for the dev client on a phone connected to this Mac.
- `agent-device record` on an iPhone can restart the iOS runner ("iOS runner session restarted during recording"). Every later command then fails. Take screenshots on the phone. Record video on the simulator: `xcrun simctl io <udid> recordVideo --codec=h264 --force <file>.mp4`, stop with `kill -INT`.
- `agent-device settings appearance` works on simulators only. On a phone, switch dark mode in Settings > Display & Brightness.

### Device Hub

- `bun hub` opens [Expo Device Hub](https://github.com/expo/expo-device-hub) on `http://localhost:3400`: live view of every simulator and emulator, tap and type, appearance, Liquid Glass, text size, accessibility toggles.
- For humans only. Agents drive devices with `bun app drive`.
- Never press **Shut down** or **Remove**. Simulators belong to checkouts: shut down stops another session, remove deletes its claimed simulator. `--hide-boot-device` hides only boot and create.
- Plugin stays out of `expo start` (`expo.autolinking.exclude` in [`package.json`](../package.json)). Reason: Metro listens on all interfaces and the plugin API has no token, so anyone on the network could control devices.
- Other Mac: run `bun hub` there, forward the port over SSH: `ssh -N -L 3400:localhost:3400 <mac>`, then open `http://localhost:3400`.
- No SSH: `bun hub --host 0.0.0.0 --require-token` on the other Mac. Open the printed link. Treat the token like a password: never paste it into issues, PRs, or logs.

### Widgets (iOS)

- Code: [`src/features/widget`](../src/features/widget). Extension bundle ID `<appId>.widgets`, app group `group.<appId>` ([`app.config.ts`](../app.config.ts))
- iPhone builds need an extension provisioning profile with App Groups. `bun app install --target=<target>` signs with `xcodebuild -allowProvisioningUpdates`. Xcode without a signed-in Apple account cannot create that profile.
- Fallback: `bunx eas-cli build -p ios --local --profile=preview --output <file>.ipa`. Run it once interactively: eas-cli creates the extension profile only then. Later runs accept `--non-interactive`.
- Unset `CI` before eas-cli. An empty `CI` fails with `GetEnv.NoBoolean`.
- Install the IPA: `xcrun devicectl device install app --device <id> <file>.ipa`
- Extension memory limit: 30 MB. Too many SwiftUI nodes crash the widget, then WidgetKit shows a stale archive. Render big grids in the app as one image ([`widget-sync.tsx`](../src/features/widget/widget-sync.tsx)).
- WidgetKit holds timeline reloads while the app is in the foreground. Send the app home and wait about 10 seconds. Remove and add the widget again to force a fresh timeline.
- Logs: `idevicesyslog -u <udid>` (Homebrew `libimobiledevice`). Grep `[ExpoWidgets]` for the extension, `PixyPreview(React)` for app `console.error`. Release builds print both.
- Home Screen on a phone: `agent-device open com.apple.springboard`, `longpress` on empty space, then tap by coordinates from screenshots. `snapshot` shows no accessibility tree there.

### E2E flows

- Flows: `e2e/flows/*.yaml`. Shared steps: `e2e/subflows/`.
- Each flow has one severity tag in `tags`:
  - `p0`: core loop or data loss. Run on every PR, iOS and Android.
  - `p1`: important feature. Run nightly.
  - `p2`: smoke check. Run before release.
- Pick severity from usage in the "Pixy App - Production" PostHog project, then raise it for data risk.
- Flows start from a fixture (`load-fixture.yaml`) unless they test first launch.
- `<scheme>://dev/fake-files` swaps every system picker for a fake: share sheet and document picker ([`src/dev/fake-file-transfer.ts`](../src/dev/fake-file-transfer.ts)), address book and person photos ([`src/dev/fake-people-sources.ts`](../src/dev/fake-people-sources.ts)), entry photo picker and photo library ([`src/dev/fake-photo-source.ts`](../src/dev/fake-photo-source.ts)), Apple Health sleep ([`src/dev/fake-health-source.ts`](../src/dev/fake-health-source.ts)). Fakes end when the app restarts. `?contacts=fail-once` makes the first contact read fail.
- `<scheme>://dev/fake-contacts?count=<n>` writes `n` fake contacts (company "Pixy Test Contact", every fifth with a photo) into the real device address book. `count=0` deletes exactly those. Synced accounts (iCloud, Google) sync them too, so delete them after testing.
- Fixtures count as consent, so preview builds load flags from "Pixy App - Preview". Shared flows expect every flag off there. A flow that needs a flag turns it on with [`enable-feature-flag.yaml`](../e2e/subflows/enable-feature-flag.yaml) (not on iPhones)
- Each flow asserts a result. Opening a screen is not a test.
- `bun e2e run` replays flows with `agent-device test --maestro` ([`scripts/cli/e2e.ts`](../scripts/cli/e2e.ts)). Maestro commands without agent-device support fail, for example `setLocation`. Set GPS before the run: `xcrun simctl location <udid> set <lat>,<lon>`.
- Flows share app state. [`load-storage-fixture.yaml`](../e2e/subflows/load-storage-fixture.yaml) waits for `calendar-list`, so it fails before onboarding. After `pm clear` or a failed `storage-load-error.yaml`, run `first-launch.yaml` first.
- Native header buttons (`Stack.Toolbar.Button`) have `accessibilityLabel` only, no testID. Tap them by label. On iOS the navigation bar has the same label: in raw agent-device, run `snapshot -i`, then press the button ref.
- A run across midnight fails `load-fixture.yaml`, because the ID of today changes. Rerun.
- `bun run test:cli` checks flows statically ([`flow-lint.ts`](../scripts/cli/flow-lint.ts)): every `runFlow` and `runScript` file exists, every `id` selector matches a `testID` in `src/`. Tap header buttons through `open-*.yaml` subflows: native header items have no testIDs.
- Known failures: [`e2e/known-failures.json`](../e2e/known-failures.json), entries `{ "flow", "reason", "since" }`. `since` is a `YYYY-MM-DD` date. `bun e2e run` names new failures apart from known ones. Add a flow that fails on `main` with its cause. Remove it with the fix.

### Upgrade tests

- Storage fixtures (`legacy-1.81.1`, `legacy-1.68`) hold raw AsyncStorage as those versions wrote it ([`src/dev/fixtures/index.ts`](../src/dev/fixtures/index.ts)).
- `upgrade-from-*.yaml` flows (`p0`) write them, restart the app, and check entries, tags, and a first new entry.
- `storage-load-error.yaml` writes `corrupt-logs` (unreadable logs) and checks the load error screen and its export ([`src/shell/storage-load-gate.tsx`](../src/shell/storage-load-gate.tsx)). It ends with `clearState`, so it runs on simulators and emulators only.

### Jest

- `bun run test` runs in watch mode and never exits. Use `bun run test:ci` or `bunx jest <paths>`.
- Suites that import `expo-router/testing-library` get an empty `react-native-reanimated` mock: every export is `undefined`. Its re-mock fails against the `react-native-worklets` mock in [`jest.setup.js`](../jest.setup.js) and falls back to `{}`.
- Never call reanimated at module scope (`Easing.bezier`, `createAnimatedComponent`, `new Keyframe`). Create the value inside the component or hook.
- Factory mocks that spread `jest.requireActual` need `__esModule: true`. Without it, Babel gives each importer its own namespace copy, so `jest.spyOn` in a test misses calls from `src`.

### Storybook

- Web Storybook for components: `bun storybook`, then open http://localhost:6006. Static build: `bun storybook:build`
- Stories: `src/**/*.stories.tsx`, next to the component
- Runs on React Native Web, without the Expo runtime. `expo-router` resolves to [a theme-only stand-in](../.storybook/expo-router.ts)
- Theme toolbar switches light and dark app colors ([preview](../.storybook/preview.tsx))

### Build cache

- Shared builds live under `~/.cache/pixy-mood-tracker/build-cache/`. `bun builds list` shows them with app variant and source.
- Preview build keys include native fingerprint, app source, and `EXPO_PUBLIC_*` values.
- Dev client keys include the native fingerprint only (`ios-<fingerprint>-unknown`, `android-<fingerprint>-debug`). JavaScript comes from Metro. One dev client serves every worktree with the same native dependencies.
- `bun ios` and `bun android` use the same cache through Expo CLI.
- An exact cache hit skips native compilation and JavaScript bundling.
- `bun builds prune` keeps one build per OS, target, and variant, plus builds used within two days.

The cache provider lives in [`scripts/build-cache-provider.cjs`](../scripts/build-cache-provider.cjs).

### Run files

- Checkout state lives under `~/.cache/pixy-mood-tracker/checkouts/<hash>/`. `checkout.txt` records its worktree path.
- `e2e/<device>/` contains test artifacts, `junit.xml`, and `--video` recordings. `screenshots/<device>/` contains app screenshots. `<device>` is `ios`, `android`, or the phone target.
- `build/` contains Expo build output.
- `logs/` contains one log per long command run (`app build`, `app install`, `app dev`, `e2e run`). Newest 30 stay. Format: `bun <noun> <command> --help`, section `Progress`.
- `metro.log` and `metro.pid` belong to the Metro that `bun app dev` started.
- CLI state stays outside the worktree. Expo owns generated `ios/` and `android/` folders.

### Parallel runs

- Each worktree gets one iPhone 17 Pro simulator named `pixy-mood-tracker-<hash>`. The CLI boots it with `simctl`.
- Optional: `brew install mobai-app/tap/simslim`. The CLI then boots the simulator slim with [`simslim.json`](../scripts/cli/simslim.json): background daemons Pixy does not use stay off, about 1.9 GB instead of 4.6 GB per simulator.
- Slim keeps widgets, HealthKit, contacts, and the photo picker. Off: Siri and speech, iCloud, StoreKit, remote push. For voice, iCloud backup, or store review work, run with `SIMSLIM=0`. It reboots the simulator stock.
- `bun release smoke` always uses a stock simulator.
- Two worktrees can build, install, open, and run iOS e2e flows at the same time. Device claims keep their sessions separate.
- Each checkout's Metro runs on its own port (8082-8181, from the checkout hash). 8081 stays free for a manual `bun start`.
- Android uses one `pixy-mood-tracker` AVD per machine. Android runs serialize through device claims.
- Phones are shared by all worktrees through simlock leases. See [Phones](#phones).
- Check `uptime` before device work. Above load average ~100, simulators, emulators, and agent-device time out. Android ANR dialogs and Watchdog restarts of `system_server` are then not app bugs.
- An Android build can lose its Gradle daemon ("Gradle build daemon disappeared unexpectedly") while an iOS build runs. Run the Android build alone.

### Disk cleanup and errors

- Worktrees contain source and generated native folders only. Remove a finished worktree, then run `bun builds prune`.
- Prune deletes its simulator, agent-device sessions and claims, checkout logs, artifacts, and state. Prune never changes a phone.
- `bun app close` resets app data and runs prune.
- CLI failures report `status`, `message`, `why`, and `fix`. Failed steps stop without another strategy.

### Preview App Icon

- Enable `app-icons` in Settings > Development > Feature flags to unlock new icons in Settings > App Icon. Remote flag stays disabled.
- Icons need a native build: [`expo-alternate-app-icons`](https://github.com/pchalupa/expo-alternate-app-icons) plugin config in [`app.json`](../app.json), catalog in [`src/constants/app-icons.ts`](../src/constants/app-icons.ts), sources (SVG or 1024 px PNG) in [`assets/images/app-icons/`](../assets/images/app-icons/)

### Preview Support Pixy

- Enable `support-pixy` in Settings > Development > Feature flags to show support card. Remote flag stays disabled.

Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`. Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`. Restart Expo after changing configuration. Production builds ignore fake mode.

**EAS profiles** (`eas.json`) set the variant: `development` and `emulator` build `development`, `preview` builds `preview`, `production` builds `production`.

## Building

### iOS physical device signing

iOS device builds require Xcode and CocoaPods. `bun ios --device <device-id>` builds the `Pixy Dev` app with its `.dev` bundle ID. Automatic signing needs an Apple development team and provisioning profile for that bundle ID with Push Notifications enabled. Pixy requests the `aps-environment` entitlement through `expo-notifications`; a wildcard profile without that capability fails during Xcode signing.

agent-device runner signing on physical iPhones:

- agent-device builds its own runner app on the Mac the iPhone is connected to, and signs it with the team wildcard profile `iOS Team Provisioning Profile: *`
- simlock worker: set `capabilities.agent-device.ios` to `{"teamId": "<team>", "bundleId": "<runner bundle ID>"}`. The team must be the team of the Apple ID in Xcode > Settings > Accounts on that Mac. Else the build fails with `No Account for Team`.
- The worker builds the runner from its launchd service. An `xcodebuild` over ssh fails at code signing, because the login keychain is locked in ssh sessions.
- Runner cache: `~/.agent-device/apple-runner/derived/ios-device/` on that Mac
- Stale wildcard profile or cache without a new phone: install fails with `0xe8008012 (This provisioning profile cannot be installed on this device.)`

On Macs using Homebrew CocoaPods with RVM, clear RVM's gem paths if `pod` fails to load: `env -u GEM_HOME -u GEM_PATH bun ios --device <device-id>`.

| Environment | OS | Channel | `bun run` command | Extension | Installation |
| --- | --- | --- | --- | --- | --- |
| `development` | iOS | Physical Device | `eas:ios:dev` | `.ipa` | Install `.ipa` file via [Apple Configurator](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12) |
| `development` | Android | Physical Device | `eas:android:dev` | `.apk` | Install manually (enable "Install from unknown sources") |
| `emulator` | iOS | Simulator | `eas:ios:emulator` | `.app` | Accept the EAS prompt to install the build on a running simulator |
| `emulator` | Android | Emulator | `eas:android:emulator` | `.apk` | Install the `.apk` file via drag and drop |
| `preview` | iOS | Physical Device | `eas:ios:preview` | `.ipa` | Internal distribution: register devices with `bunx eas-cli device:create`, then install the `.ipa` |
| `preview` | Android | Physical Device | `eas:android:preview` | `.apk` | Install with `adb install` |
| `production` | iOS | TestFlight | `eas:ios:prod` | `.ipa` | Submit `.ipa` file via `bun run submit` (uploads newest `.aab` and `.ipa`) |
| `production` | Android | Google Play Console | `eas:android:prod` | `.aab` | Submit `.aab` file via `bun run submit` (uploads newest `.aab` and `.ipa`) |

## Releasing

- Merging a Release Please PR creates the GitHub release and builds production iOS and Android apps with EAS
- iOS goes to TestFlight, Android to the Google Play internal track
- Neither is a public release. Promote tested builds manually in App Store Connect and Play Console

See [store release workflow](./store-release-workflow.md) for prerequisites, operation, and verification criteria.

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
- Metro's `cacheVersion` includes the variant ([`metro.config.js`](../metro.config.js)), because inlined `EXPO_PUBLIC_*` values are not part of Metro's cache key.
- Development and preview icons carry a ribbon with the variant name (a label pill on Android adaptive icons). After changing `icon.png` or `adaptive-icon.png`, regenerate them with `swift scripts/generate-variant-icons.swift`.
- Development and preview builds add Settings > Development > Test data and `<scheme>://dev/fixture?id=<id>` to load [fixtures](../src/dev/fixtures/index.ts). Production bundles do not contain them: [`src/dev/index.ts`](../src/dev/index.ts) checks the inlined variant at the `require`, so Metro drops the code.
- TestFlight builds are production builds. Apple promotes the tested TestFlight binary to the App Store.
- `ios/` and `android/` are generated ([Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)). [`scripts/run-native.ts`](../scripts/run-native.ts) reruns `expo prebuild --clean` when the variant or native fingerprint changed since the last prebuild. Never edit these folders.

### Feature flags

- PostHog feature flags. Keys live in [`src/state/featureFlags/keys.ts`](../src/state/featureFlags/keys.ts). Read one with `useFeatureFlag(key)` ([`src/state/featureFlags/index.tsx`](../src/state/featureFlags/index.tsx))
- Each key needs a boolean flag with the same key in the PostHog project of every variant
- Flags load only with consent: onboarding done and Settings > Privacy > Behavioral Data on. No flag request at startup (`preloadFeatureFlags: false`, [`src/shell/posthogOptions.ts`](../src/shell/posthogOptions.ts))
- Without consent, or until flags load, every flag is off. Turning consent off turns flags off. Flags cached in an earlier session are never read
- Development and preview builds override flags in Settings > Development > Feature flags, or with `<scheme>://dev/feature-flag?key=<key>&value=on|off|remote`. Overrides work without consent and end when the app restarts. Production builds ignore them

### Photos

- Code: [`src/features/photos`](../src/features/photos). Files: `Documents/photos/<id>.jpg`, 1600 px longest edge, JPEG 0.75
- Entries store file names, never paths. Unreferenced files go after logger close, entry delete, and app start. Never right after a data import
- Photos of the entry's day: iOS only. Android uses the system Photo Picker only. `app.json` blocks `READ_MEDIA_IMAGES` and related permissions (Google Play photo policy)
- No camera. `expo-image-picker` plugin sets `cameraPermission: false`: Android blocks `android.permission.CAMERA`, iOS drops `NSCameraUsageDescription`
- Export JSON holds photo metadata only, no files
- Backups: iOS iCloud and Finder backups include `Documents/photos`, restored with entries
- Android backups never include photos. #480 backs up the `database` domain only. Keep photos out: Android stops the whole app backup above 25 MB
- Preview builds: `<scheme>://dev/fake-files` swaps picker and library for [`fakePhotoSource`](../src/dev/fakePhotoSource.ts). Library access starts `undetermined`

### App CLI

- Every device command takes exactly one device option:
  - `--platform=<ios|android>`: simulator or emulator that the CLI manages for this checkout
  - `--target=<target>`: one connected phone
- `bun devices list` prints the option to copy for every device, plus state and problem. `--platform=<ios|android>` filters by OS.
- `bun app dev` installs the cached dev client, starts this checkout's Metro, and opens the app on it. Rerun to reload. Simulator and emulator only.
- `bun app build` compiles a preview release with embedded JavaScript into the shared cache.
- `bun app install` installs the cached preview binary directly, no prebuild. Builds first when cache has no match.
- `bun app seed --fixture=<id>` loads `fresh`, `empty`, `seed`, or `year` data and prints a screenshot path.
- `bun app open` launches by app ID, waits for onboarding or calendar, then prints a screenshot path.
- `bun app close` ends the session, resets app data, and stops this checkout's Metro. See [Phones](#phones) for phone behavior.
- `bun e2e run [--paths=<path,...>]` closes the session, reinstalls the app, then runs Maestro flows. Default path: `e2e/flows`.
- `bun e2e run --video` records each flow attempt to `recording.mp4` in its artifacts folder and prints the paths.
- `bun builds list` lists cached builds. `bun builds rm --build=<id>` removes one. `bun builds prune` removes old builds and deleted checkout state.
- Commands take options only, no positional arguments. `bun <noun> <command> --help` lists options, examples, and errors.
- The CLI selects the preview variant. Metro stays off. `bun app dev` is the exception: development variant with Metro.

```shell
bun devices list
bun app install --platform=ios
bun e2e run --target=pixel-8-09yw --paths=e2e/flows/entry-full.yaml
```

### Phones

- Target: slug of phone name plus last 4 characters of phone ID, for example `pixel-8-09yw`. Same phone gives same target in every checkout.
- Phone must be connected, unlocked, and trusted. `bun devices list` names the problem when not.
- iPhone builds are signed phone builds with cache key prefix `ios-device`. Cache entry is reused only when its provisioning profile includes the phone.
- Android phones use the same build as the emulator.
- `bun app close` on a phone never shuts down or erases the phone. Android: stops the app and clears its data. iPhone: stops and uninstalls the preview app.
- One device per command. Start one command per phone to run phones in parallel.
- Reserve a phone for a whole task: `bun devices reserve --target=<target>`. Other checkouts then fail with `device_reserved`. Release with `bun devices release --target=<target>`. Reservations expire after 60 minutes (`--minutes=<n>`) or when their checkout is deleted.
- `bun app dev` has no phone support. Use `bun ios --device <udid>` or `bun android --device <name>` for the dev client on a phone.

Known limits. A phone run fails with `flows_unsupported_on_phone` before it changes anything on the phone, and names every blocked flow plus the command to run it elsewhere:

- Android phone: flows with `eraseText`. Non-ASCII `inputText` fails during the run with `android_phone_text_input_unsupported`. Cause: agent-device 0.21.15 enables its test keyboard on phones only through `open --test-ime` ([agent-device#2997](https://github.com/callstack/agent-device/issues/2997)).
- iPhone: flows with `openLink` outside [`load-fixture.yaml`](../e2e/subflows/load-fixture.yaml) ([agent-device#2998](https://github.com/callstack/agent-device/issues/2998)). For `load-fixture.yaml`, `bun e2e run` loads the fixture with `devicectl` before each flow and runs flows one at a time.
- iPhone: flows with `clearState`. agent-device clears app state on simulators only.

### E2E flows

- Flows: `e2e/flows/*.yaml`. Shared steps: `e2e/subflows/`.
- Each flow has one severity tag in `tags`:
  - `p0`: core loop or data loss. Run on every PR, iOS and Android.
  - `p1`: important feature. Run nightly.
  - `p2`: smoke check. Run before release.
- Pick severity from usage in the "Pixy App - Production" PostHog project, then raise it for data risk.
- Flows start from a fixture (`load-fixture.yaml`) unless they test first launch.
- Fixtures count as consent, so preview builds load flags from "Pixy App - Preview". Shared flows expect every flag off there. A flow that needs a flag turns it on with [`enable-feature-flag.yaml`](../e2e/subflows/enable-feature-flag.yaml) (not on iPhones)
- Each flow asserts a result. Opening a screen is not a test.

### Upgrade tests

- Storage fixtures (`legacy-1.81.1`, `legacy-1.68`) hold raw AsyncStorage as those versions wrote it ([`src/dev/fixtures/index.ts`](../src/dev/fixtures/index.ts)).
- `upgrade-from-*.yaml` flows (`p0`) write them, restart the app, and check entries, tags, and a first new entry.
- `storage-load-error.yaml` writes `corrupt-logs` (unreadable logs) and checks the load error screen and its export ([`src/navigation/StorageLoadGate.tsx`](../src/navigation/StorageLoadGate.tsx)). It ends with `clearState`, so it runs on simulators and emulators only.

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
- `build/` contains Expo build output. Logs stay in the checkout state dir.
- `metro.log` and `metro.pid` belong to the Metro that `bun app dev` started.
- CLI state stays outside the worktree. Expo owns generated `ios/` and `android/` folders.

### Parallel runs

- Each worktree gets one iPhone 17 Pro simulator named `pixy-mood-tracker-<hash>`. The CLI boots it with `simctl`.
- Two worktrees can build, install, open, and run iOS e2e flows at the same time. Device claims keep their sessions separate.
- Each checkout's Metro runs on its own port (8082-8181, from the checkout hash). 8081 stays free for a manual `bun start`.
- Android uses one `pixy-mood-tracker` AVD per machine. Android runs serialize through device claims.
- Phones are shared by all worktrees. A second command on a busy phone fails with `device_in_use`.
- Reservations live under `~/.cache/pixy-mood-tracker/reservations/`, one file per phone. See [Phones](#phones).

### Disk cleanup and errors

- Worktrees contain source and generated native folders only. Remove a finished worktree, then run `bun builds prune`.
- Prune deletes its simulator, agent-device sessions and claims, checkout logs, artifacts, and state. Prune never changes a phone.
- `bun app close` resets app data and runs prune.
- CLI failures report `status`, `message`, `why`, and `fix`. Failed steps stop without another strategy.

### Preview Support Pixy

Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`. Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`. Restart Expo after changing configuration. Production builds ignore fake mode.

**EAS profiles** (`eas.json`) set the variant: `development` and `emulator` build `development`, `preview` builds `preview`, `production` builds `production`.

## Building

### iOS physical device signing

iOS device builds require Xcode and CocoaPods. `bun ios --device <device-id>` builds the `Pixy Dev` app with its `.dev` bundle ID. Automatic signing needs an Apple development team and provisioning profile for that bundle ID with Push Notifications enabled. Pixy requests the `aps-environment` entitlement through `expo-notifications`; a wildcard profile without that capability fails during Xcode signing.

agent-device runner signing on physical iPhones:

- agent-device builds its own runner app and signs it with the team wildcard profile `iOS Team Provisioning Profile: *`
- Runner cache: `~/.agent-device/apple-runner/derived/ios-device/`
- Stale wildcard profile or cache without a new phone: install fails with `0xe8008012 (This provisioning profile cannot be installed on this device.)`
- CLI never moves files itself; another worktree can use the runner cache

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

Merging a Release Please PR creates the GitHub release, builds the production iOS app with EAS, and submits it to TestFlight. TestFlight submission does not release the app publicly. Promote the tested build manually in App Store Connect.

See [TestFlight release workflow](./testflight-release-workflow.md) for prerequisites, operation, and verification criteria.

Android store submissions remain manual: run `bun run eas:android:prod`, then `bunx eas-cli submit --platform android --path <path-to-aab>`.

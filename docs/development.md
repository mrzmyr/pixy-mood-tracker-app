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

3. Start local server

```shell
$ bun start
```

4. Install and run on a device

```shell
$ bun ios --device <device-id>
$ bun android --device <device-name>
```

Android builds need Android SDK packages and JDK 17+. `bun android` resolves `ANDROID_HOME`, `ANDROID_SDK_ROOT`, the standard macOS SDK path, or Homebrew's Android command line tools, plus Homebrew's JDK 17. Set `ANDROID_HOME` or `JAVA_HOME` when using another install location.

Run `bun ios` or `bun android` without `--device` to select a simulator or emulator.

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
- Development and preview builds add Settings > Development > Test data and `<scheme>://dev/fixture?id=<id>` to load [fixtures](../e2e/README.md#test-data). Production bundles do not contain them: [`src/dev/index.ts`](../src/dev/index.ts) checks the inlined variant at the `require`, so Metro drops the code.
- TestFlight builds are production builds. Apple promotes the tested TestFlight binary to the App Store.
- `ios/` and `android/` are generated ([Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)). [`scripts/run-native.ts`](../scripts/run-native.ts) reruns `expo prebuild --clean` when the variant or native fingerprint changed since the last prebuild. Never edit these folders.

### App CLI

- Every device command takes exactly one device option:
  - `--platform=<ios|android>`: simulator or emulator that the CLI manages for this checkout
  - `--target=<target>`: one connected phone
- `bun devices list` prints the option to copy for every device, plus state and problem. `--platform=<ios|android>` filters by OS.
- `bun app build` compiles a preview release with embedded JavaScript into the shared cache.
- `bun app install` installs the cached preview binary directly, no prebuild. Builds first when cache has no match.
- `bun app seed --fixture=<id>` loads `fresh`, `empty`, `seed`, or `year` data and prints a screenshot path.
- `bun app open` launches by app ID, waits for onboarding or calendar, then prints a screenshot path.
- `bun app close` ends the session and resets app data. See [Phones](#phones) for phone behavior.
- `bun e2e run [--paths=<path,...>]` closes the session, reinstalls the app, then runs Maestro flows. Default paths: `e2e/flows`, plus `e2e/apple` on iOS.
- `bun builds list` lists cached builds. `bun builds rm --build=<id>` removes one. `bun builds prune` removes old builds and deleted checkout state.
- Commands take options only, no positional arguments. `bun <noun> <command> --help` lists options, examples, and errors.
- The CLI selects the preview variant. Metro stays off.

```shell
bun devices list
bun app install --platform=ios
bun e2e run --target=pixel-8-09yw --paths=e2e/flows/05-statistics.yaml
```

### Phones

- Target: slug of phone name plus last 4 characters of phone ID, for example `pixel-8-09yw`. Same phone gives same target in every checkout.
- Phone must be connected, unlocked, and trusted. `bun devices list` names the problem when not.
- iPhone builds are signed phone builds with cache key prefix `ios-device`. Cache entry is reused only when its provisioning profile includes the phone.
- Android phones use the same build as the emulator.
- `bun app close` on a phone never shuts down or erases the phone. Android: stops the app and clears its data. iPhone: stops and uninstalls the preview app.
- One device per command. Start one command per phone to run phones in parallel.
- Humans can still use `bun ios --device <udid>` for development builds.

Known limits. A phone run fails with `flows_unsupported_on_phone` before it changes anything on the phone, and names every blocked flow plus the command to run it elsewhere:

- Android phone: flows with `eraseText`. Non-ASCII `inputText` fails during the run with `android_phone_text_input_unsupported`. Cause: agent-device 0.21.15 enables its test keyboard on phones only through `open --test-ime` ([agent-device#2997](https://github.com/callstack/agent-device/issues/2997)).
- iPhone: flows with `openLink`, for example [`load-fixture.yaml`](../e2e/subflows/load-fixture.yaml). Cause: agent-device 0.21.15 passes `--payload-url` after the bundle ID, so `devicectl` hands it to the app as a program argument ([agent-device#2998](https://github.com/callstack/agent-device/issues/2998)). `bun app seed` calls `devicectl` itself and works.
- iPhone: flows with `clearState`. agent-device clears app state on simulators only.

### Build cache

- Shared builds live under `~/.cache/pixy-mood-tracker/build-cache/`.
- Preview build keys include native fingerprint, app source, and `EXPO_PUBLIC_*` values.
- An exact cache hit skips native compilation and JavaScript bundling.
- `bun builds prune` keeps one build per OS, target, and variant, plus builds used within two days.

The cache provider lives in [`scripts/build-cache-provider.cjs`](../scripts/build-cache-provider.cjs).

### Run files

- Checkout state lives under `~/.cache/pixy-mood-tracker/checkouts/<hash>/`. `checkout.txt` records its worktree path.
- `e2e/<device>/` contains test artifacts and `junit.xml`. `screenshots/<device>/` contains app screenshots. `<device>` is `ios`, `android`, or the phone target.
- `build/` contains Expo build output. Logs stay in the checkout state dir.
- CLI state stays outside the worktree. Expo owns generated `ios/` and `android/` folders.

### Parallel runs

- Each worktree gets one iPhone 17 Pro simulator named `pixy-mood-tracker-<hash>`. The CLI boots it with `simctl`.
- Two worktrees can build, install, open, and run iOS e2e flows at the same time. Device claims keep their sessions separate.
- Android uses one `pixy-mood-tracker` AVD per machine. Android runs serialize through device claims.
- Phones are shared by all worktrees. A second command on a busy phone fails with `device_in_use`.

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

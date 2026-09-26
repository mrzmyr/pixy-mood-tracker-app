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

- `bun app build <ios|android>` compiles the preview release into the shared cache. JavaScript is embedded. Metro stays off.
- `bun app install <ios|android>` installs the cached preview build on this checkout's device.
- `bun app open <ios|android>` launches by app ID, waits for onboarding or calendar, then prints a screenshot path.
- `bun app seed <ios|android> <fixture-id>` loads fresh, empty, seed, or year test data and prints a screenshot path.
- `bun app close <ios|android>` ends the session, resets app data, shuts down the device, then prunes old builds.
- App commands take no flags. iOS gets one `pixy-mood-tracker-<hash>` simulator per checkout. Android uses the machine-wide `pixy-mood-tracker` AVD.
- Physical phones remain human-only through `bun ios --device <udid>`.

### Build cache

- Shared cache: `~/.cache/pixy-mood-tracker/build-cache`. Both platforms reuse an exact preview build key.
- Release keys include native fingerprint, app source, and `EXPO_PUBLIC_*` values. Same key skips native compilation and JavaScript bundling.
- `bun builds list` shows cached builds. `bun builds rm <id>` removes one. `bun builds prune` removes old builds and deleted checkout state.
- Checkout state: `~/.cache/pixy-mood-tracker/checkouts/<hash>/`. `checkout.txt` names the worktree. `e2e/`, `build/`, `screenshots/`, and logs stay outside source.
- Worktrees build and install on separate iOS simulators. Android uses one emulator per machine.

The cache provider lives in [`scripts/build-cache-provider.cjs`](../scripts/build-cache-provider.cjs).

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

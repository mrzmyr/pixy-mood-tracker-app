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

4. Run in iOS Simulator or Android Emulator

```shell
$ bun ios
$ bun android
```

### Build cache

`bun ios` and `bun android` cache compiled simulator and emulator debug builds, keyed by the project's native fingerprint. When native code and configuration are unchanged, the cached build is installed and compilation is skipped. JavaScript-only changes never need a new build.

- **Shared across worktrees:** the cache lives in `~/.cache/pixy-mood-tracker/build-cache`, so every checkout and git worktree reuses the same builds. Set `PIXY_MOOD_TRACKER_BUILD_CACHE_DIR` to use another directory.
- **Debug only:** release builds (`--configuration Release`, `--variant release`) embed the JavaScript bundle. The fingerprint ignores JavaScript, so a cached release build could run another branch's code. Release builds always compile.
- **`package.json` scripts are ignored:** [`fingerprint.config.cjs`](../fingerprint.config.cjs) skips them, so adding or editing a script keeps cached builds. Native modules, config plugins, and `app.json` changes still produce a new fingerprint.
- **Inspect and clean up with `bun builds`:**
  - `bun builds list` shows each build's variant, source branch and commit, size, and last use.
  - `bun builds check [--release]` tells whether this worktree gets a cached build, and why not.
  - `bun builds prune` keeps the newest 3 builds per platform and variant plus everything used in the last 7 days.
- Physical device builds are never cached.

The provider lives in [`scripts/build-cache-provider.cjs`](../scripts/build-cache-provider.cjs).

### Preview Support Pixy

Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`. Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`. Restart Expo after changing configuration. Production builds ignore fake mode.

**Environments** (`eas.json`)

- `development` Builds for local development on physical devices
- `emulator`: Builds for local development in iOS Simulator or Android Emulator
- `preview`: Builds used for TestFlight and Android Internal Testing
- `production`: Builds used for production

## Building

### iOS physical device signing

iOS device builds require Xcode and CocoaPods. Automatic signing also needs an Apple development team and provisioning profile for Pixy's app ID with Push Notifications enabled. Pixy requests the `aps-environment` entitlement through `expo-notifications`; a wildcard profile without that capability fails during Xcode signing. Select or create a profile that includes the capability before running `bun ios --device <device-id>`.

| Environment | OS | Channel | `bun run` command | Extension | Installation |
| --- | --- | --- | --- | --- | --- |
| `development` | iOS | Physical Device | `build:ios:dev` | `.ipa` | Install `.ipa` file via [Apple Configurator](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12) |
| `development` | Android | Physical Device | `build:android:dev` | `.apk` | Install manually (enable "Install from unknown sources") |
| `emulator` | iOS | Simulator | `build:ios:emulator` | `.app` | Accept the EAS prompt to install the build on a running simulator |
| `emulator` | Android | Emulator | `build:android:emulator` | `.apk` | Install the `.apk` file via drag and drop |
| `preview` | iOS | TestFlight | `build:ios:preview` | `.ipa` | Submit `.ipa` file to App Store via `bun run submit:ios:preview` |
| `preview` | Android | Google Play Console | `build:android:preview` | `.aab` | Submit `.aab` file to Google Play Console via `bun run submit:android:preview` |
| `production` | iOS | Physical Device | `build:ios:prod` | `.ipa` | Submit `.ipa` file via `bun run submit:ios:production` |
| `production` | Android | Physical Device | `build:android:prod` | `.aab` | Submit `.aab` file via `bun run submit:android:production` |

## Releasing

Merging a Release Please PR creates the GitHub release, builds the production iOS app with EAS, and submits it to TestFlight. TestFlight submission does not release the app publicly. Promote the tested build manually in App Store Connect.

See [TestFlight release workflow](./testflight-release-workflow.md) for prerequisites, operation, and verification criteria.

Android store submissions remain manual: run `bun run build:android:prod`, then `bunx eas-cli submit --platform android --path <path-to-aab>`. JavaScript and asset updates pushed to `preview` or `production` continue through the [EAS Update workflow](../.github/workflows/update.yml) when compatible with the installed runtime.

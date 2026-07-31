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

**Environments** (`eas.json`)

- `development` Builds for local development on physical devices
- `emulator`: Builds for local development in iOS Simulator or Android Emulator
- `preview`: Builds used for TestFlight and Android Internal Testing
- `production`: Builds used for production

## Building

| Environment   | OS      | Channel             | `bun run` command        | Extension | Installation                                                                                                      |
| ------------- | ------- | ------------------- | ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `development` | iOS     | Physical Device     | `build:ios:dev`          | `.ipa`    | Install `.ipa` file via [Apple Configurator](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12) |
| `development` | Android | Physical Device     | `build:android:dev`      | `.apk`    | Install manually (enable "Install from unknown sources")                                                          |
| `emulator`    | iOS     | Simulator           | `build:ios:emulator`     | `.app`    | Accept the EAS prompt to install the build on a running simulator                                                  |
| `emulator`    | Android | Emulator            | `build:android:emulator` | `.apk`    | Install the `.apk` file via drag and drop                                                                         |
| `preview`     | iOS     | TestFlight          | `build:ios:preview`      | `.ipa`    | Submit `.ipa` file to App Store via `bun run submit:ios:preview`                                                     |
| `preview`     | Android | Google Play Console | `build:android:preview`  | `.aab`    | Submit `.aab` file to Google Play Console via `bun run submit:android:preview`                                       |
| `production`  | iOS     | Physical Device     | `build:ios:prod`         | `.ipa`    | Submit `.ipa` file via `bun run submit:ios:production`                                                               |
| `production`  | Android | Physical Device     | `build:android:prod`     | `.aab`    | Submit `.aab` file via `bun run submit:android:production`                                                           |

## Releasing

### Preview

1. (If native changes) `bun run publish:preview` (iOS and Android builds are built and submitted for testing)
2. Merge a PR to `preview` branch (automatically publishing a release to all beta testers)

### Production

1. (If native changes) `bun run publish:production` (iOS and Android builds are built and submitted for testing)
2. (If native changes) Submit App to Review in Google Play Console
3. (If native changes) Submit App to Review in App Store Connect
4. Merge a PR to `production` branch (automatically publishing a release to all users)

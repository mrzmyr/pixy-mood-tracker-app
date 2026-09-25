# Pixy E2E tests (on-device)

End-to-end tests using [Maestro](https://maestro.mobile.dev). The same flows can run against the release APK on a real Android device or the installed iOS simulator build.

## Prereqs

- [maestro-runner](https://github.com/devicelab-dev/maestro-runner) for `bun sessions run`, or the Maestro CLI (`curl -Ls https://get.maestro.mobile.dev | bash`) for `./e2e/run.sh`
- JDK 17+ (`JAVA_HOME` set or discoverable via `/usr/libexec/java_home`)
- Device connected with USB debugging, app installed: `adb install -r android/app/build/outputs/apk/release/app-release.apk`
- Or a booted iOS simulator with Pixy installed.

## Run

Use the repo CLIs to pick a device, run flows, and see what runs where. Flows run through [maestro-runner](https://github.com/devicelab-dev/maestro-runner), which needs no JDK.

```sh
bun devices list                           # running devices, owners, sessions (--all for stopped ones)
bun devices create --platform ios          # own simulator for this worktree
bun devices boot avd:<name>                # Android emulator (read-only, parallel-safe)
bun sessions run <id> --build --record     # release build of this worktree, all flows, videos
bun sessions run <id> e2e/flows/02-log-entry.yaml
bun sessions list                          # which tests run on which device
bun sessions kill <session-id|device-id>   # stop one run
bun devices shutdown <id>                  # stop a device; deletes simulators made by create
bun devices gc                             # stop stale sessions, release idle devices
bun dashboard                              # live web view of devices, sessions, builds (http://127.0.0.1:4848)
bun builds check --release                 # will --build reuse a cached build?
```

A session is stale when its process died, its heartbeat stopped for 2 minutes, or it ran longer than `--max-age` (default 60m). `bun devices gc` releases devices the CLI started once idle for `--max-age`, and never touches other devices.

Logs and reports (with `--record` videos) land in `~/.cache/pixy-mood-tracker/devices/{logs,reports}/<session-id>`. Set `PIXY_MOOD_TRACKER_DEVICES_DIR` to move this state.

`./e2e/run.sh` still runs all flows on a single connected Android device with Maestro.

## Suites

| Flow | Covers |
| --- | --- |
| 01-onboarding | Welcome, explainer slides, reminder skip, privacy accept, persistence across relaunch |
| 02-log-entry | Create entry (rating), day view, second entry per day |
| 03-calendar | Today cell, scroll months back, scroll-to-today button, filters open/close |
| 04-tags | Create, rename, use in logger, delete |
| 05-statistics | Stats tab, highlights/empty state, month + year report |
| 06-settings-data | Data screen, export/import visible, reset-all round trip |
| 07-settings-reminder | Reminder toggle on/off with notification permission |
| 09-appearance | Colors screen, steps config, privacy toggle |
| 10-stability | Background/foreground, cold restart (2nd-launch crash regression), tab smoke |
| apple/ios-regressions | iOS filter modal, narrow check-in layout/switch accessibility, tag form accessibility |

Suite 08 (passcode) intentionally absent: the passcode feature is commented out in the app (`src/screens/Settings/index.tsx`).

Import-from-file (Data → Import) is not automated — it goes through the Android system file picker, which is flaky to drive; test manually with `e2e/fixtures/seed.json`.

## Conventions

- Flows reset app state (`clearState: true`) and complete onboarding via `subflows/complete-onboarding.yaml`.
- Logger slides use deterministic first-entry and reminder sequences, avoiding slow conditional selector polling.
- Selectors prefer `testID`s: `mood-<rating>`, `logger-next`, `logger-save`, `calendar-day-<YYYY-MM-DD>`, `scroll-to-bottom`, tab ids `calendar`/`statistics`/`settings`.
- English device locale assumed (text selectors come from `assets/locales/en.json`).

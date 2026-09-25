# Pixy E2E tests (on-device)

End-to-end tests using [Maestro](https://maestro.mobile.dev). The same flows can run against the release APK on a real Android device or the installed iOS simulator build.

## Run

Install [maestro-runner](https://github.com/devicelab-dev/maestro-runner), then:

```sh
bun devices create --platform ios              # or: bun devices boot avd:<name>
bun sessions run <device-id> --build --record  # release build of this worktree, all flows, videos
```

Run `bun devices help`, `bun sessions help`, and `bun builds help` for all commands. See also [development docs](../docs/development.md#devices-sessions-and-builds).

`./e2e/run.sh` runs all flows with the Maestro CLI (JDK 17+) on one connected Android device.

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

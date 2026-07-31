# Pixy E2E tests (on-device)

End-to-end tests using [Maestro](https://maestro.mobile.dev). The same flows can run against the release APK on a real Android device or the installed iOS simulator build.

## Prereqs

- Maestro CLI (`curl -Ls https://get.maestro.mobile.dev | bash`)
- JDK 17+ (`JAVA_HOME` set or discoverable via `/usr/libexec/java_home`)
- Device connected with USB debugging, app installed:
  `adb install -r android/app/build/outputs/apk/release/app-release.apk`
- Or a booted iOS simulator with Pixy installed.

## Run

```sh
./e2e/run.sh                       # all suites
./e2e/run.sh e2e/flows/02-log-entry.yaml   # single suite
maestro test --device <simulator-udid> e2e/flows/01-onboarding.yaml
maestro test --device <simulator-udid> e2e/apple/ios-regressions.yaml
```

Debug artifacts (screenshots, hierarchy, logcat) land in `~/.maestro/tests/<timestamp>/` on failure.

## Suites

| Flow | Covers |
|---|---|
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

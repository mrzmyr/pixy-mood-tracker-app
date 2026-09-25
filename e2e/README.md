# Pixy E2E tests (on-device)

End-to-end tests are [Maestro](https://maestro.mobile.dev) YAML flows. [agent-device](https://github.com/callstack/agent-device) runs them through its Maestro compatibility runtime on iOS simulators, Android emulators, and phones. It is a pinned dev dependency, so `bun install` sets it up. It needs no JDK or Maestro CLI.

## Prereqs

- Node 22.12+ (agent-device requirement).
- iOS: Xcode with a simulator runtime.
- Android: `ANDROID_HOME` set to the SDK path (for example `/opt/homebrew/share/android-commandlinetools`) in the shell that starts the first agent-device command. The agent-device daemon keeps that environment.
- A release build of this worktree on the device (see [Run](#run)).

## Run

```sh
# 1. Boot a device. Parallel agents pick different devices; agent-device locks each one to a single run.
bunx agent-device boot --platform ios --device "iPhone 17 Pro"
bunx agent-device boot --platform android --device medium_phone --headless

# 2. Install a release build of this worktree (bun builds check --release shows cache reuse).
bun ios --device <udid> --configuration Release --no-bundler
bun android --device <avd-name> --variant release --no-bundler

# 3. Run flows. --device is required, so the run never lands on another agent's device.
bun e2e run --platform ios --device <udid>                  # e2e/flows and the iOS-only e2e/apple
bun e2e run --platform android --device emulator-5554       # e2e/flows
bun e2e run --platform ios --device <udid> e2e/flows/02-log-entry.yaml --record
bun e2e run --platform ios --device <udid> -- --retries 1 --fail-fast

# 4. Watch and stop runs across worktrees.
bun e2e list                                                # running runs (--all for finished)
bun e2e stop <run-id>                                       # like Ctrl+C in the run's terminal
bun dashboard                                               # runs, devices, and builds in a web view
```

`bun e2e run` wraps `agent-device test --maestro` with the repo reporter. Paths replace the default flows. Flags after `--` go to agent-device (`--retries 1`, `--fail-fast`, `--reporter junit:<file>`). Every command has `--help`; invalid usage exits with code 2.

- **Artifacts:** each run writes `.agent-device/test-artifacts/<run-id>/` in the worktree: `run.json` (from [`scripts/cli/e2e-reporter.mjs`](../scripts/cli/e2e-reporter.mjs), read by `bun dashboard`), and per flow `replay.ad`, `result.txt`, `failure.txt`, `replay-timing.ndjson`, and `recording.mp4` with `--record-video`.
- **Failures:** a failing step prints the file and line, a screen snapshot, and ranked selector suggestions. Debug live with `bunx agent-device replay <flow>.yaml --maestro --platform ios --udid <udid>`, then `bunx agent-device snapshot -i`.
- **Devices in use:** `bunx agent-device device status` lists which worktree holds which device. `bun e2e run` refuses a device with an active run or another worktree's live agent-device session (`device_busy`); `--force` skips the check. `bunx agent-device close --session <address>` releases one. `bunx agent-device shutdown --platform ios --udid <udid>` stops an idle simulator.
- **Physical phones:** flows use `launchApp: clearState: true`, which wipes app data on Android phones. Never run them on a phone with real data. Only run flows without `clearState` against installed TestFlight or internal-testing builds.

## Suites

| Flow | Covers |
| --- | --- |
| 01-onboarding | Welcome, explainer slides, reminder skip, privacy accept, persistence across relaunch |
| 11-onboarding-native-back | Arrow back, Android system Back within onboarding |
| 02-log-entry | Create entry (rating), day view, second entry per day |
| 03-calendar | Starts at today, loads calendar history past 12 months, keeps loading older months, scroll-to-today button, filters open/close |
| 04-tags | Create, rename, use in logger, delete |
| 05-statistics | Stats tab, highlights/empty state, month + year report |
| 06-settings-data | Data screen, export/import visible, reset-all round trip |
| 07-settings-reminder | Reminder toggle on/off with notification permission |
| 12-onboarding-reminder | Enable Reminder during onboarding and verify reminder settings |
| 09-appearance | Colors screen, steps config, privacy toggle |
| 10-stability | Background/foreground, cold restart (2nd-launch crash regression), tab smoke |
| apple/ios-regressions | iOS filter modal, narrow check-in layout/switch accessibility, tag form accessibility |

Suite 08 (passcode) intentionally absent: the app has no passcode feature.

Import-from-file (Data → Import) is not automated because the system file picker is flaky to drive. The fixture includes a visible entry from 2023-09-24. The calendar flow uses that entry when present; otherwise, it creates a good entry on that date through Calendar, then continues paging through empty months in 2022 and 2021.

## Conventions

- Flows reset app state (`clearState: true`) and complete onboarding via `subflows/complete-onboarding.yaml`.
- Logger slides use deterministic first-entry and reminder sequences, avoiding slow conditional selector polling.
- Selectors prefer `testID`s: `mood-<rating>`, `logger-next`, `logger-save`, `calendar-day-<YYYY-MM-DD>`, `scroll-to-bottom`, tab ids `calendar`/`statistics`/`settings`.
- English device locale assumed (text selectors come from `assets/locales/en.json`).
- Stay inside [agent-device's Maestro subset](https://oss.callstack.com/agent-device/docs/replay-e2e.md#run-maestro-compatibility-flows). Unsupported commands and fields (`waitToSettleTimeoutMs`, `visibilityPercentage`, `speed`) fail the run before any step.
- `back` taps visible in-app back UI on iOS. Close modals through their own control (`log-list-close`, `calendar-filter-done`) instead.
- End text input with `pressKey: Enter`; iOS keyboards without a dismiss key reject `hideKeyboard`.

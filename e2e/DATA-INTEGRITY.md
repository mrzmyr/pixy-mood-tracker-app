# Data integrity e2e scenarios

End-to-end scenarios that prove entries survive real app use: kills, relaunches, updates, and large histories. They exist because users lost entries in [#215](https://github.com/mrzmyr/pixy-mood-tracker-app/issues/215).

Each scenario has a fixed ID. Its flow file is `e2e/flows/data-integrity/<id>.yaml`, and it runs with:

```sh
./e2e/run.sh e2e/flows/data-integrity/di-01-kill-after-save.yaml
```

## Overview

| ID | Scenario | Catches | Runs on | Status |
| --- | --- | --- | --- | --- |
| DI-01 | Kill right after saving | Entry lost when the app is killed after save | Emulator, simulator | Planned |
| DI-02 | Several separate sessions | Scattered missing days, as in #215 | Emulator, simulator | Planned |
| DI-03 | Delete tag keeps entries | Logs dropped by a stale tag delete (#261) | Emulator, simulator | Planned |
| DI-04 | Export, reset, import | Import or export losing entries | Emulator, simulator | Planned, partly manual |
| DI-05 | Update over the store version | Migration losing data on update | Emulator, simulator | Planned |
| DI-06 | Large history | Android 2 MB row limit breaking load | Emulator, simulator | Planned, needs seed hook |
| DI-07 | Unreadable stored data | Corrupt data overwritten with nothing | Emulator, simulator | Planned, needs fault hook |
| DI-08 | Failed write shows alert | Silent write failures (#262) | Emulator, simulator | Planned, needs fault hook |

**Runs on:** every scenario creates, resets, or replaces entries. Never run them on a phone with real data, including TestFlight tester devices.

## Rules for every scenario

- Check persistence only after `stopApp` + `launchApp`. An entry visible before a relaunch proves nothing.
- Log past days by tapping `calendar-day-<YYYY-MM-DD>`. Dates come from `e2e/scripts/set-output-date.js`, never hardcoded.
- A scenario passes only if every "Pass when" line holds. No retries of failed assertions.

## Prerequisite

Calendar cells expose `testID` but not whether a day has an entry, and Maestro cannot read cell colors. Before any scenario can assert entries, add an accessibility label to `src/screens/Calendar/CalendarDay/index.tsx`, for example `"2026-09-24, has entry"` or `"2026-09-24, no entry"`.

## Scenarios

### DI-01: Kill right after saving

1. Fresh install, complete onboarding.
2. Create an entry for today with rating "good".
3. `stopApp` right after the logger closes.
4. `launchApp`.

**Pass when:** today's cell has an entry and "Add another entry for today" is visible.

### DI-02: Several separate sessions

1. Fresh install, complete onboarding.
2. For each of the last 7 days: `launchApp`, log that day, `stopApp`.
3. `launchApp`.

**Pass when:** all 7 day cells have an entry.

### DI-03: Delete tag keeps entries

1. Fresh install, complete onboarding.
2. Create tag "E2E tag". Log today with that tag.
3. Delete "E2E tag" in Settings > Tags.
4. `stopApp`, `launchApp`.

**Pass when:** today's cell has an entry, and its day view does not show "E2E tag".

### DI-04: Export, reset, import

1. Import `e2e/fixtures/seed.json`. Manual step: the system file picker is not automatable.
2. Export. Note the entry count in the exported file.
3. Reset data. Import the exported file (manual).
4. `stopApp`, `launchApp`.

**Pass when:** the entry count matches step 2, and a sample day from the seed has an entry.

### DI-05: Update over the store version

1. Install the current store build. Complete onboarding and log the last 3 days.
2. Install the new build over it without uninstalling.
3. `launchApp`.

**Pass when:** all 3 day cells have an entry.

**Needs:** the current store build as a file (Android APK or iOS simulator build).

### DI-06: Large history

1. Load a generated history of 3 years with long notes, over 2 MB.
2. `stopApp`, `launchApp`. Log today.
3. `stopApp`, `launchApp`.

**Pass when:** the first and last seeded days and today all have an entry.

**Needs:** a way to load the history without the file picker, such as a Development Tools action available only in e2e builds.

### DI-07: Unreadable stored data

1. Log today.
2. Replace the stored logs with invalid JSON.
3. `launchApp`, then log another day.
4. Restore valid data, `launchApp`.

**Pass when:** step 3 does not overwrite the stored value, and today's entry is back after step 4.

**Needs:** an e2e-only Development Tools action to write invalid stored logs.

### DI-08: Failed write shows alert

1. Turn on "fail log writes" (e2e-only).
2. Log today.

**Pass when:** an alert titled "Stored data could not be saved" appears.

**Needs:** an e2e-only Development Tools action that makes log writes fail.

## Order to build

1. The prerequisite label, then DI-01, DI-02 and DI-03. These need no app hooks.
2. DI-05 and DI-04.
3. DI-06, DI-07 and DI-08, after deciding how to add e2e-only hooks to the app.

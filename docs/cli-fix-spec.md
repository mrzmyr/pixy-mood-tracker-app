# CLI fix spec: close gaps after closed device API refactor

Status: ready for execution. Executor: any agent. Base: `main` at or after commit `6c09a66b`.

## Context

The closed CLI (`bun app`, `bun e2e`, `bun builds`) works. Verification on 2026-09-27 found gaps. This spec fixes them. Read `docs/development.md` section on the closed CLI first.

## Measured gaps

- **G1 Install prebuilds on cache hit.** `bun app install ios` in a fresh worktree ran `expo prebuild` and `pod install`, wrote 1.4G into `ios/`, took 138 s. A cached build existed.
- **G2 Install tolerates an Expo failure by log text.** Expo's launch step (`simctl openurl`) timed out after 60 s on an erased simulator and exited non-zero. `runLogged` matched two log strings and continued.
- **G3 E2E blocked by own session.** `bun app open ios` then `bun e2e run ios <flow>` failed: `ios device <udid> is owned by session "cwd:<hash>:ios"`. The owner was the same worktree.
- **G4 E2E depends on leftover app state.** `e2e/flows/02-log-entry.yaml` failed after `bun app seed ios seed`, passed on a clean simulator.
- **G5 Build lock has no stale detection.** A killed build leaves `<cache file>.lock`. The next build waits 30 min, then fails.
- **G6 Android close does not wait for shutdown.** `adb devices` still listed the emulator right after `bun app close android`.
- **G7 Leftovers:** `simulators` script in `package.json`; `bun builds list` accepts `--platform` and `--json`; help prints `[options]` for commands without options; stale comment in `.gitignore`; bare `adb` from `PATH` in app commands.

## Fixed decisions

Do not reopen these.

- **F1 Install never calls Expo.** `install` = ensure cached build (same logic as `build`), then install the cached binary directly.
  - iOS: `xcrun simctl install <udid> <cache dir>/<key>.app`
  - Android: `<sdk>/platform-tools/adb -s <serial> install -r <cache dir>/<key>.apk`
  - Expo (`scripts/run-native.ts`) is called only by `build` on a cache miss.
- **F2 No prebuild on cache hit.** After `install` with a cached build in a fresh worktree, `ios/` and `android/` do not exist.
- **F3 Install marks the build as used.** Call `resolveBuildCache` from `scripts/build-cache-provider.cjs` to get the path. It updates `lastUsedAt`, so prune keeps the build.
- **F4 No failure tolerance by log text.** Delete the `isInstalled` option and its string matching from `runLogged`. A non-zero exit throws.
- **F5 E2E owns a clean start.** `bun e2e run <platform>` does, in order:
  1. `ensureDevice(platform)`
  2. Close this worktree's own agent-device session: `agent-device close --platform <p> <flag> <id>`. Ignore only "no session" errors.
  3. Reset app: iOS `xcrun simctl uninstall <udid> <appId>` (ignore "not installed"), Android `adb uninstall <appId>` (ignore "not installed").
  4. Install the cached build (same function as `bun app install`, F1).
  5. Run `agent-device test`.
- **F6 Build lock records its owner.** The lock directory contains `owner.json` with `pid` and `startedAt` (`ps -o lstart= -p <pid>` with `LC_ALL=C`). A waiter treats the lock as stale when the pid is dead or its start time differs. It removes the stale lock and takes it. Lock code lives in its own module and exports `withCacheLock(file, work)`.
- **F7 Android close waits.** After `agent-device close --shutdown`, poll `adb devices` until the serial is gone. Deadline 60 s, then throw `emulator_shutdown_timeout`.
- **F8 adb path.** Every adb call uses `<sdk>/platform-tools/adb` from `getAndroidBuildEnv().ANDROID_HOME`. No bare `adb`.
- **F9 `bun builds list` takes no options.** Prints the table. Remove `--platform` and `--json`.
- **F10 Help text.** Usage line shows `[options]` and the footer says "for options" only when the noun has a command with options. After F9 no command has options, so neither appears.
- **F11 Errors.** Every error is a `CliError` with `status`, `message`, `why`, `fix`. Exit code 2 for usage, 1 otherwise.
- **F12 No new flags.** No verb gains a flag or environment switch.

## Rules for the executor

- Work the four phases in order in one session. One phase = one branch from current `main` = one PR.
- Per phase: implement, run `bun run check`, run every verification command, paste real output into the PR body, `gh pr create`, then `gh pr merge --squash --delete-branch`, then `git checkout main && git pull`. Start the next phase only after the merge.
- **Gate:** compare each verification output to the expected result exactly. Do not start the next phase until every check passes. If a check fails, fix inside the phase and rerun all checks of the phase. Never mark a check passed on assumption.
- Conventional Commits. Branch and PR names never contain `codex`.
- Public repo. No secrets, no team ids, no personal absolute paths in code or docs.
- Do not edit e2e flows, app source under `src/`, or this spec.
- Native builds take 10 to 15 min. Run them in the background and watch the log. A cached build for current `main` exists; most checks need no compile.
- Second worktree for parallel checks: `/tmp/pixy-mood-tracker-fix-b`, created with `git worktree add --detach /tmp/pixy-mood-tracker-fix-b HEAD` from your phase branch, then `bun install` there. Remove it at the end of each phase with `bun app close ios` inside it, `git worktree remove --force`, `bun builds prune`.
- If a required tool is missing, stop and report. Do not skip a check.

## Phase 1: direct install (G1, G2, F1 to F4, F8)

Changes:

- `scripts/cli/app.ts`:
  - Extract `ensureBuild(platform)`: the current `build` body without printing. Returns `{ key, file }`.
  - `build` = `ensureBuild` then print `toBuildId(key)`.
  - New exported `installBuild(platform, device)`: `ensureBuild`, then `resolveBuildCache` for the path, then the direct install command from F1. Throws `install_failed` with stderr first line in `why`.
  - `install` = `ensureDevice` then `installBuild`. No call to `scripts/run-native.ts`.
  - `runLogged`: remove `isInstalled`, `prefix`, and the log text matching.
  - Replace bare `adb` with the SDK path. Put `getAdb()` in `scripts/cli/device.ts` and export it.
- `docs/development.md`: install bullet says "installs the cached binary directly, no prebuild".

Verification:

1. `bun run check` exits 0.
2. `grep -n "run-native" scripts/cli/app.ts` shows matches only inside `ensureBuild` and the import line.
3. `grep -n "isInstalled\|Opening on\|simctl openurl" scripts/cli/*.ts` prints nothing.
4. `grep -n '"adb"' scripts/cli/*.ts` prints nothing.
5. Fresh worktree, cache hit:
   ```
   git worktree add --detach /tmp/pixy-mood-tracker-fix-b HEAD
   cd /tmp/pixy-mood-tracker-fix-b && bun install
   time bun app install ios
   ls -d ios android
   ```
   Expected: install exits 0 in under 90 s (includes simulator create and boot). `ls` prints `No such file or directory` for both.
6. Second `time bun app install ios` in the same worktree (simulator booted): exits 0 in under 15 s.
7. `xcrun simctl get_app_container <udid of pixy-mood-tracker-<hash>> com.devmood.pixymoodtracker.preview` prints a path.
8. `bun app open ios` exits 0 and prints a screenshot path.
9. Main worktree: `time bun app install android` exits 0. With the emulator already booted a second run takes under 20 s. `<sdk>/platform-tools/adb -s <serial> shell pm path com.devmood.pixymoodtracker.preview` prints `package:`.
10. `bun builds list` shows `LAST USED` under `60s` for the installed iOS and Android builds.
11. Cleanup as in the rules. `git status --porcelain` prints nothing in the main worktree.

Gate: all 11 pass.

## Phase 2: e2e clean start (G3, G4, F5)

Changes:

- `scripts/cli/e2e.ts`: implement F5 steps 1 to 5 before spawning `agent-device test`. Import `installBuild` from `app.ts` (or move it to a shared module if the import creates a cycle).
- Session close errors: ignore statuses for a missing session only (`session_not_found`, `no_open_session`, or the message agent-device returns for it; find it by running the command once with no session open). Any other error throws.
- `docs/development.md`: e2e bullet says the run closes the own session, reinstalls the app, then runs flows.

Verification:

1. `bun run check` exits 0.
2. G3 case:
   ```
   bun app install ios && bun app open ios && bun e2e run ios e2e/flows/01-onboarding.yaml
   ```
   Expected: exit 0, output contains `✓ 01-onboarding.yaml`.
3. G4 case:
   ```
   bun app seed ios seed && bun e2e run ios e2e/flows/02-log-entry.yaml
   ```
   Expected: exit 0, output contains `✓ 02-log-entry.yaml`.
4. Parallel: in `/tmp/pixy-mood-tracker-fix-b` run `bun e2e run ios e2e/flows/01-onboarding.yaml` while the main worktree runs `bun e2e run ios e2e/flows/02-log-entry.yaml`. Start both within 5 s of each other. Both exit 0.
5. E2E without prior install: `bun app close ios && bun e2e run ios e2e/flows/01-onboarding.yaml` exits 0.
6. Android: `bun app install android && bun app open android && bun e2e run android e2e/flows/01-onboarding.yaml` exits 0.
7. Cleanup. `git status --porcelain` prints nothing.

Gate: all 7 pass.

## Phase 3: stale build lock (G5, F6)

Changes:

- New `scripts/cli/cache-lock.ts` exporting `withCacheLock(file: string, work: () => Promise<void>): Promise<void>`.
  - Lock dir `<file>.lock`, created with `fs.mkdirSync` (atomic).
  - Writes `owner.json` inside right after taking the lock.
  - Waiter: reads `owner.json`. Missing file and lock dir older than 10 s counts as stale. Dead pid or different start time counts as stale.
  - Stale lock: `fs.rmSync(lock, { recursive: true, force: true })`, then retry `mkdirSync`. Print `note: removed stale build lock of pid <pid>` on stderr.
  - Releases on success, on throw, and on `SIGINT` and `SIGTERM`.
  - 30 min deadline stays, error `build_lock_timeout`.
- `scripts/cli/app.ts`: `buildWithLock` removed, `ensureBuild` uses `withCacheLock`.

Verification:

1. `bun run check` exits 0.
2. Stale lock with dead pid:
   ```
   F=/tmp/pixy-mood-tracker-lock-test/build.app
   mkdir -p $F.lock && echo '{"pid":999999,"startedAt":"Thu Jan  1 00:00:00 1970"}' > $F.lock/owner.json
   time bun -e 'import { withCacheLock } from "./scripts/cli/cache-lock.ts"; await withCacheLock(process.argv[1], async () => { console.log("work ran"); });' $F
   ls -d $F.lock
   ```
   Expected: prints `note: removed stale build lock of pid 999999` and `work ran`, under 5 s. `ls` prints `No such file or directory`.
3. Live lock blocks, then frees:
   ```
   bun -e 'import { withCacheLock } from "./scripts/cli/cache-lock.ts"; await withCacheLock(process.argv[1], async () => { await Bun.sleep(8000); console.log("first done"); });' $F &
   sleep 1
   time bun -e 'import { withCacheLock } from "./scripts/cli/cache-lock.ts"; await withCacheLock(process.argv[1], async () => { console.log("second ran"); });' $F
   ```
   Expected: `first done` prints before `second ran`. The second command takes between 6 s and 12 s. No `removed stale` line.
4. Killed owner: start the first command of check 3 with a 60 s sleep in the background, `kill -9` it after 2 s, then run the second command. Expected: `removed stale build lock`, `second ran`, under 5 s.
5. `bun app build ios` prints `Cached build found` and the build id.
6. `rm -rf /tmp/pixy-mood-tracker-lock-test`. `git status --porcelain` prints nothing.

Gate: all 6 pass.

## Phase 4: Android close wait and leftovers (G6, G7, F7, F9, F10)

Changes:

- `scripts/cli/app.ts` `close`: F7 polling for Android.
- `scripts/cli/builds.ts`: `list` without options. Remove `PLATFORM_OPTION`, `getPlatform` for builds, JSON branch.
- `scripts/cli/index.ts` and `scripts/cli/shared.ts`: F10. Remove option types and `parseArgs` option handling only if no command uses options. `--help` and `-h` still work.
- `package.json`: remove the `simulators` script.
- `.gitignore`: remove the comment line `# agent-device sessions and e2e artifacts`.
- `docs/development.md`: remove mentions of `--platform` and `--json` for builds.
- Delete `docs/cli-fix-spec.md` if it exists on `main`.

Verification:

1. `bun run check` exits 0.
2. `bun app install android && bun app close android; <sdk>/platform-tools/adb devices | grep -c emulator` prints `0`.
3. `bun builds list --json` exits 2 with `error [invalid_option]`. `bun builds list` exits 0 and prints the table.
4. `bun app --help` output contains neither `[options]` nor `for options`. `bun app build --help` prints `Usage: bun app build <ios|android>`.
5. `grep -n '"simulators"' package.json` prints nothing. `bun simulators` prints `error: Script not found "simulators"`.
6. `grep -n "agent-device" .gitignore` prints nothing.
7. `wc -l scripts/cli/*.ts | tail -1` is below 2000.
8. Full run in main worktree, each exits 0:
   ```
   bun app install ios && bun app seed ios year && bun app open ios && bun e2e run ios e2e/flows/01-onboarding.yaml && bun app close ios
   ```
9. `git status --porcelain` prints nothing. `git worktree list | grep pixy-mood-tracker-fix-b` prints nothing. `xcrun simctl list devices | grep pixy-mood-tracker-` shows only `Shutdown`.

Gate: all 9 pass. Done.

## Out of scope

- Deleting the legacy simulator named `pixy-mood-tracker`.
- Changing e2e flows.
- Android parallel emulators.
- Physical devices.

# CLI refactor spec: closed device API

Status: draft for execution. Owner: Moritz. Executor: any agent.

## Goal

Replace `scripts/cli` with a closed, deterministic CLI. Agent runs one verb per step. No option to choose. Worktrees are ephemeral. Builds are throwaway. Everything the CLI writes lives outside the worktree.

## Requirements

- **Parallel:** two worktrees build, install, open, and run e2e at the same time on iOS. Never block each other.
- **Exact reuse:** a build with the same cache key is reused, never recompiled.
- **Closed API:** every verb takes one positional `ios|android`. `seed` takes a fixture id. Nothing else. No flags.
- **Ephemeral worktree:** `git worktree remove` plus `bun builds prune` removes every trace: simulator, sessions, logs, artifacts.
- **Out of tree:** the CLI never writes into the worktree except `ios/` and `android/` that Expo prebuild owns.

## Target API

```
bun app build   ios|android              compile preview variant into cache if missing, print build id
bun app install ios|android              install cached build on this worktree's device
bun app open    ios|android              launch app, wait for first screen, screenshot
bun app seed    ios|android <fixture-id> replace app data with fixture, wait for first screen
bun app close   ios|android              end session, reset device data, shut down, prune
bun e2e run     ios|android [paths...]   run Maestro flows on this worktree's device
bun builds list                          list cached builds
bun builds rm <id>                       remove one cached build
bun builds prune                         remove old builds and state of deleted worktrees
```

Human-only, unchanged: `bun start`, `bun ios`, `bun android`, `bun ios:preview`, `bun android:preview`, `eas:*`.

Removed: `bun devices`, `bun simulators`, `bun dashboard`, `bun e2e list`, `bun e2e stop`, `bun builds status`, `bun app doctor`, every `--flag` of `bun app` and `bun e2e`.

## Verified facts

Measured on 2026-09-26 with `@expo/cli` 57.0.27 and `agent-device` 0.21.14. Build on these, do not re-verify.

- **iOS cache hit skips xcodebuild and JS bundling.** `EXPO_PUBLIC_APP_VARIANT=preview bun scripts/run-native.ts ios --configuration Release --no-bundler --device <udid>` with a cached `.app`: 8 s to 18 s, zero `CompileC` lines, zero bundle lines, log says `Using cached build`. Miss: 13 min 38 s full compile.
- **iOS build-only uploads with the same key.** `--device generic --output <dir>` saved `ios-<fingerprint>-Release-<source hash>.app`. The later `--device <udid>` run looked up the identical key. Generic build also checks the cache first and copies on hit.
- **JS rebundle only with `--unstable-rebundle`.** Never pass it.
- **`--no-bundler` is required for Release.** Without it Expo starts Metro on a free port.
- **Android cache hit skips Gradle and bundling.** `--variant release --no-bundler --device pixy-mood-tracker`: 27 s, zero Gradle task lines. Miss: 9 min 32 s.
- **Android `--device` matches the AVD name only.** `--device pixy-mood-tracker` works. `--device emulator-5554` fails with `Could not find device with name`. Never pass a serial to Expo.
- **Expo's launch after install is unreliable and irrelevant.** Expo opens `<scheme>://expo-development-client/?url=...` (iOS) or `exp+pixy-mood-tracker://...` (Android). On Android with Dev and Preview both installed this shows an "Open with" chooser and the app does not start. Exit code stays 0. `install` ignores the launch. `open` relaunches by app id and is the only authority on app state.
- **`pm clear com.devmood.pixymoodtracker.preview` works on the release build.** Prints `Success`, app stays installed.
- **Two worktrees drive two simulators at once.** Concurrent `open`, `snapshot -i`, `screenshot` from two worktrees on two booted simulators: works. Two XCTest runner processes coexist. Claims are host-global. Cross-worktree open on a held device fails `DEVICE_IN_USE` within 1 s.
- **`agent-device boot` is unsafe for fresh simulators.** Under load it hit its hardcoded 90 s daemon timeout, force-killed the shared daemon, shut the simulator down again, and interrupted the other worktree's runner build. Boot with `xcrun simctl boot <udid>` then `xcrun simctl bootstatus <udid> -b` instead. Manual boot took 38 s.
- **`xcrun simctl erase` right after `agent-device close --shutdown` is safe.** Simulator is `Shutdown` when close returns. Erase took under 1 s.
- **agent-device session dir name is computable.** `~/.agent-device/sessions/cwd_<hash>_<platform>` where `<hash>` = first 16 hex chars of `sha256(realpath(git root of cwd))`. Verified against this repo. The dir stores no workspace path, so compute the hash from `checkout.txt`.
- **`device status --json` lists claims with `owner.workspace`** as the absolute worktree path. Use it to release claims of deleted worktrees.
- **Seed deep link works without an alert.** `agent-device open com.devmood.pixymoodtracker.preview "pixy-preview://dev/fixture?id=year" --platform ios --udid <udid>` returned in 0.7 s, `wait 'id="calendar"' 30000` passed in 150 ms, calendar full of entries. `alert get` returned `ALERT_NOT_FOUND` every time on an installed app. The `Open in “Pixy Preview”?` alert may still appear once per fresh install. Handle it optionally, never block on it.
- **Unknown fixture id shows an in-app error screen**, testID `dev-fixture-link`, text `fixture_unknown: Unknown fixture "nope"`. Validate ids before opening the link.
- **Selector syntax for `wait` and `is visible`:** `id="calendar"`, `role="button" label="Start"`, `label="Filters"`, `text="Calendar"` work. `#calendar` and bare `calendar` do not (bare matches text). Always shell-wrap in single quotes.
- **App state persists across `open --relaunch`.** After `seed fresh`, `open` shows onboarding, not the calendar. `open` must accept both D7 selectors.
- **Expo's dev-client deep link is a no-op on the release app.** `pixy-preview://expo-development-client/?url=...` changes nothing.
- **Stale shared daemon breaks every worktree.** agent-device runs one daemon per `~/.agent-device`, started from the `node_modules` of whichever worktree called first. After that worktree is deleted, every command in other worktrees fails with `Cannot find module '/private/tmp/<deleted>/node_modules/agent-device/dist/src/...'` or `iOS runner project not found`. Fix: kill that daemon; the next call starts one from a live checkout. `~/.agent-device/daemon.json` holds its pid.
- **Deps dedup already works.** `bun install` in a new worktree: `du` says 746M, real `df` delta 132M (clonefile). No linker change needed.

## Fixed decisions

Do not reopen these during execution.

- **D1 Variant:** agent verbs use `preview` only. Release build, JS embedded, no Metro. `development` stays human-only via `bun ios`.
- **D2 iOS device:** one simulator per worktree, named `pixy-mood-tracker-<hash>`. `<hash>` is the 12-char checkout hash from `getCheckoutDir` in `scripts/cli/shared.ts`. Device type `iPhone 17 Pro`. Created on first use. Booted with `xcrun simctl boot <udid>` then `xcrun simctl bootstatus <udid> -b`. Never `agent-device boot` (see verified facts).
- **D3 Android device:** one AVD per machine, named `pixy-mood-tracker`. Android parallelism is out of scope. Two worktrees on Android serialize through agent-device device claims.
- **D4 Build path:** `bun app install` delegates to `scripts/run-native.ts` (Expo `run:ios` / `run:android`). Expo resolves the cache through `scripts/build-cache-provider.cjs` and installs. No custom `xcodebuild` or Gradle call for install. Expo's own launch attempt after install is ignored (it may show a chooser on Android or launch nothing). Android device is always passed as `--device pixy-mood-tracker` (AVD name), never the serial.
- **D5 Build verb:** iOS `bun app build ios` runs `expo run:ios --configuration Release --device generic --output <checkout dir>/build` through `run-native.ts`. Expo uploads to cache. Android `bun app build android` runs `./gradlew app:assembleRelease` in `android/` then `uploadBuildCache` from the provider. Both print the build id from `toBuildId(key)`.
- **D6 State root:** `~/.cache/pixy-mood-tracker/checkouts/<hash>/`. Subfolders: `e2e/` (agent-device artifacts), `build/` (Expo `--output`), `screenshots/`, logs.
- **D7 Ready state:** app is ready when `role="button" label="Start"` (onboarding) or `id="calendar"` is visible. Both checked, first hit wins. 120 s deadline.
- **D8 Close resets:** `close` runs `agent-device close --shutdown`, then iOS `xcrun simctl erase <udid>`, Android `adb shell pm clear com.devmood.pixymoodtracker.preview`. Then `bun builds prune`.
- **D9 Prune defaults:** keep 1 build per platform+target+variant, keep builds used within 2 days. Not configurable.
- **D10 Physical devices:** not supported by `bun app` or `bun e2e`. Humans use `bun ios --device <udid>`.
- **D11 Errors:** every thrown error is `CliError` with `status`, `message`, `why`, `fix`. Exit code 2 for usage, 1 otherwise. Unknown fixture id lists valid ids in `fix`.
- **D12 No fallbacks:** when a step fails, throw. Never retry another strategy silently.
- **D13 Daemon guard:** before the first agent-device call of any verb, `agentDevice()` in `scripts/cli/agent-device.ts` reads `~/.agent-device/daemon.json`. It resolves the daemon's script path (from the json if present, else from `ps -o command= -p <pid>`). If that path does not exist on disk, run `agent-device daemon stop --state-dir ~/.agent-device`; if the process is still alive after 5 s, `process.kill(pid, "SIGKILL")`. Print `note: stopped stale agent-device daemon from <path>`. Then continue. This is cleanup of a dead path, not a fallback.

## Rules for the executor

- One phase = one PR. Conventional Commits. Branch name never contains `codex`.
- Run `bun run check` before every commit. It must pass.
- **Gate:** at the end of each phase run every verification command. Compare output to the expected result exactly. Do not start the next phase until every check passes. If a check fails, fix it inside the phase. Never mark a check as passed on assumption.
- Verification commands that need devices run on the Mac with Xcode and Android SDK. If a tool is missing, stop and report. Do not skip.
- Public repo. No secrets, no team ids, no personal paths in code or docs. Use `~` in docs.
- Keep `CODING_STANDARDS.md`. Read it first.

## Phase 0: baseline

Goal: known-good start and numbers to compare against.

Steps:

1. `git status` clean on `main`. `bun install`.
2. Record disk baseline into the PR description of phase 1:
   ```
   du -sh ~/.cache/pixy-mood-tracker ~/Library/Developer/CoreSimulator/Devices
   xcrun simctl list devices | grep pixy-mood-tracker
   ls ~/.agent-device/sessions
   ```
3. `bun run check` passes.

Verification:

- `bun run check` exits 0.
- `git status --porcelain` prints nothing.

Gate: both pass. Otherwise fix the environment first.

## Phase 1: state out of tree

Goal: nothing under the worktree is written by `bun e2e` or `bun app` except `ios/` and `android/`.

Changes:

- `scripts/cli/shared.ts`: add `getStateDir(kind: "e2e" | "build" | "screenshots")` returning `path.join(getCheckoutDir(REPO_ROOT), kind)`, created with `mkdirSync({ recursive: true })`.
- `scripts/cli/e2e.ts`: `--artifacts-dir` becomes `getStateDir("e2e")`. Remove `ARTIFACTS_DIR` from `runs.ts` usage in `e2e.ts`. `runs.ts` reads runs from `getStateDir("e2e")` of every checkout dir under `~/.cache/pixy-mood-tracker/checkouts/*/e2e` instead of worktrees. (Runs get deleted in phase 4, keep it compiling now.)
- `scripts/cli/e2e-reporter.mjs`: no change in shape, it writes into the artifacts dir it receives.
- `scripts/cli/app.ts`: `SCREENSHOT` and `SNAPSHOT` move to `getStateDir("screenshots")`.
- `.gitignore`: remove the `.agent-device/` line. Nothing writes there anymore.
- `docs/development.md`: run files section names `e2e/`, `build/`, `screenshots/` under the checkout dir.

Verification:

1. `bun run check` exits 0.
2. Boot the existing simulator and run one flow:
   ```
   UDID=$(xcrun simctl list devices -j | python3 -c 'import json,sys; print(next(d["udid"] for r in json.load(sys.stdin)["devices"].values() for d in r if d["name"]=="pixy-mood-tracker"))')
   xcrun simctl boot $UDID; xcrun simctl bootstatus $UDID -b
   bun e2e run e2e/flows/01-onboarding.yaml --device pixy-mood-tracker
   ```
   Expected: exit 0 or a flow failure, either is fine here.
3. `ls .agent-device` prints `No such file or directory`.
4. `ls ~/.cache/pixy-mood-tracker/checkouts/*/e2e/` lists at least one run folder with `run.json`.
5. `git status --porcelain` prints nothing.

Gate: checks 1, 3, 4, 5 pass.

## Phase 2: device derivation

Goal: one module decides the device. No caller passes a device.

Changes:

- New `scripts/cli/device.ts` exporting `ensureDevice(platform): Promise<{ id: string; name: string }>`:
  - iOS: name `pixy-mood-tracker-<hash>`. Find via `xcrun simctl list devices -j` (available only). Create with `xcrun simctl create <name> "iPhone 17 Pro"` when missing. When state is not `Booted`: `xcrun simctl boot <udid>` (ignore "already booted" error), then `xcrun simctl bootstatus <udid> -b` with a 180 s timeout. Return `{ id: udid, name }`.
  - Android: name `pixy-mood-tracker`. Reuse `createAndroidEmulator` and `bootAndroidEmulator` from `scripts/cli/simulators.ts`, moved into `device.ts`. Return `{ id: serial, name }`.
  - `deviceFlag(platform)` moves here from `app.ts`.
- `scripts/cli/simulators.ts`: delete. Move needed functions into `device.ts`.
- `scripts/cli/index.ts`: remove `simulators` noun. Update help text and `unknown_cli` error.
- `package.json`: remove `simulators` script.
- Keep `bun app` and `bun e2e` flags for now. They are removed in phase 3. In this phase `--device` becomes optional and defaults to `ensureDevice(platform)` where `--platform` is given. Minimal glue only.

Verification:

1. `bun run check` exits 0.
2. `bun simulators create --platform ios` prints `error [unknown_cli]`.
3. In this worktree:
   ```
   bun -e 'import { ensureDevice } from "./scripts/cli/device.ts"; console.log(await ensureDevice("ios"))'
   ```
   Expected: JSON with `name` equal to `pixy-mood-tracker-<12 hex chars>` and a UDID. Run twice. Second run prints the same UDID.
4. `xcrun simctl list devices | grep pixy-mood-tracker-` shows that simulator as `Booted`.
5. Create a second worktree and repeat check 3 there:
   ```
   git worktree add /tmp/pixy-mood-tracker-spec-b HEAD
   cd /tmp/pixy-mood-tracker-spec-b && bun install
   bun -e 'import { ensureDevice } from "./scripts/cli/device.ts"; console.log(await ensureDevice("ios"))'
   ```
   Expected: a different name and a different UDID. Both simulators `Booted` in `xcrun simctl list devices`.
6. Android: `bun -e 'import { ensureDevice } from "./scripts/cli/device.ts"; console.log(await ensureDevice("android"))'` prints `{ id: "emulator-5554", name: "pixy-mood-tracker" }` or another `emulator-NNNN` serial. `adb devices` lists it as `device`.
7. Keep worktree `/tmp/pixy-mood-tracker-spec-b` for phase 3.

Gate: checks 1 to 6 pass.

## Phase 3: closed `bun app`

Goal: `bun app <verb> <platform>` with no flags. Remove Metro, alerts, provisioning, devicectl, physical device code.

Changes in `scripts/cli/app.ts`, rewrite:

- Parse: `args[0]` must be `ios` or `android`, else `CliError` `invalid_platform`, exit 2. `seed` takes `args[1]` fixture id.
- `PREVIEW = APP_VARIANTS.preview`. `appId = PREVIEW.appId`, `scheme = PREVIEW.scheme`.
- `build`:
  - iOS: `spawnSync` of `bun scripts/run-native.ts ios --configuration Release --no-bundler --device generic --output <getStateDir("build")>` with `EXPO_PUBLIC_APP_VARIANT=preview`. Log to `<checkout dir>/ios-build.log` via `tee`-like piping (`spawn`, pipe stdout and stderr to file, print `Log: <path>`). Expo checks the cache first and copies on hit, so the explicit key check below is only for the stdout id. Full compile takes about 14 min; set no timeout below 30 min.
  - Android: `getAndroidBuildEnv()`, `ensurePrebuild("android", "preview", env)`, then `./gradlew app:assembleRelease --console=plain` in `android/`, then `buildCacheProvider.uploadBuildCache({ platform: "android", fingerprintHash, runOptions: { variant: "release" }, projectRoot: REPO_ROOT, buildPath: <apk> })`. Reuse `runLogged` from `app-build.ts` for the log file, then delete the rest of `app-build.ts`.
  - Both: compute key with `buildCacheProvider.getCacheKey`, skip compile when `<cacheDir>/<key>.app|.apk` exists, print `Cached build found` on stderr. Print `toBuildId(key)` on stdout.
- `install`:
  - `ensureDevice(platform)`.
  - `spawnSync` of `bun scripts/run-native.ts <platform> --configuration Release --no-bundler --device <udid>` (iOS) or `--variant release --no-bundler --device pixy-mood-tracker` (Android), `EXPO_PUBLIC_APP_VARIANT=preview`. Expo resolves the cache and installs. Exit code non-zero throws `native_build_failed` with log path in `fix`.
  - Keep `isInstalled` / `recordInstall` skip logic only if it fits in 60 lines. Otherwise drop it. Expo reinstalls, cost is seconds.
- `open`:
  - `ensureDevice(platform)`.
  - `agentDevice(["open", appId, "--platform", platform, deviceFlag(platform), id, "--relaunch"], { timeoutMs: 120_000 })`.
  - `waitReady()`: loop until `agent-device is visible '<selector>' --platform <p> <flag> <id>` succeeds for one of the two D7 selectors (`role="button" label="Start"`, `id="calendar"`), each call with `--timeout 3000`, 120 s total deadline, 1 s sleep between rounds. Do not use `agent-device wait` with one selector: it blocks the full timeout when the other screen is showing. On deadline: screenshot and `snapshot -i` into `getStateDir("screenshots")`, throw `app_not_ready` with both paths in `fix`.
  - On success: `agent-device screenshot <screenshots dir>/open.png`, print path on stdout.
- `seed <fixture-id>`:
  - Import `FIXTURES` from `../../src/dev/fixtures/index.ts`. Unknown id throws `fixture_not_found`, exit 2, `fix` lists ids.
  - `ensureDevice(platform)`.
  - `agentDevice(["open", appId, `${scheme}://dev/fixture?id=${id}`, "--platform", platform, deviceFlag(platform), deviceId])`.
  - iOS: `agent-device alert get --json`. `ALERT_NOT_FOUND` is the normal case, continue. When an alert exists and its message starts with `Open in “Pixy`, `agent-device press 'label="Open"'`. Any other alert throws `unexpected_alert`.
  - `waitReady()`. Screenshot to `<screenshots dir>/seed-<id>.png`, print path.
- `close`:
  - `ensureDevice(platform)` must not create or boot. Add `findDevice(platform)` in `device.ts` that returns `null` when missing.
  - `agentDevice(["close", "--platform", platform, deviceFlag(platform), id, "--shutdown"])`, ignore `no open session` errors, print `pass`.
  - iOS: `xcrun simctl erase <udid>`. Android: `adb -s <serial> shell pm clear <appId>` before shutdown (needs a running emulator, so order: pm clear, then close --shutdown).
  - Run `pruneBuilds()` from `builds.ts`.
- Delete from `app.ts`: `selectDevice`, `checkDeviceFree`, `readIosPhone`, `checkIosPhone`, all `Profile` code, `hasXcodeAccount`, `runDoctorChecks`, `cmdDoctor`, `getAdb` (move to `device.ts`), `resolveBuild`, `assertBuildFitsDevice`, `checkEmbeddedProfile`, Metro functions, `getDevClientUrl`, `allowLocalNetwork`, `launchWithDevicectl`, `launchOnSimulator`, `confirmOpenUrl`, `hideAndroidDevMenu`, `wakeAndroidScreen`, `openOnAndroid`, `quitAndroidApps`, `quitIosApp`, `waitForBundle`, `requireDevice`, `requireVariantFlag`.
- Delete files: `scripts/cli/app-build.ts` (after moving `runLogged`), `scripts/cli/build-lock.ts`, `scripts/cli/gradle-error.ts`, `scripts/cli/runner-error.ts` (keep only if `waitReady` uses `isRunnerStartFailure`; then keep the 14 lines).
- `scripts/cli/index.ts`: `CommandSpec` keeps `args` and `summary`. Remove `options`, `hasPassthrough`, `usage` from `app` specs. Help prints `bun app <verb> <ios|android>`.
- `scripts/cli/agent-device.ts`: add the D13 daemon guard, run once per process before the first call. Delete `findAgentDevice` and `listAgentDevices` if no caller remains after phase 4. Check at phase 4.
- `docs/development.md`: replace the `bun app` and build cache sections with the target API table and D1 to D10 as bullets.

Verification, run in this worktree and in `/tmp/pixy-mood-tracker-spec-b` at the same time in two terminals:

1. `bun run check` exits 0.
2. `bun app build ios --variant preview` prints `error [unexpected_argument]` or `error [invalid_option]`, exit 2.
3. `bun app build ios` in both worktrees at once. Both exit 0. Both print the same build id on stdout when the source trees are identical. `ls ~/.cache/pixy-mood-tracker/build-cache/*.app | wc -l` grew by at most 1.
4. `bun app build ios` again. Prints `Cached build found` on stderr, same id, finishes under 60 s.
5. `bun app install ios` in both worktrees at once. Both exit 0 within 60 s. Expo output contains `Using cached build`. No `xcodebuild` compile lines (`CompileC`) in the log. No `Bundled` line in the log.
6. `bun app seed ios fresh` in both. Exit 0. Screenshot path printed. Open the PNG: onboarding start screen.
7. `bun app seed ios seed`. Exit 0. Screenshot shows the calendar with entries.
8. `bun app seed ios nope` prints `error [fixture_not_found]` and lists `fresh, empty, seed, year`. Exit 2.
9. `bun app open ios`. Exit 0. Screenshot shows the calendar.
10. `bun app close ios` in both. Exit 0. `xcrun simctl list devices | grep pixy-mood-tracker-` shows both `Shutdown`. `xcrun simctl get_app_container <udid> com.devmood.pixymoodtracker.preview` prints `No such file or directory` (erased).
11. Android in this worktree only: `bun app build android`, `bun app install android`, `bun app seed android seed`, `bun app open android`, `bun app close android`. Each exits 0. `install` log contains `Using --device pixy-mood-tracker` and, on second run, `Using cached build` with zero `> Task` lines. An Android "Open with" chooser after install is expected and not a failure; `open` must still exit 0 with the calendar visible. After close, `adb devices` lists no emulator.
12. `git status --porcelain` in both worktrees prints nothing.
13. `wc -l scripts/cli/*.ts | tail -1` is below 1800.
14. Daemon guard: from `/tmp/pixy-mood-tracker-spec-b` run `bun app open ios` so its daemon starts there (`ps -o command= -p $(python3 -c 'import json;print(json.load(open("'$HOME'/.agent-device/daemon.json"))["pid"])')` contains `pixy-mood-tracker-spec-b`; if the json has another pid field name, report it and adapt). Then rename that worktree's `node_modules/agent-device` to `node_modules/agent-device.off`. From this worktree run `bun app open ios`. Expected: stderr contains `stopped stale agent-device daemon`, exit 0, calendar or Start visible. Rename the folder back.

Gate: all 13 pass. Check 3 and 5 run in parallel, not one after the other.

## Phase 4: closed `bun e2e`, remove run tracking

Goal: `bun e2e run <platform> [paths...]`. Delete run bookkeeping and dashboard.

Changes:

- `scripts/cli/e2e.ts`: `run` takes `args[0]` platform, rest paths. `ensureDevice(platform)`. Call `agent-device test` as today with `--env APP_ID=<preview appId>`, `--env APP_SCHEME=pixy-preview`, `--artifacts-dir getStateDir("e2e")`, `--reporter default`, `--reporter junit:<e2e dir>/junit.xml`. Remove `--record`, `--force`, `--variant`, `--device`, passthrough. Remove `assertDeviceFree`, `findDeviceUser`, `listFreeDevices`, `describeAlternatives`, `readDeviceState`, `getTypicalDurationMs`, `describeRunProgress`, `cmdList`, `cmdStop`.
- Delete: `scripts/cli/runs.ts`, `scripts/cli/e2e-reporter.mjs`, `scripts/cli/dashboard.ts`, `scripts/cli/dashboard.html`, `scripts/cli/devices.ts`.
- `REPO_ROOT` moves from `runs.ts` to `shared.ts`.
- `scripts/cli/agent-device.ts`: delete `findAgentDevice`, `listAgentDevices`, `Claim` if unused. Keep `agentDevice`, `getAgentDeviceEnv`, `AGENT_DEVICE`.
- `scripts/cli/index.ts`: nouns are `app`, `builds`, `e2e`. Remove `ALIASES` if no `list`/`rm` alias remains needed (`builds ls` may stay).
- `package.json`: remove `devices`, `dashboard` scripts.
- `e2e/README.md` (if exists, else `docs/development.md`): e2e section says `bun e2e run ios` and where artifacts land.

Verification:

1. `bun run check` exits 0.
2. `bun e2e list` prints `error [unknown_command]`. `bun dashboard` fails with `Module not found` or the script is gone from `package.json` (`bun dashboard` prints `Script not found`).
3. `bun app install ios && bun e2e run ios e2e/flows/01-onboarding.yaml`. Exit 0. Output shows the flow passed.
4. `ls ~/.cache/pixy-mood-tracker/checkouts/<this hash>/e2e/` contains `junit.xml` and a run folder.
5. Parallel: in `/tmp/pixy-mood-tracker-spec-b`, `bun app install ios && bun e2e run ios e2e/flows/02-log-entry.yaml` while check 3 runs. Both exit 0.
6. `ls scripts/cli` prints exactly: `agent-device.ts app.ts builds.ts device.ts e2e.ts index.ts shared.ts` (plus `runner-error.ts` if kept).
7. `git status --porcelain` prints nothing.

Gate: all 7 pass.

## Phase 5: prune cascade and throwaway builds

Goal: deleting a worktree plus one command leaves nothing behind.

Changes in `scripts/cli/builds.ts`:

- `prune` has no options. Constants `KEEP_BUILDS = 1`, `KEEP_WITHIN = "2d"`.
- `pruneCheckouts`: for every `~/.cache/pixy-mood-tracker/checkouts/<hash>/` whose `checkout.txt` path no longer exists:
  - `xcrun simctl delete <udid>` for the simulator named `pixy-mood-tracker-<hash>` if present.
  - Compute `sessionHash = sha256(checkout path from checkout.txt).hex.slice(0, 16)`. The path in `checkout.txt` is already a realpath of the git root. Delete `~/.agent-device/sessions/cwd_<sessionHash>_*`. Before deleting, run `agent-device device status --json`; if a claim has `owner.workspace` equal to the checkout path, run `agent-device device release --stale --platform <p> --udid|--serial <id>` for it first.
  - If the running daemon's script path (D13 logic) lies under the deleted checkout, stop it the same way.
  - `rm -rf` the checkout dir.
- Delete `cmdBuildsStatus`, `checkBuild`, `getFingerprint`, `getRunOptions`, `parseKeep`, `parseDuration` (if unused after), `DEFAULT_KEEP_*`.
- `bun app close` already calls prune (phase 3). Confirm.

Verification:

1. `bun run check` exits 0.
2. In `/tmp/pixy-mood-tracker-spec-b`: `bun app install ios` then `bun app close ios`. Note its hash `H` from `ls ~/.cache/pixy-mood-tracker/checkouts` (the folder whose `checkout.txt` says `/private/tmp/pixy-mood-tracker-spec-b`).
3. `cd .. && git worktree remove --force /tmp/pixy-mood-tracker-spec-b`.
4. `bun builds prune`. Output contains `Removed run files of deleted checkout /private/tmp/pixy-mood-tracker-spec-b` and `Deleted simulator pixy-mood-tracker-H`.
5. `xcrun simctl list devices | grep pixy-mood-tracker-H` prints nothing.
6. `ls ~/.cache/pixy-mood-tracker/checkouts/H` prints `No such file or directory`. 6b. `S=$(printf '%s' /private/tmp/pixy-mood-tracker-spec-b | shasum -a 256 | cut -c1-16); ls -d ~/.agent-device/sessions/cwd_${S}_*` prints `no matches found` or `No such file or directory`. `bunx agent-device device status --json` lists no claim with that workspace.
7. `bun builds list` shows at most 1 build per `OS`+`TARGET`+`VARIANT` group older than 2 days.
8. `bun builds prune --dry-run` prints `error [invalid_option]`, exit 2.
9. `git status --porcelain` prints nothing.

Gate: all 9 pass.

## Phase 6: skill and docs

Goal: agent instructions contain zero decisions.

Changes:

- `.agents/skills/run-app/SKILL.md` body becomes:
  ```
  # Steps

  Run in order. Relay each `Step N` line. Do not pick devices or variants; the CLI owns them.

  1. `bun app install <ios|android>`
  2. `bun app seed <ios|android> <fixture-id>` (ids: fresh, empty, seed, year)
  3. `bun app open <ios|android>`
  4. Use the app: `bunx agent-device help workflow`
  5. `bun app close <ios|android>`

  e2e: `bun e2e run <ios|android> [paths...]`. Android runs one at a time per machine.
  Physical phones: humans only, `bun ios --device <udid>`.
  ```
- `docs/development.md`: sections `Build cache`, `Run files`, `Parallel runs` rewritten from D1 to D12 as bullets. Remove `bun devices`, `bun simulators`, `bun dashboard`, `bun e2e list|stop`, `bun builds status` mentions. Add disk section: worktree is source only, state under `~/.cache/pixy-mood-tracker/checkouts/<hash>/`, `bun builds prune` cascades.
- `AGENTS.md`: no change unless it names a removed command. `grep -n "bun devices\|bun simulators\|bun dashboard\|e2e list\|e2e stop\|builds status" AGENTS.md docs/*.md .agents -r` must print nothing.

Verification:

1. The grep above prints nothing.
2. `bun run check` exits 0 (format check covers markdown if oxfmt is configured for it; otherwise skip).
3. A fresh agent session given only `SKILL.md` and `bun app --help` can run steps 1 to 5 on iOS without asking a question. Execute the five commands yourself in order, exit 0 each.
4. Delete this spec file in the final PR of this phase. The docs replace it.

Gate: all pass. Done.

## Out of scope

- Android parallel emulators.
- Physical device automation.
- Remote (EAS) build cache.
- Moving Xcode derived data or Gradle `.cxx` out of `node_modules`. Dies with the worktree.
- Metro port allocation per worktree. `development` variant is human-only.

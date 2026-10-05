---
name: run-app
description: Build, install, and run the app on a device. Use when asked to run the app, run it with Metro for hot reload, install a build on a phone, simulator, or emulator, or time a native build.
---

# Steps

Run in order. Relay each `Step N` line. Do not pick variants; the CLI owns them.

1. `bun devices list`. Copy one value of column `OPTION`: `--platform=<ios|android>` for simulator or emulator, `--target=<target>` for a phone. Use it as `<device>` below.
   Phone: `bun devices reserve <device> --goal="<what you do>"` first, so other agents cannot take it. Pick another phone on `device_reserved`.
2. `bun app install <device>`
3. `bun app seed <device> --fixture=<id>` (ids: fresh, empty, seed, year)
4. `bun app open <device>`
5. Use the app: `bunx agent-device help workflow`
6. `bun app close <device>`
7. Phone: `bun devices release <device>`

e2e: `bun e2e run <device> [--paths=<path,...>]`. One device per command. Start one command per phone for parallel runs.
Help and errors: `bun <noun> <command> --help`. Limits on phones: [development.md](../../../docs/development.md#phones).

# Development with Metro (hot reload)

Use when the user edits code and wants to see changes without a native build.

1. `bun app dev --platform=<ios|android>`. Installs the cached dev client, starts this checkout's Metro, opens the app, prints a screenshot path.
   Data and flags in one go: `bun app dev --platform=ios --fixture=year --flag=people=on,photos=off`. Dev menu stays hidden.
2. Edit code. The app reloads. Rerun step 1 to reload by hand.
3. Drive the app: `bunx agent-device ... --platform <ios|android> --udid <id>` or `xcrun simctl`. App ID `com.devmood.pixymoodtracker.dev`.
4. `bun app close --platform=<ios|android>` stops Metro and the device.

Rules:

- Builds live in `~/.cache/pixy-mood-tracker/build-cache`. `bun builds list` shows them. Never search `ios/build` or `~/Library/Developer/Xcode/DerivedData`, never conclude "no dev build" from them.
- Never create simulators by hand. The CLI owns one simulator per checkout.
- Dev client is shared across worktrees with the same native dependencies. A cache miss means native dependencies changed. Compile then, not before.
- Phones: `bun ios --device <udid>`.

# Shell (zsh)

- Never put several flags in one variable (`$FLAGS`). zsh does not split words, so the command gets one argument. Use an array: `flags=(--platform ios); bunx agent-device snapshot "${flags[@]}"`
- Write `${VAR}:path`, not `$VAR:path`. zsh reads `:r`, `:h`, `:t` after `$VAR` as modifiers.
- Quote globs in arguments (`--include='*.ts'`). zsh fails the command on an unmatched glob: `no matches found`.

---
name: run-app
description: Build, install, and run the app on a device. Use when asked to run the app, install a build on a phone, simulator, or emulator, or time a native build.
---

# Steps

Run in order. Relay each `Step N` line. Do not pick variants; the CLI owns them.

1. `bun devices list`. Copy one value of column `OPTION`: `--platform=<ios|android>` for simulator or emulator, `--target=<target>` for a phone. Use it as `<device>` below.
2. `bun app install <device>`
3. `bun app seed <device> --fixture=<id>` (ids: fresh, empty, seed, year)
4. `bun app open <device>`
5. Use the app: `bunx agent-device help workflow`
6. `bun app close <device>`

e2e: `bun e2e run <device> [--paths=<path,...>]`. One device per command. Start one command per phone for parallel runs.
Help and errors: `bun <noun> <command> --help`. Limits on phones: [development.md](../../../docs/development.md#phones).

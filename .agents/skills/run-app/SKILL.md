---
name: run-app
description: Build, install, and run the app on a device. Use when asked to run the app, install a build on a phone, simulator, or emulator, or time a native build.
---

# Steps

Run in order. Relay each `Step N` line. Do not pick devices or variants; the CLI owns them.

1. `bun app install <ios|android>`
2. `bun app seed <ios|android> <fixture-id>` (ids: fresh, empty, seed, year)
3. `bun app open <ios|android>`
4. Use the app: `bunx agent-device help workflow`
5. `bun app close <ios|android>`

e2e: `bun e2e run <ios|android> [paths...]`. Android runs one at a time per machine.
Physical phones: humans only, `bun ios --device <udid>`.

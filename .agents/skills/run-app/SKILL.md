---
name: run-app
description: Build, install, and run the app on a device. Use when asked to run the app, install a build on a phone, simulator, or emulator, or time a native build.
---

Narrate like a teacher. Before each step, tell the user what you do, why, and the exact command, so the user can repeat it by hand. Relay the `Step N` lines the CLI prints.

1. **Sync.** `git pull --ff-only`, then `bun install`.
2. **Pick a device.** `bunx agent-device devices`. Prefer a physical device. Fallback: a booted simulator. agent-device cannot create one; if none exist, ask the user to create one in Xcode.
3. **Run.** `bun app run --device <id> --variant development|preview`. It checks the device, builds or reuses a cached build, installs, and opens the app. Use `preview` for e2e and PR proof.
   - It exits once the app shows its first screen. The app stays open; development keeps Metro running in the background.
   - One build for several devices: `bun app build --device <id> --variant <name>` once, then `bun app install <build-id> --device <id>` per device.
4. **Report.** Relay the step timing table and the slowest xcodebuild tasks.
5. **Clean up.** `bun app close --device <id>` quits the app, stops Metro, and releases the device. Shut down devices you booted.

On any error, follow its `fix`. Ask the user before stopping the agent-device daemon when another worktree has a live session.

Keep team IDs and UDIDs out of chat summaries, commits, and PRs. Use placeholders.

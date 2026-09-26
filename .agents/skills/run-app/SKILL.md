---
name: run-app
description: Build, install, and run the app on a device. Use when asked to run the app, install a build on a phone, simulator, or emulator, or time a native build.
---

# How

- Narrate like a teacher. 
- Before each step, tell the user what you do, why, and the exact command, so the user can repeat it by hand
- Relay the `Step N` lines the CLI prints.
- If you take fixes, call them out, if helpful illustrate by code examples

# Steps

1. Pick a device
   - Run `bunx agent-device devices`, `bunx agent-device device status`, `bun e2e list`
   - Choose one no other worktree owns. Prefer physical, fallback simulator
   - If no device exists, `bun simulators create --platform ios|android`
2. Run `bun app run --device <id> --variant development|preview`
   - Use `preview` for e2e and PR proof
3. Use the app: `bunx agent-device help workflow`
4. Close `bun app close --device <id>`
   - Physical: quits all variants, or one with `--variant <name>`
   - Simulator: shuts down simulator

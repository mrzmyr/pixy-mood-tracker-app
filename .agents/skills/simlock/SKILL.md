---
name: simlock
description: Use before touching an iOS simulator, Android emulator or test phone, or before running simctl, adb, emulator or xcodebuild for a simulator, or agent-device. Simlock shares these devices between agents and has rules every agent must follow.
---

Simlock shares iOS simulators, Android emulators and test phones between agents. It works only if every agent follows its rules.

1. Check it is set up: run `simlock whoami`. If `simlock` is not found, or `whoami` fails, tell the user and do not touch any device.

2. Get the rules: run `simlock instructions` and follow them. They match the installed Simlock, so read them again in each session instead of relying on memory.

More: https://callstackincubator.github.io/simlock/docs/getting-started/connect-your-agent/

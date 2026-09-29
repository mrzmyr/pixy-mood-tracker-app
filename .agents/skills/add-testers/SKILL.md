---
name: add-testers
description: Add beta testers for Pixy on Android and iOS. Use when a user asks to test a new version.
---

## Android

Testers join alone:

1. Join https://groups.google.com/g/pixy-mood-tracker-testers
2. Open https://play.google.com/apps/testing/com.devmood.pixymoodtracker, tap "Become a tester"
3. Update Pixy from Play Store

New build: `gplay promote --package com.devmood.pixymoodtracker --from internal --to pixy-mood-tracker-testers`

## iOS

Add by hand: App Store Connect → TestFlight → "Website Invites" → add tester email.

- Group needs a build, else no invite
- `fastlane pilot add` fails

## Reply to tester

1. Backup first, say why (test version, file is only way back): Settings → Data → Export → save file outside Pixy → check `.json` exists. This is important!
2. Restore: Settings → Data → Import
3. Join steps above
4. Never uninstall Pixy, deletes data. Also important!

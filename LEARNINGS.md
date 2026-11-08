# Learnings

Facts about the platform, tools, and machine that code search does not show.

- Add one bullet per discovery: the fact, then what to do
- Remove an entry when it stops being true

- Hermes lacks some modern array methods. `pixy-standards/no-hermes-missing-array-methods` enforces the safe forms.
- Hermes lacks `Intl.RelativeTimeFormat`, `ListFormat`, `PluralRules`, `DisplayNames`, `Segmenter`, `Locale`. `pixy-standards/no-hermes-missing-intl` bans them in `src`.
- Native builds live in `~/.cache/pixy-mood-tracker/build-cache`, shared by all worktrees. Check `bun builds list` before any compile. `ios/build` and Xcode DerivedData say nothing about cached builds. Dev client with Metro: `bun app dev --platform=<ios|android>` ([run-app skill](.agents/skills/run-app/SKILL.md)). Never create simulators by hand.
- Error `disk_low`: free disk without asking. Follow its `fix` steps ([`scripts/cli/disk.ts`](scripts/cli/disk.ts)). Never delete other files. Never delete all of `ios/build`: it holds React Native codegen output, and a delete forces full rebuilds.
- Device availability comes from `bun devices list` only. Not `adb devices`, not other device tools. A shut-down emulator is free: the CLI boots it.
- iOS 26 wraps JS `headerLeft`/`headerRight` items in a shared glass capsule, which clips round buttons. Native bar items (`Stack.Toolbar`, `unstable_header*Items` buttons) take no accessibility identifier, so e2e cannot tap them by id. Use [`getModalBarOptions`](src/components/modal-bar-options.tsx): custom item with `hidesSharedBackground` holding a SwiftUI glass `HeaderButton`.
- A SwiftUI `Host` near the screen bottom takes the home indicator safe-area inset and draws its content up to 16 pt too high. Fast Refresh hides it; a fresh mount shows it. Set `ignoreSafeArea="all"` on a `Host` inside scrolling content.
- SwiftUI `Picker` with `pickerStyle("segmented")` draws `Image` segments at full symbol size and in label color. It ignores `font`, `foregroundStyle`, and `imageScale` on them, and `controlSize` barely shrinks them. For a small, quiet icon control, build it in React Native.
- `RAM low` or load average above 100: parallel agent sessions each hold a simulator, Metro, or native build. `bun devices list` shows the holder checkout. Free a holder without asking when its worktree is gone, its PR is merged, or it runs no Metro, `xcodebuild`, or Gradle. Then retry. Ask only when every holder is active. Never ship without proof because of load
- Close your own simulator, emulator, and Metro once proof is uploaded
- Simulator screenshots draw the Dynamic Island edge with up to 2 levels of noise between runs, and an iOS 26 glass back button renders a few pixels differently after another navigation path. Pixel compares must mask the island and reach a screen by the same path ([`png.ts`](scripts/sitemap/png.ts)).
- Other sessions prune the shared build cache to free disk, so a cached Release shell can vanish mid-task. Long-running tools keep an APFS clone (`cp -c`) of what they need.

## General

- https://linear.app/pixy-app/team/PIX/active
- https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124
- https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker
- https://expo.dev/accounts/z49/projects/pixy-mood-tracker
- Emails: team@pixy.day

- the project is called `pixy-mood-tracker`, use that slug always when creating folders, exeutables etc (not `pixy`, `pixy-app` etc)
- remove worktree when branch merged
- Start code changes with `bun worktree new <slug>`. Never edit the main checkout. Never use `--no-verify`.
- Do not document anything that an agent can easily find with code search

## Feature Flags

- We use Posthog for feature flags
- User MUST agree to the privacy policy to be able to test features using feature flags
- Setup, consent gate, and dev overrides: [docs/development.md](docs/development.md#feature-flags)
- New key in `keys.ts`: create PostHog flag in same task, never ask. Never replace existing release conditions. Rules: [docs/development.md](docs/development.md#feature-flags)

## PRs

- When multiple things have beend worked on in one go you want to create PR, suggest the user to create multiple PRs by topics for easier reviews; If you are sure, just go ahead and create multiple PRs even when the user said "create PR"
- Visual change: screenshot required, video too when motion
- Screenshots and videos: upload to PR body with [pr-proof skill](.agents/skills/pr-proof/SKILL.md). Proof files stay outside git

## Public repository security

- This project is public open source, so never include credentials or secret values in code, configuration, documentation, commits, pull requests, issues, comments, logs, or artifacts; reference secret names only and store values in approved secret managers.

## App facts

- [`docs/app-facts.json`](docs/app-facts.json) is the only place for app facts: name, ids, links, license, claims, feature list with status, store and source versions.
- Never create another facts file, feature list, or metadata table. README, store text, directory listings, and the website derive from this file.
- Public copy may claim a feature only when its `status` is `available`. Check `claims` before stating free, no ads, no account, local storage.
- Update after store releases or feature changes. Verify against source and live stores first. Bump `verifiedOn`.
- Keep directory credentials and account recovery details outside this public repository.

## Tools

- Posthog for product analytics (MCP installed)
  - Project IDs: App Production `7630`, App Preview `14574`, App Development `628970`, Website `12793`
  - MCP keeps the last active project, often not the one you need. Run `switch-project` first
- CodeRabbit for PR reviews (MCP installed)
- Sentry for error logging (MCP installed)
- FeatureOS User Feedback (MCP installed)

### Footguns

- Analytics events live in [`src/state/analytics/events.ts`](src/state/analytics/events.ts). Never send free text (notes, custom tag names) to PostHog. Send counts and lengths instead. Never send ratings, emotion keys, sleep quality, or mood feedback. Record every event rename in [docs/analytics.md](docs/analytics.md#event-history).
- Never write storage after a failed read. A read error must keep the stored data, not replace it with defaults (commits 1a1ddd8, f165aad).
- Hermes lacks some modern array methods. `pixy-standards/no-hermes-missing-array-methods` enforces the safe forms.
- Hermes lacks `Intl.RelativeTimeFormat`, `ListFormat`, `PluralRules`, `DisplayNames`, `Segmenter`, `Locale`. `pixy-standards/no-hermes-missing-intl` bans them in `src`.
- Keep all `@react-navigation/*` packages on the same major version. Mixing v6 and v7 breaks native navigation.
- React Compiler plus frozen screens (`freezeOnBlur`) can leave FlashList headers or footers stale after the screen unfreezes. No screen freezes today. `src/features/calendar/screens/Calendar/index.tsx` still opts out with `"use no memo"`. Run the e2e suite after enabling the compiler for more code.
- Initialize Sentry once, at module load in `src/app/_layout.tsx`, before the first render.
- Native builds live in `~/.cache/pixy-mood-tracker/build-cache`, shared by all worktrees. Check `bun builds list` before any compile. `ios/build` and Xcode DerivedData say nothing about cached builds. Dev client with Metro: `bun app dev --platform=<ios|android>` ([run-app skill](.agents/skills/run-app/SKILL.md)). Never create simulators by hand.
- Free disk only with `bun builds reclaim` (`--dry-run` first). Never delete all of `ios/build`: it holds React Native codegen output, and a delete forces full rebuilds.
- Device availability comes from `bun devices list` only. Not `adb devices`, not other device tools. A shut-down emulator is free: the CLI boots it.

### Testing

- Never add tests that only check translated labels or copy strings are unique
- Never add tests that only assert static content matches expected values (translation keys, UI copy, enum labels)
- Type safety and translation tooling catch label collisions at build time
- Write tests for behavior, logic, and user-facing outcomes, not for checking static data structures

## Notifications

- Toasts: `showToast` from [`src/lib/toast.ts`](src/lib/toast.ts). Reference: [shadcn Sonner](https://ui.shadcn.com/docs/components/radix/sonner)
- Title states the consequence: "Feedback sent", "Entry deleted". Never "Thank you" or "Success"
- One line by default. Add a subtitle only when the user needs context: what happens next or what it means. Example: "Request sent" + "I’ll reply by email."
- Past tense, sentence case, no exclamation mark, no trailing period in the title

## Releases

- MUST run `app-store-review` skill before App Store release

## References

- MUST read [CODING_STANDARDS.md](CODING_STANDARDS.md)
- MUST read [docs/documentation.md](docs/documentation.md)
- MUST read [docs/design.md](docs/design.md) for UI, copy, layout, forms, and interaction guidelines
- Use domain terms from [GLOSSARY.md](GLOSSARY.md) in code, copy, and docs

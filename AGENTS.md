## General

- https://linear.app/pixy-app/team/PIX/active
- https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124
- https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker
- https://expo.dev/accounts/z49/projects/pixy-mood-tracker
- Emails: team@pixy.day

- the project is called `pixy-mood-tracker`, use that slug always when creating folders, exeutables etc (not `pixy`, `pixy-app` etc)
- remove worktree when branch merged

## Feature Flags

- We use Posthog for feature flags
- User MUST agree to the privacy policy to be able to test features using feature flags
- Setup, consent gate, and dev overrides: [docs/development.md](docs/development.md#feature-flags)

## PRs

- When multiple things have beend worked on in one go you want to create PR, suggest the user to create multiple PRs by topics for easier reviews; If you are sure, just go ahead and create multiple PRs even when the user said "create PR"

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
  - Accessible projects: `Pixy App`, `Pixy Website`, and `Pixy App Test`.
- CodeRabbit for PR reviews (MCP installed)
- Sentry for error logging (MCP installed)
- FeatureOS User Feedback (MCP installed)

### Footguns

- Analytics events live in [`src/state/analytics/events.ts`](src/state/analytics/events.ts). Never send free text (notes, custom tag names) to PostHog. Send counts and lengths instead. Fixed values (rating, emotion keys, sleep quality) are fine. Record every event rename in [docs/analytics.md](docs/analytics.md#event-history).
- Never write storage after a failed read. A read error must keep the stored data, not replace it with defaults (commits 1a1ddd8, f165aad).
- Hermes lacks some modern array methods. `pixy-standards/no-hermes-missing-array-methods` enforces the safe forms.
- Keep all `@react-navigation/*` packages on the same major version. Mixing v6 and v7 breaks native navigation.
- React Compiler plus `freezeOnBlur` tabs can leave FlashList headers or footers stale after the tab unfreezes. `src/features/calendar/screens/Calendar/index.tsx` opts out with `"use no memo"`. Run the e2e suite after enabling the compiler for more code.
- Initialize Sentry once, at module load in `src/app/_layout.tsx`, before the first render.
- Native builds live in `~/.cache/pixy-mood-tracker/build-cache`, shared by all worktrees. Check `bun builds list` before any compile. `ios/build` and Xcode DerivedData say nothing about cached builds. Dev client with Metro: `bun app dev --platform=<ios|android>` ([run-app skill](.agents/skills/run-app/SKILL.md)). Never create simulators by hand.

## Releases

- MUST run `app-store-review` skill before App Store release

## References

- read [CODING_STANDARDS.md](CODING_STANDARDS.md)
- read [docs/documentation.md](docs/documentation.md)
- read [docs/design.md](docs/design.md) for UI, copy, layout, forms, and interaction guidelines

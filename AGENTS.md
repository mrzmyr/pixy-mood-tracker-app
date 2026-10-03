# Repository conventions

- the project is called `pixy-mood-tracker`, use that slug always when creating folders, exeutables etc (not `pixy`, `pixy-app` etc)
- Folder layout and import boundaries: [oxlint.config.ts](oxlint.config.ts).

## Feature Flags

- We use Posthog for feature flags
- User MUST agree to the privacy policy to be able to test features using feature flags
- Setup, consent gate, and dev overrides: [docs/development.md](docs/development.md#feature-flags)

## PRs

- When multiple things have beend worked on in one go, you want to create PR, suggest the user to create multiple PRs by topics for easier reviews; If you are sure, just go ahead and create multiple PRs even when the user said "create PR"

## Metadata

- https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124
- https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker

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

## Code

- read [CODING_STANDARDS.md]
- read [docs/design.md](docs/design.md) for UI, copy, layout, forms, and interaction guidelines

### Footguns

- Analytics events live in [`src/state/analytics/events.ts`](src/state/analytics/events.ts). Never send free text (notes, custom tag names) to PostHog. Send counts and lengths instead. Fixed values (rating, emotion keys, sleep quality) are fine. Record every event rename in [docs/analytics.md](docs/analytics.md#event-history).
- Never write storage after a failed read. A read error must keep the stored data, not replace it with defaults (commits 1a1ddd8, f165aad).
- Hermes lacks some modern array methods. `pixy-standards/no-hermes-missing-array-methods` enforces the safe forms.
- Keep all `@react-navigation/*` packages on the same major version. Mixing v6 and v7 breaks native navigation.
- React Compiler plus `freezeOnBlur` tabs can leave FlashList headers or footers stale after the tab unfreezes. `src/features/calendar/screens/Calendar/index.tsx` opts out with `"use no memo"`. Run the e2e suite after enabling the compiler for more code.
- Initialize Sentry once, at module load in `src/app/_layout.tsx`, before the first render.
- Native builds live in `~/.cache/pixy-mood-tracker/build-cache`, shared by all worktrees. Check `bun builds list` before any compile. `ios/build` and Xcode DerivedData say nothing about cached builds. Dev client with Metro: `bun app dev --platform=<ios|android>` ([run-app skill](.agents/skills/run-app/SKILL.md)). Never create simulators by hand.

### Testing

- Never add tests that only check translated labels or copy strings are unique
- Never add tests that only assert static content matches expected values (translation keys, UI copy, enum labels)
- Type safety and translation tooling catch label collisions at build time
- Write tests for behavior, logic, and user-facing outcomes, not for checking static data structures

## Releases

- MUST run `app-store-review` skill before App Store release

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit.
- Format descriptions as `<type>[optional scope]: <description>`.
- Use `feat` for features and `fix` for bug fixes. Use `build`, `chore`, `ci`, `docs`, `refactor`, `style`, or `test` when they fit.
- Mark breaking changes with `!` before `:` or a `BREAKING CHANGE:` footer.

## Errors

- Every error created, thrown, returned, or logged must expose `status`, `message`, `why`, and `fix`.
- `status` is a stable machine-readable status or error code.
- `message` states what failed.
- `why` states the concrete cause or relevant context.
- `fix` states an actionable recovery step.
- Preserve all four fields when wrapping or rethrowing errors.
- Never include secrets or personal data in these fields.
- Follow the [evlog structured error pattern](https://www.evlog.dev/).

```ts
{
  status: 402,
  message: "Payment failed",
  why: "Card declined by issuer",
  fix: "Try a different payment method",
}
```

## Documentation

**We prefer bullets over paragraphs**

✅ Good

```
- Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`
- Wwitch Superwall off: `EXPO_PUBLIC_SUPERWALL_ENABLED=false`
- E2E builds (`bun ios:e2e`, `bun android:e2e`) turn it off through [service mocks](../e2e/README.md#service-mocks)
- Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`
```

❌ Bad

```
Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`. Set `EXPO_PUBLIC_SUPERWALL_ENABLED=false` to switch Superwall off: the app never configures or calls it, and Settings hides Support Pixy. Unset, Superwall stays on. E2E builds (`bun ios:e2e`, `bun android:e2e`) turn it off through [service mocks](e2e/README.md#service-mocks). Development builds can expose the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`. Restart Expo after changing configuration. Production builds ignore fake mode.
```

**Prefer referencing over index tables**

✅ Good

```
## Suites

Path: `e2e/flows/*.yaml`
```

❌ Bad

```
## Suites

| Flow | Covers |
| --- | --- |
| 01-onboarding | Welcome, explainer slides, reminder skip, privacy accept, persistence across relaunch |
| 02-log-entry | Create entry (rating), day view, second entry per day |
| 03-calendar | Starts at today, loads calendar history past 12 months, keeps loading older months, scroll-to-today button, filters open/close |
| 04-tags | Create, rename, use in logger, delete |
| 05-statistics | Stats tab, highlights/empty state, month + year report |
| 06-settings-data | Data screen, export/import visible, reset-all round trip |
| 07-settings-reminder | Reminder toggle on/off with notification permission |
| 09-appearance | Colors screen, steps config, privacy toggle |
| 10-stability | Background/foreground, cold restart (2nd-launch crash regression), tab smoke |
| apple/ios-regressions | iOS filter modal, narrow check-in layout/switch accessibility, tag form accessibility |
```

**Prefer links over explainers**

✅ Good

```
- Questions API uses fake responses ([`src/lib/serviceFetch.ts`](src/lib/serviceFetch.ts))
- Superwall is never configured ([Settings screen](src/screens/Settings/index.tsx))
```

❌ Bad

```
- **Webhooks and questions API** (feedback, statistics feedback, question answers, question list) get fake responses from [`src/lib/serviceFetch.ts`](../src/lib/serviceFetch.ts). The question list is empty, so no question slide appears. Any other URL through `serviceFetch` fails with `service_mock_missing`.
- **Superwall** is never configured. Settings shows Support Pixy backed by the fake support client; `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE=failed` makes it fail.
```

**Use caveman language on docs**

Rules:

- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). No tool-call narration, no decorative tables/emoji, no dumping long raw error logs unless asked quote shortest decisive line. Standard well-known tech acronyms OK (DB/API/HTTP); never invent new abbreviations (cfg/impl/req/res/fn) tokenizer split them same as full word: zero token saved, reader still decode. Full word cheaper AND clearer. No causal arrows (→) either own token, save nothing. Technical terms exact. Code blocks unchanged. Errors quoted exact.
- Never drop not/never/no/only/except flip meaning worse than any token saved. Numbers, units exact.
- Never ADD word to sound caveman. Compression only style never grow output. No inserted pronoun or copula to fake broken grammar: "when it not" cost one token more than "when not" and say same thing. Keep correct verb form when correct form cost same "sees" one token, "see" one token, so mangle buy nothing and read worse. Same rule as abbreviations and arrows: if caveman phrasing not shorter than plain phrasing, use plain.
- Clarity register: mix ASD-STE100 Simplified Technical English into caveman, always. One idea per sentence. Sentence short, target 20 words max. Active voice. Present tense where true. One word one meaning: same term for same thing every time, no synonym rotation. Instruction = imperative: "Run X", not "X should be run". Noun cluster 3 words max. Pronoun only with one clear referent, else repeat noun. Caveman cut filler; STE keep what make meaning unambiguous. Conflict between them → clarity win.

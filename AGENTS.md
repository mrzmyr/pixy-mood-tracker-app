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
- **Minimal diff:** Use the fewest files that solve it. Keep existing signatures and reuse SDK props. Add no new abstractions unless asked. You are free to suggest them, but must find consensus with the user.

## Personas

- Ideas, concepts, prototypes, and UI changes: check every one from all 7 personas in [docs/personas.md](docs/personas.md). Show each persona, not only the full-data case
- Test data per persona: `persona-<name>` fixtures

## Feature Flags

- We use Posthog for feature flags
- User MUST agree to the privacy policy to be able to test features using feature flags
- Setup, consent gate, and dev overrides: [docs/development.md](docs/development.md#feature-flags)
- New key in `keys.ts`: create PostHog flag in same task, never ask. Never replace existing release conditions. Rules: [docs/development.md](docs/development.md#feature-flags)

## PRs

- When helpful to visualize a change, generate flow diagrams with [Pele](https://pele.run) ([API docs](https://pele.run/api.md)), export as PNG, and include in PR body. Keep generated files outside git.
- When multiple things have beend worked on in one go you want to create PR, suggest the user to create multiple PRs by topics for easier reviews; If you are sure, just go ahead and create multiple PRs even when the user said "create PR"
- Visual change: screenshot required, video too when motion
- Screenshots and videos: upload to PR body with [pr-proof skill](.agents/skills/pr-proof/SKILL.md). Proof files stay outside git
- Prefer small unstacked PRs. If you stack, point the child at `main` once the parent merges.

## Public repository security

- This project is public open source, so never include credentials or secret values in code, configuration, documentation, commits, pull requests, issues, comments, logs, or artifacts; reference secret names only and store values in approved secret managers.
- **Public text:** Describe privacy changes forward ("keep X on device"). Never say the app was non-compliant before.

## App facts

- [`docs/app-facts.json`](docs/app-facts.json) is the only place for app facts: name, ids, links, license, claims, feature list with status, store and source versions.
- Never create another facts file, feature list, or metadata table. README, store text, directory listings, and the website derive from this file.
- Positioning and messaging for store text, screenshots, website, and README: [vision.md](vision.md). Check public copy against its main message and messaging rules.
- Never edit [vision.md](vision.md). It is human-owned. Propose changes in chat or the PR description instead.
- Public copy may claim a feature only when its `status` is `available`. Check `claims` before stating free, no ads, no account, local storage.
- MUST update [`docs/app-facts.json`](docs/app-facts.json) whenever a feature or service changes. Verify against source and live stores first. Bump `verifiedOn`.
- Keep directory credentials and account recovery details outside this public repository.

## People semantics

- Person on an entry = user connected with them that day: met, called, texted, thought about. Not proof of time together.
- Connection can feel good, bad, or mixed. Never assume a person is positive.
- Day mood hints at a connection; it does not prove it. Prefer emotions on those days over mood averages.
- Copy says "connected" ("3 days connected"). Avoid "together", "spent time with".

## Tools

- Posthog for product analytics (MCP installed)
  - EU Cloud (`eu.posthog.com`). Project IDs: App Production `321829`, App Preview `321849`, App Development `321850`, Website `321851`
  - US Cloud projects `7630`, `14574`, `628970`, `12793` only receive data from app versions before the EU switch
  - MCP keeps the last active project, often not the one you need. Run `switch-project` first
- CodeRabbit for PR reviews (MCP installed)
- Sentry for error logging (MCP installed)
- FeatureOS User Feedback (MCP installed)

### Footguns

- Record mistakes in [MISTAKES.md](MISTAKES.md), missing capabilities in [DESIRES.md](DESIRES.md), and environment discoveries in [LEARNINGS.md](LEARNINGS.md)
- Public repo: entries contain no private names, internal context, or user data
- Never use Expo Device Hub (`bun hub`) as an agent. Humans: never press Shut down or Remove in it ([Device Hub](docs/development.md#device-hub)).
- **Disk:** Before a cold native build, run `bun builds list` and `df`. On a cache miss with less than 20 GiB free, stop and free space first.
- **Android:** Build cold with `ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a`. Four ABIs fill the disk.
- **RAM:** Run one heavy job at a time (native build, `tsc`, full jest, `bun install`). Never fan out subagents that run checks.
- Analytics events live in [`src/state/analytics/events.ts`](src/state/analytics/events.ts). Never send free text to PostHog: notes, tag names, people names, filter text, feedback messages. Not hashed, sampled, or truncated either. Send counts and lengths instead. Never send health values either: rating, emotion keys, sleep quality, Apple Health data, intervention cluster, feedback answer, mood-derived counts. Send `has_*` booleans and counts. A PostHog transformation also drops them server-side ([TELEMETRY.md](TELEMETRY.md#server-side-filter)). Record every event rename in [TELEMETRY.md](TELEMETRY.md#event-history).
- Call EAS Observe only through [`src/lib/observe.ts`](src/lib/observe.ts): `configureObserve` for config, `logObserveEvent` for events. Each `Observe.configure` call replaces the whole native config, so a call with one field resets the others. Same free-text ban as PostHog.
- Report caught errors only through `reportError` ([`src/lib/report-error.ts`](src/lib/report-error.ts)). It takes a `StructuredError`, sends it to Sentry, and sends Observe only `status` and `message`. `pixy-standards/no-direct-error-reporting` blocks direct SDK calls.

### Testing

- Never add tests that only check translated labels or copy strings are unique
- Never add tests that only assert static content matches expected values (translation keys, UI copy, enum labels)
- Type safety and translation tooling catch label collisions at build time
- Write tests for behavior, logic, and user-facing outcomes, not for checking static data structures
- Never add meaningless unit tests: no tests that only mirror the implementation (mock called with X), re-check a one-line effect, or cover trivial wiring. Add a test only when it can fail for a real regression

## Notifications

- Toasts: `showToast` from [`src/lib/toast.ts`](src/lib/toast.ts). Reference: [shadcn Sonner](https://ui.shadcn.com/docs/components/radix/sonner)
- Title states the consequence: "Feedback sent", "Entry deleted". Never "Thank you" or "Success"
- One line by default. Add a subtitle only when the user needs context: what happens next or what it means. Example: "Request sent" + "I’ll reply by email."
- Past tense, sentence case, no exclamation mark, no trailing period in the title

## Releases

- MUST run `app-store-review` skill before App Store release
- MUST pass `bun release smoke --platform=ios` before App Store release ([workflow](docs/store-release-workflow.md#release))

## References

- MUST read [CODING_STANDARDS.md](CODING_STANDARDS.md)
- MUST read [MISTAKES.md](MISTAKES.md) and [LEARNINGS.md](LEARNINGS.md) before code changes
- MUST read [docs/documentation.md](docs/documentation.md)
- MUST read [DESIGN.md](DESIGN.md) for UI, copy, layout, forms, interaction, and marketing asset guidelines
- Use domain terms from [GLOSSARY.md](GLOSSARY.md) in code, copy, and docs

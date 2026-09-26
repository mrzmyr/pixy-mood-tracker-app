# Repository conventions

- the project is called `pixy-mood-tracker`, use that slug always when creating folders, exeutables etc (not `pixy`, `pixy-app` etc)

## Metadata

- https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124
- https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker

## Public repository security

- This project is public open source, so never include credentials or secret values in code, configuration, documentation, commits, pull requests, issues, comments, logs, or artifacts; reference secret names only and store values in approved secret managers.

## Tools

- Posthog for product analytics (MCP installed)
  - Accessible projects: `Pixy App`, `Pixy Website`, and `Pixy App Test`.
- CodeRabbit for PR reviews (MCP installed)
- Sentry for error logging (MCP installed)
- FeatureOS User Feedback (MCP installed)

## Releases

- MUST run `app-store-review` skill before App Store release

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit.
- Format descriptions as `<type>[optional scope]: <description>`.
- Use `feat` for features and `fix` for bug fixes. Use `build`, `chore`, `ci`, `docs`, `refactor`, `style`, or `test` when they fit.
- Mark breaking changes with `!` before `:` or a `BREAKING CHANGE:` footer.

## Pull request proof

- Every agent-authored pull request must prove to the human reviewer that the change works before it is marked ready or merged.
- Attach screenshots or a video directly to the pull request body or a pull request comment. For non-visual changes, show the relevant observable behavior or test execution.
- Use [`attach-pr-asset`](.agents/skills/attach-pr-asset/SKILL.md) to upload screenshot or video proof without committing evidence files.
- Never commit proof-only screenshots, videos, or evidence files to the repository. Commit a visual file only when it is a product or documentation asset needed independently of the pull request.
- Show before and after evidence when behavior or UI is changed or removed.
- Present two or more screenshots in a two-column grid in the pull request body or comment so they remain reviewable at normal viewport sizes. Put before and after screenshots side by side.
- Document the environment and exact steps used to produce the evidence so the reviewer can reproduce it.
- Document the edge cases checked, including each expected result and actual result. Cover failure, empty, loading, boundary, and regression states when relevant.
- Never expose credentials, secrets, or personal data in evidence.
- If evidence cannot be produced, keep the pull request in draft, document the blocker, and get explicit human approval before merging.

## Devices and end-to-end tests

- Use [agent-device](https://github.com/callstack/agent-device) (`bunx agent-device`, `bun e2e run`) for devices, e2e runs, and live app checks, and `bun builds` for the build cache. Never use raw `simctl`, `emulator`, or `maestro`. See [e2e/README.md](e2e/README.md) and [build cache](docs/development.md#build-cache).
- Before picking a device, run `bunx agent-device device status` and `bun e2e list`, then choose one no other worktree owns.
- Always pass the device (`--udid` or `--serial`) so runs never land on another agent's device.
- For live checks and PR proof, open the app (`bunx agent-device open com.devmood.pixymoodtracker.preview --platform ios --udid <udid>`) and act on `snapshot -i` refs. `bunx agent-device help workflow` covers the rest.
- Test the preview app ([app variants](docs/development.md#app-variants)). Never run flows with `clearState` against the production app on a phone; it wipes real data.
- Shut down devices you booted and close your agent-device sessions before you finish.
- Keep device and signing-team identifiers local.
- Prefer physical devices, fallback to emulator

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
- Switch Superwall off: `EXPO_PUBLIC_SUPERWALL_ENABLED=false`
- E2E builds (`bun ios:e2e`, `bun android:e2e`) turn it off through [service mocks](e2e/README.md#service-mocks)
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
- **Webhooks and questions API** (feedback, statistics feedback, question answers, question list) get fake responses from [`src/lib/serviceFetch.ts`](src/lib/serviceFetch.ts). The question list is empty, so no question slide appears. Any other URL through `serviceFetch` fails with `service_mock_missing`.
- **Superwall** is never configured. Settings shows Support Pixy backed by the fake support client; `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE=failed` makes it fail.
```

**Use caveman language on docs**

Rules:
- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). No tool-call narration, no decorative tables/emoji, no dumping long raw error logs unless asked quote shortest decisive line. Standard well-known tech acronyms OK (DB/API/HTTP); never invent new abbreviations (cfg/impl/req/res/fn) tokenizer split them same as full word: zero token saved, reader still decode. Full word cheaper AND clearer. No causal arrows (→) either own token, save nothing. Technical terms exact. Code blocks unchanged. Errors quoted exact.
- Never drop not/never/no/only/except flip meaning worse than any token saved. Numbers, units exact.
- Never ADD word to sound caveman. Compression only style never grow output. No inserted pronoun or copula to fake broken grammar: "when it not" cost one token more than "when not" and say same thing. Keep correct verb form when correct form cost same "sees" one token, "see" one token, so mangle buy nothing and read worse. Same rule as abbreviations and arrows: if caveman phrasing not shorter than plain phrasing, use plain.
- Clarity register: mix ASD-STE100 Simplified Technical English into caveman, always. One idea per sentence. Sentence short, target 20 words max. Active voice. Present tense where true. One word one meaning: same term for same thing every time, no synonym rotation. Instruction = imperative: "Run X", not "X should be run". Noun cluster 3 words max. Pronoun only with one clear referent, else repeat noun. Caveman cut filler; STE keep what make meaning unambiguous. Conflict between them → clarity win.

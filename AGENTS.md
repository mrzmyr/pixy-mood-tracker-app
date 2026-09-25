# Repository conventions

- Project slug: use `pixy-mood-tracker` for folders, executables, and env vars (not `pixy` or `pixy-app`).
- Public repository: never put credentials or secret values in code, config, docs, commits, PRs, issues, logs, or artifacts. Reference secret names only.

## Docs

- [Development](docs/development.md): setup, checks, devices and build cache
- [Releasing](docs/releasing.md): build profiles, TestFlight, stores. Run the `app-store-review` skill before any App Store release.
- [E2E tests](e2e/README.md)
- [Features](docs/features.md), [i18n](docs/i18n.md)
- Store listings: [App Store](https://apps.apple.com/de/app/pixy-mood-tracker/id1605327124), [Google Play](https://play.google.com/store/apps/details?id=com.devmood.pixymoodtracker)

## Tools

- MCPs: PostHog (projects `Pixy App`, `Pixy Website`, `Pixy App Test`), Sentry, CodeRabbit, FeatureOS user feedback

## Rules

- Commits: [Conventional Commits](https://www.conventionalcommits.org/). Mark breaking changes with `!`.
- Errors: expose `status`, `message`, `why`, and `fix`. See the `coding-standards` skill.
- PR proof: agent-authored PRs must prove the change works before they are marked ready or merged. Use the `attach-pr-asset` skill. Without proof, keep the PR in draft and get explicit human approval.
- Devices and e2e: use `bun devices`, `bun sessions`, and `bun builds`, never raw `simctl`, `emulator`, or `maestro`. Shut down devices you create. Keep device and signing-team identifiers local.

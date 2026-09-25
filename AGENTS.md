# Repository conventions

- the project is called `pixy-mood-tracker`, use that slug always when creating folders, exeutables etc (not `pixy`, `pixy-app` etc)
- Folder layout: domain modules in `src/features/<name>/`, app-wide state (settings, analytics, persistence) in `src/state/<name>/`, generic hooks in `src/hooks/`. Keep a module's context, storage, and `__tests__/` together; UI used by one feature goes in its `components/`, its hooks in `hooks/`. Shared UI stays in `src/components/`.

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
- For live checks and PR proof, open the app (`bunx agent-device open com.devmood.pixymoodtracker --platform ios --udid <udid>`) and act on `snapshot -i` refs. `bunx agent-device help workflow` covers the rest.
- Never run flows with `clearState` on a physical phone; it wipes tester data.
- Shut down devices you booted and close your agent-device sessions before you finish.
- Keep device and signing-team identifiers local.

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

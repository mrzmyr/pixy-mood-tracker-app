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

## Code

- Run `bun run check` and `bun run test:ci` before pushing. CI (`.github/workflows/ci.yml`) runs the same scripts, and a pre-commit hook runs `oxlint --fix` and `oxfmt` on staged files.
- React Compiler is enabled (`app.json` `experiments.reactCompiler`). Do not add `useMemo`, `useCallback`, or `React.memo` unless a non-React API needs a stable reference or the value is an effect dependency.
- Put screen-only components in `src/screens/<Screen>/`, shared UI in `src/components/`, and generic hooks in `src/hooks/`. Check `src/components/` before creating a new component.
- TypeScript runs in `strict` mode except `noImplicitAny`. Type new code fully.

### Footguns

- Never write storage after a failed read. A read error must keep the stored data, not replace it with defaults (commits 1a1ddd8, f165aad).
- Hermes lacks some modern array methods. `pixy-standards/no-hermes-missing-array-methods` enforces the safe forms.
- Keep all `@react-navigation/*` packages on the same major version. Mixing v6 and v7 breaks native navigation.
- React Compiler plus `freezeOnBlur` tabs can leave FlashList headers or footers stale after the tab unfreezes. `src/screens/Calendar/index.tsx` opts out with `"use no memo"`. Run the e2e suite after enabling the compiler for more code.
- Initialize Sentry once, at module load in `src/navigation/index.tsx`, before the first render.

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

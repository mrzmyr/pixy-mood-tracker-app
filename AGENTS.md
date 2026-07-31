# Repository conventions

## Public repository security

- This project is public open source, so never include credentials or secret values in code, configuration, documentation, commits, pull requests, issues, comments, logs, or artifacts; reference secret names only and store values in approved secret managers.

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

## Physical iOS end-to-end tests

- Use [`maestro-runner`](https://github.com/devicelab-dev/maestro-runner) for physical iPhone end-to-end tests. Use direct XCUITest only when the runner cannot express the behavior.
- Test installed TestFlight builds with `--no-app-install`; never use `clearState` because it can remove tester data.
- Keep device and signing-team identifiers local. Attach generated artifacts to the pull request.

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

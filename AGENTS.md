# Repository conventions

## Public repository security

- This project is public open source. Treat every tracked file, commit, branch, pull request, issue, comment, workflow log, and artifact as public.
- Never include credentials or secret values in code, configuration, documentation, examples, commits, pull request titles or descriptions, issues, comments, logs, or artifacts.
- This includes passwords, API keys, access tokens, private keys, signing certificates, provisioning data, session values, cookies, two-factor codes, and personal data.
- Reference secret names only. Store values in an approved secret manager, GitHub Actions secrets, or EAS-managed credentials.
- Inspect staged changes and pull request text for accidental secret exposure before publishing.
- If exposure is suspected, stop publishing and rotate the credential. Removing it from a later commit is not sufficient.

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

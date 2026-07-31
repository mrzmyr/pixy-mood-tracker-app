# Repository conventions

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

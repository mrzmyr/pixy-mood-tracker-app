---
name: coding-standards
description: Use when writing, reviewing, or refactoring TypeScript
---

# Coding Standards

## Principles

- **No backward compatibility.** Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- **Simplest thing that fully works.** Choose the simplest implementation that meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- **Grow in layers.** Start with the smallest version that works end to end, and add each capability on top of something that already works. Never trade a working product for unfinished complexity.
- **Modular by default.** Keep components separate and concerns clearly divided.
- **Use existing dependencies first.** Reach for what the project already has before writing your own implementation or adding a package. Do not assume a library lacks a capability without checking its docs and types.
- **Prefer established libraries.** Use well-maintained libraries when they reduce complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- **Decide for the long term.** Do not accept a stopgap that only works for now and is meant to be replaced later.

## Function Calls

- Prefer named parameters over positional parameters.
- Use an object argument when a function takes multiple values, optional values, or values whose meaning is not obvious from type alone.

✅ Use

```ts
getUsers({ pageSize, pageIndex });

const tool = stripPrefix({
  value: ctx.toolName,
  prefix: prefix,
});
```

❌ Avoid

```ts
getUsers(pageSize, pageIndex);

stripPrefix(ctx.toolName, prefix);
```

## Branch Bodies

Never use shorthand if/else. Always use a block body. The same applies to ternaries that stand in for a branch.

✅ Use

```ts
if (audience === getScope(ctx)) {
  return "not-applicable";
}
```

❌ Avoid

```ts
if (audience === getScope(ctx)) return "not-applicable";

const tool = ctx.toolName.startsWith(prefix)
  ? ctx.toolName.slice(prefix.length)
  : ctx.toolName;
```

## Error Logging

Every real error path must use the project's structured error helper. This includes thrown errors, returned HTTP/OAuth/JSON errors, and error logs.

Structured errors must include:

- `status`
- `message`
- `why`
- `fix`

The fields must be specific enough for an operator or developer to understand what happened, why it happened, and what action resolves it.

✅ Use

```ts
throw createError({
  status: 502,
  message: "OAuth metadata request failed",
  why: `The provider returned status ${response.status} while loading OAuth metadata`,
  fix: "Verify the OAuth provider is reachable and the issuer configuration is correct",
});
```

❌ Avoid

```ts
throw new Error(`OAuth metadata request failed with ${response.status}`);
```

## Boolean Names

Boolean-returning functions must be prefixed with a boolean-style verb.

Use prefixes like:

- `is`
- `has`
- `can`
- `should`
- `was`
- `will`

✅ Use

```ts
function isAllowed({ userId }: { userId: string }): boolean {
  return userId.length > 0;
}
```

❌ Avoid ambiguous boolean names

```ts
function allowed(userId: string): boolean {
  return userId.length > 0;
}
```

## Function Names

Function names should be short and start with an action verb. Prefer `verb + subject`.

Use verbs like:

- `get`
- `set`
- `create`
- `update`
- `delete`
- `fetch`
- `load`
- `parse`
- `format`
- `increase`
- `decrease`

✅ Use

```ts
getAttrs();
increaseRetries();
formatName();
```

❌ Avoid noun-only or abbreviated names when the function performs an action

```ts
baseAttr();
retryCount();
displayName();
```

✅ Use one-word function names when the word is the complete, intentional API and reads clearly at the call site, especially for small DSL-style helpers or result builders

```ts
success();
error();
text();
```

## Local File Name Context

Use the file name as naming context. Do not repeat the domain already supplied by the file path or file name unless it removes ambiguity at the call site.

✅ Use

```ts
// data-analysis.ts
export function getSandbox() {
  // ...
}
```

❌ Avoid

```ts
// data-analysis.ts
export function getDataAnalysisSandbox() {
  // ...
}
```

- Prefer shorter local names when the module boundary already supplies the noun
- Use longer names only when exported APIs are commonly imported into contexts where the shorter name would be unclear

## Fallbacks

- Question your usage of fallbacks (e.g. environment variables overrides).

✅ Use

```ts
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw createError({
    status: 500,
    message: "DATABASE_URL is required",
    why: "DATABASE_URL was not set in the environment",
    fix: "Set DATABASE_URL before starting the service",
  });
}
```

❌ Avoid

```ts
const DATABASE_URL =
  process.env.DATABASE_URL ??
  process.env.LEGACY_DATABASE_URL ??
  "postgres://localhost:5432/app";
```

## Regex Pattern Matching

- Question your usage of pattern matching via regex.

✅ Use

```ts
async function readOnlyQuery({ db, query }) {
  const result = await db.explainQuery({ query });

  if (result.statementType !== "SELECT") {
    // throw structured error
  }

  return query;
}
```

❌ Avoid

```ts
function readOnlyQuery(query) {
  const sql = String(query).trim().replace(/;+\s*$/, "");
  if (!/^(select|with|explain)\b/i.test(sql)) throw new Error("read only only");
  if (/\b(insert|update|delete|drop|alter|create)\b/i.test(sql)) throw new Error("mutating sql");
  return sql;
}
```

## JSDoc Comments

- You must write a JSDoc comment for each exported symbol. You must write a JSDoc comment for each public method and each public property of an exported class.
- Write the JSDoc comment on the original declaration. Do not write a JSDoc comment for a re-export.
- Write a JSDoc comment for internal code only when the code is complex.
- Write the invariant, the limitation, or the constraint that the TypeScript types cannot show.
- Do not describe how the code operates. Do not write the TypeScript types again in the comment. Do not use `@inheritDoc` or `@inherit`.
- In the `@returns` tag, write the typed errors that the function can return. These errors include `Result` types and tagged errors.
- Use the `@throws` tag only if one of these is true:
  - The throw shows a defect that the program cannot correct.
  - The framework makes the throw necessary.
  - The path is a temporary `notYetImplemented` path.
- Write a JSDoc comment for each field of a complex object type that you export.

✅ Good

```ts
/**
 * Parse an email address from untrusted input.
 *
 * The input is trimmed and lower-cased before validation. Construct values
 * only through this function; the brand makes raw strings unusable where an
 * {@link EmailAddress} is required.
 *
 * @param input - The untrusted string to parse.
 * @returns A parsed {@link EmailAddress}, or {@link InvalidEmailAddress} when
 *   the input is invalid.
 */
export function parse(input: string): Result<EmailAddress, InvalidEmailAddress> {
  // ...
}

/** Input required to evaluate a boolean flag for a single user. */
export type BooleanFlagInput = {
  /** The feature flag key to evaluate. */
  readonly flagKey: string;
  /** The user's email, used as both context key and email attribute. */
  readonly userEmail: string;
  /** The value returned when the flag cannot be evaluated. */
  readonly defaultValue: boolean;
};
```

❌ Bad

```ts
/**
 * Parses input.
 *
 * @inheritDoc
 * @param input - string
 * @returns Result<EmailAddress, InvalidEmailAddress>
 */
export function parse(input: string): Result<EmailAddress, InvalidEmailAddress> {
  // ...
}

export type BooleanFlagInput = {
  readonly flagKey: string;
  readonly userEmail: string;
  readonly defaultValue: boolean;
};
```

## Comments on Edge Cases

- When fixing edge cases, add a comment explaining and add links to the relevant documentation.

✅ Good

```ts
/**
 * Context window of {@link MODEL_ID}. Declared here because this model is
 * unlisted in the gateway catalog, so the build cannot resolve compaction
 * metadata. Keep it in sync when the model changes.
 * See https://example.com/docs/agent-config
 */
export const MODEL_CONTEXT_WINDOW_TOKENS = 1_000_000;
```

❌ Bad

```ts
export const MODEL_CONTEXT_WINDOW_TOKENS = 1_000_000;
```

✅ Good

```ts
/**
 * Terminal assistant message held until the turn ends.
 *
 * `message.completed` fires inside the step that produced it, before that
 * step's `step.completed` reports usage. Posting there would render a footer
 * whose cost is always missing on a single-step turn, so delivery waits for
 * `turn.completed`. See https://example.com/docs/sessions
 */
const pendingChannelResponse = defineState<PendingChannelResponse | null>(
  "my-agent.pending-channel-response",
  () => null,
);
```

❌ Bad

```ts
const pendingChannelResponse = defineState<PendingChannelResponse | null>(
  "my-agent.pending-channel-response",
  () => null,
);
```

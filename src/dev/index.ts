import type * as Screens from "./screens";

/**
 * Developer tools (test data fixtures), present only in development and
 * preview builds.
 *
 * `EXPO_PUBLIC_APP_VARIANT` is inlined at bundle time, so in production
 * bundles the condition folds to `false` and Metro never includes
 * `./screens` or the fixtures. Keep the check inline at the `require`.
 */
export const DEV_TOOLS: typeof Screens | null =
  process.env.EXPO_PUBLIC_APP_VARIANT === "development" ||
  process.env.EXPO_PUBLIC_APP_VARIANT === "preview"
    ? // oxlint-disable-next-line typescript/no-require-imports -- a static import would ship developer tools in production bundles.
      require("./screens")
    : null;

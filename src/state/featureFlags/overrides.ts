import type * as DevOverrides from "@/dev/featureFlagOverrides";

/**
 * Local feature flag overrides, present only in development and preview
 * builds. Production builds ignore overrides.
 *
 * `EXPO_PUBLIC_APP_VARIANT` is inlined at bundle time, so in production
 * bundles the condition folds to `false` and Metro never includes the
 * override store. Keep the check inline at the `require`, like `DEV_TOOLS`
 * in `src/dev/index.ts`. A separate file keeps `src/dev/screens` out of the
 * flag module's imports.
 */
export const DEV_OVERRIDES: typeof DevOverrides | null =
  process.env.EXPO_PUBLIC_APP_VARIANT === "development" ||
  process.env.EXPO_PUBLIC_APP_VARIANT === "preview"
    ? // oxlint-disable-next-line typescript/no-require-imports -- a static import would ship flag overrides in production bundles.
      require("@/dev/featureFlagOverrides")
    : null;

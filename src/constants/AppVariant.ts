/** App variants defined in `app.config.ts`. */
export type AppVariant = "development" | "preview" | "production";

const value = process.env.EXPO_PUBLIC_APP_VARIANT;

/**
 * Build variant, inlined at bundle time from `EXPO_PUBLIC_APP_VARIANT`.
 * Falls back to `production`, which hides every developer tool.
 */
export const APP_VARIANT: AppVariant =
  value === "development" || value === "preview" ? value : "production";

/** True in TestFlight, App Store, and Google Play builds. */
export const IS_PRODUCTION = APP_VARIANT === "production";

/** App variants defined in `app.config.ts`. */
export type AppVariant = "development" | "preview" | "production";

const value = process.env.EXPO_PUBLIC_APP_VARIANT;

const isAppVariant = (candidate: string | undefined): candidate is AppVariant =>
  candidate === "development" ||
  candidate === "preview" ||
  candidate === "production";

/**
 * False where the bundle has no known variant: Jest, or a missing or
 * misspelled `EXPO_PUBLIC_APP_VARIANT`. Telemetry stays off there.
 */
export const HAS_APP_VARIANT = isAppVariant(value);

/**
 * Build variant, inlined at bundle time from `EXPO_PUBLIC_APP_VARIANT`.
 * Falls back to `production`, which hides every developer tool.
 */
export const APP_VARIANT: AppVariant = isAppVariant(value)
  ? value
  : "production";

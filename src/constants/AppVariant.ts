/** App variants defined in `app.config.ts`. */
export type AppVariant = "development" | "preview" | "production";

const value = process.env.EXPO_PUBLIC_APP_VARIANT;

/**
 * Build variant, inlined at bundle time from `EXPO_PUBLIC_APP_VARIANT`.
 * Falls back to `production`, which hides every developer tool.
 */
export const APP_VARIANT: AppVariant =
  value === "development" || value === "preview" ? value : "production";

/**
 * False only where no build sets the variant, such as Jest. Telemetry stays
 * off there.
 */
export const HAS_APP_VARIANT = value !== undefined;

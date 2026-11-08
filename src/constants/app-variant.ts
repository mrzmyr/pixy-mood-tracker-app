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

/**
 * Sitemap capture bundle (`bun sitemap capture`): preview variant plus
 * `EXPO_PUBLIC_SITEMAP_CAPTURE=1`, both inlined at bundle time. Turns off
 * network, telemetry, keyboard, and motion so screenshots are reproducible
 * ([`src/shell/sitemap-capture.tsx`](../shell/sitemap-capture.tsx)). Always
 * false in production bundles.
 */
export const IS_SITEMAP_CAPTURE =
  value === "preview" && process.env.EXPO_PUBLIC_SITEMAP_CAPTURE === "1";

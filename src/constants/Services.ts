import type { AppVariant } from "./AppVariant";
import { APP_VARIANT } from "./AppVariant";

/**
 * True when `EXPO_PUBLIC_PIXY_SERVICE_MOCKS` is `"true"` outside the
 * production variant. Production bundles ignore it, so a stray value can
 * never cut a release build off its services.
 */
export const resolveServiceMocks = ({
  variant,
  value,
}: {
  variant: AppVariant;
  value?: string;
}) => variant !== "production" && value === "true";

/**
 * Superwall is on unless `EXPO_PUBLIC_SUPERWALL_ENABLED` is `"false"`, so
 * builds without the variable keep today's behavior. Service mocks always
 * turn it off.
 */
export const resolveSuperwallEnabled = ({
  isServiceMocks = false,
  value,
}: {
  isServiceMocks?: boolean;
  value?: string;
}) => !isServiceMocks && value !== "false";

/**
 * E2E and offline test builds: outside services (webhooks, questions API,
 * PostHog, Sentry, Superwall) are replaced with in-app fakes. Set at bundle
 * time by `bun ios:e2e` and `bun android:e2e`.
 */
export const SERVICE_MOCKS = resolveServiceMocks({
  value: process.env.EXPO_PUBLIC_PIXY_SERVICE_MOCKS,
  variant: APP_VARIANT,
});

/** Whether the app may configure and call Superwall (the support paywall). */
export const SUPERWALL_ENABLED = resolveSuperwallEnabled({
  isServiceMocks: SERVICE_MOCKS,
  value: process.env.EXPO_PUBLIC_SUPERWALL_ENABLED,
});

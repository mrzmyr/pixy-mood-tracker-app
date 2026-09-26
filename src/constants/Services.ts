/**
 * Superwall is on unless `EXPO_PUBLIC_SUPERWALL_ENABLED` is `"false"`, so
 * builds without the variable keep today's behavior.
 */
export const resolveSuperwallEnabled = ({ value }: { value?: string }) =>
  value !== "false";

/** Whether the app may configure and call Superwall (the support paywall). */
export const SUPERWALL_ENABLED = resolveSuperwallEnabled({
  value: process.env.EXPO_PUBLIC_SUPERWALL_ENABLED,
});

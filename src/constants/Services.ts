/**
 * Whether the app may configure and call Superwall (the support paywall).
 * On unless `EXPO_PUBLIC_SUPERWALL_ENABLED` is `"false"`.
 */
export const SUPERWALL_ENABLED =
  process.env.EXPO_PUBLIC_SUPERWALL_ENABLED !== "false";

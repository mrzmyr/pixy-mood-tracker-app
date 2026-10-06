import type { FeatureFlag } from "@/state/featureFlags/keys";

/**
 * Local override of one feature flag. `remote` removes the override, so the
 * flag follows PostHog again.
 */
export type FeatureFlagOverride = "on" | "off" | "remote";

type Overrides = Partial<Record<FeatureFlag, "on" | "off">>;

/**
 * Flag that lets production users override flags in Settings > Development >
 * Feature flags. It loads only with consent, so testers agreed to the privacy
 * policy. The flag itself is never overridable.
 */
export const OVERRIDE_ACCESS_FLAG =
  "feature-flag-overrides" satisfies FeatureFlag;

/**
 * Development and preview builds apply overrides without the access flag.
 * `EXPO_PUBLIC_APP_VARIANT` is inlined at bundle time.
 */
export const IS_OVERRIDE_BUILD =
  process.env.EXPO_PUBLIC_APP_VARIANT === "development" ||
  process.env.EXPO_PUBLIC_APP_VARIANT === "preview";

let overrides: Overrides = {};
const listeners = new Set<() => void>();

/**
 * Check a deep link or UI value before passing it to {@link setOverride}.
 */
export const isOverride = (value: unknown): value is FeatureFlagOverride =>
  value === "on" || value === "off" || value === "remote";

/**
 * Current overrides. The object changes identity on every change, so it
 * works as a `useSyncExternalStore` snapshot.
 */
export const getOverrides = (): Overrides => overrides;

/**
 * Set one override. Overrides live in memory and end when the app restarts,
 * so one e2e flow never leaks a flag into the next.
 */
export const setOverride = ({
  key,
  value,
}: {
  key: FeatureFlag;
  value: FeatureFlagOverride;
}) => {
  const { [key]: _removed, ...others } = overrides;
  overrides = value === "remote" ? others : { ...others, [key]: value };
  for (const listener of listeners) {
    listener();
  }
};

let highlight = false;

/**
 * Whether flagged UI shows its flag key in a dashed outline. Lives in memory
 * like overrides, so screenshots and e2e flows start without it.
 */
export const isHighlightOn = (): boolean => highlight;

/** Turn the flag highlight on or off until the app restarts. */
export const setHighlight = (value: boolean) => {
  highlight = value;
  for (const listener of listeners) {
    listener();
  }
};

/** Subscribe to override and highlight changes; returns the unsubscribe function. */
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

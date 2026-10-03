import type { FeatureFlag } from "@/state/featureFlags/keys";

/**
 * Local override of one feature flag. `remote` removes the override, so the
 * flag follows PostHog again.
 */
export type FeatureFlagOverride = "on" | "off" | "remote";

type Overrides = Partial<Record<FeatureFlag, "on" | "off">>;

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

/** Subscribe to override changes; returns the unsubscribe function. */
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

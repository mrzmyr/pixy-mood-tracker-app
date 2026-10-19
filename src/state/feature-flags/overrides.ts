import {
  asFeatureFlagVariant,
  FEATURE_FLAGS,
  isVariantFlag,
} from "@/state/feature-flags/keys";
import type {
  FeatureFlag,
  FeatureFlagVariant,
} from "@/state/feature-flags/keys";

/**
 * Local override of one feature flag. `remote` removes the override, so the
 * flag follows PostHog again. A multivariate flag takes `off` or one of its
 * variants; a boolean flag takes `on` or `off`.
 */
export type FeatureFlagOverride = "on" | "off" | "remote" | FeatureFlagVariant;

type AppliedOverride = Exclude<FeatureFlagOverride, "remote">;
type Overrides = Partial<Record<FeatureFlag, AppliedOverride>>;

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
 * Check a deep link or UI value for `key` before passing it to
 * {@link setOverride}.
 */
export const isOverride = (
  key: FeatureFlag,
  value: unknown
): value is FeatureFlagOverride => {
  if (value === "off" || value === "remote") {
    return true;
  }
  if (isVariantFlag(key)) {
    return (
      typeof value === "string" &&
      asFeatureFlagVariant(key, value) !== undefined
    );
  }
  return value === "on";
};

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

/**
 * Set the same override on many flags in one store update, so subscribers
 * render once. `remote` removes the override of every key. Every key must
 * accept `value`, see {@link isOverride}.
 */
export const setOverrides = ({
  keys,
  value,
}: {
  keys: readonly FeatureFlag[];
  value: FeatureFlagOverride;
}) => {
  const next: Overrides = {};
  for (const key of FEATURE_FLAGS) {
    const isChanged = keys.some((changed) => changed === key);
    const current = isChanged ? value : overrides[key];
    if (current !== undefined && current !== "remote") {
      next[key] = current;
    }
  }
  overrides = next;
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

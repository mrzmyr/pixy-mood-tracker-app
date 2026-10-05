import { createContext, useContext, useSyncExternalStore } from "react";
import type { FeatureFlag } from "@/state/featureFlags/keys";
import {
  getOverrides,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  subscribe,
} from "@/state/featureFlags/overrides";

// Flag context and override hooks live apart from `@/state/featureFlags`, so
// `FlagHighlight` keeps working in tests that mock that module.

/** PostHog flag values by key. */
export type RemoteFlags = Record<string, boolean | string>;

interface FeatureFlagsValue {
  /** Flags fetched after consent in this app session; `null` means none. */
  flags: RemoteFlags | null;
  /** Settings or the first flag request after consent are still pending. */
  isLoading: boolean;
}

/** Outside `FeatureFlagsProvider` every flag is off and nothing loads. */
export const FeatureFlagsContext = createContext<FeatureFlagsValue>({
  flags: null,
  isLoading: false,
});

/**
 * Whether this device may override flags: always in development and preview
 * builds, in production only while the PostHog flag
 * `feature-flag-overrides` is on. That flag needs consent.
 */
// oxlint-disable-next-line pixy-standards/boolean-function-prefix -- React hooks must start with `use`.
export const useCanOverrideFeatureFlags = (): boolean => {
  const { flags: remoteFlags } = useContext(FeatureFlagsContext);
  return IS_OVERRIDE_BUILD || remoteFlags?.[OVERRIDE_ACCESS_FLAG] === true;
};

/** The local override this device applies to `key`, if any. */
export const useAppliedOverride = (key: FeatureFlag) => {
  const overrides = useSyncExternalStore(subscribe, getOverrides);
  const canOverride = useCanOverrideFeatureFlags();
  return canOverride && key !== OVERRIDE_ACCESS_FLAG
    ? overrides[key]
    : undefined;
};

/**
 * Who decides `key` now: a local override from Settings > Development >
 * Feature flags, or PostHog.
 */
export const useFeatureFlagSource = (
  key: FeatureFlag
): "override" | "remote" =>
  useAppliedOverride(key) === undefined ? "remote" : "override";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { FeatureFlag } from "@/state/feature-flags/keys";
import {
  getOverrides,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  subscribe,
} from "@/state/feature-flags/overrides";

// Flag context and override hooks live apart from `@/state/feature-flags`, so
// `FlagHighlight` keeps working in tests that mock that module.

/** Feature state: `loading` while settings or the first flag request after consent are pending. */
export type FeatureFlagState = "on" | "off" | "loading";

/**
 * State of one flag: an override wins, then `loading` while flags load,
 * then the remote value.
 */
export const getFeatureFlagState = ({
  override,
  isLoading,
  isRemoteOn,
}: {
  override: "on" | "off" | undefined;
  isLoading: boolean;
  isRemoteOn: boolean;
}): FeatureFlagState => {
  if (override) {
    return override;
  }
  if (isLoading) {
    return "loading";
  }
  return isRemoteOn ? "on" : "off";
};

/** PostHog flag values by key. */
export type RemoteFlags = Record<string, boolean | string>;

interface FeatureFlagsValue {
  /** Flags fetched after consent in this app session; `null` means none. */
  flags: RemoteFlags | null;
  /** Settings or the first flag request after consent are still pending. */
  isLoading: boolean;
  /**
   * The last flag request failed, so every remote flag reads off without
   * PostHog saying so. Missing means `false`.
   */
  hasLoadFailed?: boolean;
}

/** Outside `FeatureFlagsProvider` every flag is off and nothing loads. */
export const FeatureFlagsContext = createContext<FeatureFlagsValue>({
  flags: null,
  isLoading: false,
  hasLoadFailed: false,
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

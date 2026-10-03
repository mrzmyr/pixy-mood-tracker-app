import { useFeatureFlag } from "posthog-react-native";
import { useSettings } from "@/state/settings";

/**
 * PostHog feature flag keys. Create each flag in the PostHog project of every
 * app variant (development, preview, production report to separate projects).
 */
export const FEATURE_FLAGS = {
  /** Settings entry and guide for the iOS Home Screen widgets. */
  homeScreenWidget: "home-screen-widget",
} as const;

/** Key of a flag in {@link FEATURE_FLAGS}. */
export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * A flag counts as on only when the user allowed analytics and PostHog
 * serves `true`. Without consent PostHog sends nothing, so flagged features
 * stay off: users must agree to the privacy policy to test them.
 */
export const isFeatureFlagOn = ({
  analyticsEnabled,
  value,
}: {
  analyticsEnabled: boolean;
  /** Value from PostHog; `undefined` until flags load. */
  value: unknown;
}): boolean => analyticsEnabled && value === true;

/** Flag state: `loading` until PostHog serves a value for a consenting user. */
export type FeatureFlagState = "on" | "off" | "loading";

/**
 * State of a flag. Without analytics consent PostHog never serves flags, so
 * the state is `off` right away, not `loading`.
 */
export const getFeatureFlagState = ({
  settingsLoaded,
  analyticsEnabled,
  value,
}: {
  settingsLoaded: boolean;
  analyticsEnabled: boolean;
  value: unknown;
}): FeatureFlagState => {
  if (!settingsLoaded) {
    return "loading";
  }
  if (!analyticsEnabled) {
    return "off";
  }
  if (value === undefined) {
    return "loading";
  }
  return value === true ? "on" : "off";
};

/** State of `flag` for this install. Re-renders when flags load. */
export const useFeatureFlagState = (flag: FeatureFlag): FeatureFlagState => {
  const { settings } = useSettings();
  const value = useFeatureFlag(flag);
  return getFeatureFlagState({
    settingsLoaded: settings.loaded,
    analyticsEnabled: settings.analyticsEnabled,
    value,
  });
};

/** Whether `flag` is on for this install. Re-renders when flags load. */
export const useIsFeatureFlagOn = (flag: FeatureFlag) =>
  useFeatureFlagState(flag) === "on";

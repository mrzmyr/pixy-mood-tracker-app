import type { PostHogOptions } from "posthog-react-native";
import { TRACKING_ENABLED } from "@/constants/Config";

/**
 * PostHog client options. The client starts opted out; `AnalyticsProvider`
 * opts in once stored settings confirm consent. `preloadFeatureFlags: false`
 * stops the flag request at startup, which the SDK otherwise sends for
 * opted-out installs too: opt-out blocks events, not flag requests.
 * `FeatureFlagsProvider` loads flags after consent.
 * See https://posthog.com/docs/libraries/react-native#configuration-options
 */
export const POSTHOG_OPTIONS: PostHogOptions = {
  host: "https://app.posthog.com",
  disabled: !TRACKING_ENABLED,
  defaultOptIn: false,
  captureAppLifecycleEvents: true,
  preloadFeatureFlags: false,
};

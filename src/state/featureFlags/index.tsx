import { usePostHog } from "posthog-react-native";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createStructuredError } from "@/lib/errors";
import { useSettings, useSettingsLoad } from "@/state/settings";
import type { FeatureFlag } from "@/state/featureFlags/keys";
import {
  getOverrides,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  subscribe,
} from "@/state/featureFlags/overrides";

type RemoteFlags = Record<string, boolean | string>;

interface FeatureFlagsValue {
  /** Flags fetched after consent in this app session; `null` means none. */
  flags: RemoteFlags | null;
  /** Settings or the first flag request after consent are still pending. */
  isLoading: boolean;
}

/** Outside {@link FeatureFlagsProvider} every flag is off and nothing loads. */
const FeatureFlagsContext = createContext<FeatureFlagsValue>({
  flags: null,
  isLoading: false,
});

/**
 * Loads PostHog feature flags only after the user agreed to share data:
 * settings loaded, onboarding done, and analytics on in Settings > Privacy.
 *
 * The PostHog client must use `preloadFeatureFlags: false`, so no flag request
 * goes out at startup. Each change from no consent to consent reloads flags
 * once. Without consent, flags are off and no reload runs. Flags cached by
 * the SDK in an earlier session are never read: a cached value can come from
 * a period before consent was withdrawn.
 * See https://posthog.com/docs/libraries/react-native#feature-flags
 */
export const FeatureFlagsProvider = ({
  children,
  options,
}: {
  children: React.ReactNode;
  /** Off where the variant has no PostHog project, for example Jest. */
  options: { enabled: boolean };
}) => {
  const posthog = usePostHog();
  const { settings, hasActionDone } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const [remoteFlags, setRemoteFlags] = useState<RemoteFlags | null>(null);

  const hasConsent =
    options.enabled &&
    isSettingsReady &&
    hasActionDone("onboarding") &&
    settings.analyticsEnabled;

  useEffect(() => {
    if (!hasConsent || !posthog) {
      return;
    }

    let isCurrent = true;
    const load = async () => {
      try {
        const flags = await posthog.reloadFeatureFlagsAsync();
        // A failed request resolves `undefined`; every flag stays off.
        if (isCurrent) {
          setRemoteFlags(flags ?? {});
        }
      } catch (error) {
        // Stop loading: every flag stays off.
        if (isCurrent) {
          setRemoteFlags({});
        }
        console.warn(
          createStructuredError({
            status: "feature_flags_load_failed",
            message: "Feature flags could not be loaded",
            why: error instanceof Error ? error.message : String(error),
            fix: "Check the network connection, then restart the app",
          })
        );
      }
    };
    void load();

    // Consent ended or the client changed: drop flags of this period.
    return () => {
      isCurrent = false;
      setRemoteFlags(null);
    };
  }, [hasConsent, posthog]);

  const isLoading =
    options.enabled &&
    (!isSettingsReady || (hasConsent && remoteFlags === null));
  const value = useMemo(
    () => ({ flags: remoteFlags, isLoading }),
    [remoteFlags, isLoading]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

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

/** Feature state: `loading` while settings or the first flag request after consent are pending. */
export type FeatureFlagState = "on" | "off" | "loading";

/**
 * Like {@link useFeatureFlag}, but tells `loading` apart from `off`. Use it
 * when showing "off" too early would flash, for example widget content.
 */
export const useFeatureFlagState = (key: FeatureFlag): FeatureFlagState => {
  const { flags: remoteFlags, isLoading } = useContext(FeatureFlagsContext);
  const overrides = useSyncExternalStore(subscribe, getOverrides);
  const canOverride = useCanOverrideFeatureFlags();
  const override =
    canOverride && key !== OVERRIDE_ACCESS_FLAG ? overrides[key] : undefined;

  if (override === "on") {
    return "on";
  }
  if (override === "off") {
    return "off";
  }
  if (isLoading) {
    return "loading";
  }
  return remoteFlags?.[key] === true ? "on" : "off";
};

/**
 * Whether a feature is on. A local override from Settings > Development >
 * Feature flags wins in development and preview builds, also without
 * consent. Production builds apply it only while
 * {@link useCanOverrideFeatureFlags} is true. Otherwise the PostHog flag decides once it loaded after consent.
 * Until then, and without consent, the feature is off.
 */
// oxlint-disable-next-line pixy-standards/boolean-function-prefix -- React hooks must start with `use`.
export const useFeatureFlag = (key: FeatureFlag): boolean =>
  useFeatureFlagState(key) === "on";

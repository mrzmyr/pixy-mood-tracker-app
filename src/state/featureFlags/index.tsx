import noop from "lodash/noop";
import { usePostHog } from "posthog-react-native";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createStructuredError } from "@/lib/errors";
import { useSettings } from "@/state/settings";
import type { FeatureFlag } from "@/state/featureFlags/keys";
import { DEV_OVERRIDES } from "@/state/featureFlags/overrides";

type RemoteFlags = Record<string, boolean | string>;

/**
 * Flags fetched after consent in this app session; `null` means none. Outside
 * {@link FeatureFlagsProvider} every flag is off.
 */
const FeatureFlagsContext = createContext<RemoteFlags | null>(null);

const EMPTY_OVERRIDES = {};
const subscribeNothing = () => noop;
const getEmptyOverrides = () => EMPTY_OVERRIDES;

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
  const [remoteFlags, setRemoteFlags] = useState<RemoteFlags | null>(null);

  const hasConsent =
    options.enabled &&
    settings.loaded &&
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
        if (isCurrent && flags) {
          setRemoteFlags(flags);
        }
      } catch (error) {
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

  return (
    <FeatureFlagsContext.Provider value={remoteFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Whether a feature is on. A local override from Settings > Development >
 * Feature flags wins in development and preview builds, also without
 * consent. Otherwise the PostHog flag decides once it loaded after consent.
 * Until then, and without consent, the feature is off.
 */
// oxlint-disable-next-line pixy-standards/boolean-function-prefix -- React hooks must start with `use`.
export const useFeatureFlag = (key: FeatureFlag): boolean => {
  const remoteFlags = useContext(FeatureFlagsContext);
  const overrides = useSyncExternalStore(
    DEV_OVERRIDES?.subscribe ?? subscribeNothing,
    DEV_OVERRIDES?.getOverrides ?? getEmptyOverrides
  );
  const override = overrides[key];

  if (override === "on") {
    return true;
  }
  if (override === "off") {
    return false;
  }
  return remoteFlags?.[key] === true;
};

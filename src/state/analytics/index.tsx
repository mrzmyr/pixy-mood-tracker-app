import { usePostHog } from "posthog-react-native";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { createMissingProviderError } from "@/lib/errors";
import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";
import type {
  AnalyticsEvent,
  UsageSummary,
  UsageSummaryOnce,
  TrackArgs,
} from "@/state/analytics/events";
import { Observe } from "expo-observe";

interface AnaylticsState {
  enable: () => void;
  disable: () => void;
  reset: () => void;
  track: <Event extends AnalyticsEvent>(...args: TrackArgs<Event>) => void;
  /** Send a `$screen` event for the route now in view. */
  screen: (name: string) => void;
  /** Send the usage summary of this install. */
  sendUsageSummary: (
    properties: UsageSummary,
    propertiesOnce: UsageSummaryOnce
  ) => void;
  isEnabled: boolean;
}

interface AnalyticsProviderProps {
  enabled: boolean;
}

// SAFETY: every consumer renders inside AnalyticsProvider, which supplies the full state.
const AnalyticsContext = createContext({} as AnaylticsState);

const DEBUG = false;

const DEFAULT_OPTIONS: AnalyticsProviderProps = {
  enabled: false,
};

const AnalyticsProvider = ({
  children,
  options = DEFAULT_OPTIONS,
}: {
  children: React.ReactNode;
  options?: AnalyticsProviderProps;
}) => {
  const { settings, setSettings } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const posthog = usePostHog();

  // Derived from settings; `enable`, `disable`, and `reset` update settings.
  // Stays off until stored settings load: the default can be on, but a
  // stored opt-out must win before the first event.
  const isEnabled = isSettingsReady && settings.analyticsEnabled;

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    if (settings.analyticsEnabled) {
      posthog?.optIn();
    } else {
      posthog?.optOut();
    }
    Observe.configure({ dispatchingEnabled: settings.analyticsEnabled });
  }, [isSettingsReady, settings.analyticsEnabled, posthog]);

  const settingsProperties = useMemo(
    () => ({
      scale_type: settings.scaleType,
      reminder_enabled: settings.reminderEnabled,
      steps: settings.steps,
    }),
    [settings.scaleType, settings.reminderEnabled, settings.steps]
  );

  // Super properties cover SDK lifecycle events. `track` and `screen` also
  // send them directly: child effects can capture before this effect runs.
  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    void posthog?.register(settingsProperties);
  }, [isSettingsReady, settingsProperties, posthog]);

  const value = useMemo<AnaylticsState>(
    () => ({
      enable: () => {
        posthog?.optIn();
        setSettings((currentSettings) => ({
          ...currentSettings,
          analyticsEnabled: true,
        }));
      },
      disable: () => {
        posthog?.optOut();
        setSettings((currentSettings) => ({
          ...currentSettings,
          analyticsEnabled: false,
        }));
      },
      // New anonymous id, then the regional default, like a fresh install.
      reset: () => {
        posthog?.reset();
        if (DEFAULT_ANALYTICS_ENABLED) {
          posthog?.optIn();
        } else {
          posthog?.optOut();
        }
        setSettings((currentSettings) => ({
          ...currentSettings,
          analyticsEnabled: DEFAULT_ANALYTICS_ENABLED,
        }));
      },
      track: (...[eventName, properties]) => {
        if (!isEnabled) {
          return;
        }

        if (DEBUG) {
          console.log("useAnalytics: track", eventName, properties);
        }

        if (!options.enabled) {
          return;
        }

        posthog?.capture(eventName, { ...settingsProperties, ...properties });
      },
      screen: (name) => {
        if (!isEnabled || !options.enabled) {
          return;
        }

        void posthog?.screen(name, settingsProperties);
      },
      sendUsageSummary: (properties, propertiesOnce) => {
        if (!isEnabled || !options.enabled) {
          return;
        }

        if (DEBUG) {
          console.log(
            "useAnalytics: usage summary",
            properties,
            propertiesOnce
          );
        }

        // No feature flags in use: skip the flag reload.
        posthog?.setPersonProperties(properties, propertiesOnce, false);
      },
      isEnabled,
    }),
    [posthog, setSettings, isEnabled, options.enabled, settingsProperties]
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

const useAnalytics = (): AnaylticsState => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw createMissingProviderError("useAnalytics", "AnalyticsProvider");
  }
  return context;
};

export { AnalyticsProvider, useAnalytics };

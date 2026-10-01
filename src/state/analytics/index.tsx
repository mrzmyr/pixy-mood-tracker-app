import { usePostHog } from "posthog-react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSettings } from "@/state/settings";
import { createMissingProviderError } from "@/lib/errors";
import type { AnalyticsEvent, TrackArgs } from "@/state/analytics/events";
import { Observe } from "expo-observe";
import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";

interface AnaylticsState {
  enable: () => void;
  disable: () => void;
  reset: () => void;
  track: <Event extends AnalyticsEvent>(...args: TrackArgs<Event>) => void;
  /** Send a `$screen` event for the route now in view. */
  screen: (name: string) => void;
  identify: <Properties extends object>(properties?: Properties) => void;
  isIdentified: boolean;
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
  const posthog = usePostHog();

  const [identifyCalled, setIdentifyCalled] = useState(false);
  // A stored device id identifies the anonymous session.
  const isIdentified = identifyCalled || settings.deviceId !== null;
  // Derived from settings; `enable`, `disable`, and `reset` update settings.
  // Stays off until stored settings load: the default can be on, but a
  // stored opt-out must win before the first event.
  const isEnabled = settings.loaded && settings.analyticsEnabled;

  useEffect(() => {
    if (!settings.loaded) {
      return;
    }

    if (settings.analyticsEnabled) {
      posthog?.optIn();
    } else {
      posthog?.optOut();
    }
    Observe.configure({ dispatchingEnabled: settings.analyticsEnabled });
  }, [settings.loaded, settings.analyticsEnabled, posthog]);

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
    if (!settings.loaded) {
      return;
    }

    void posthog?.register(settingsProperties);
  }, [settings.loaded, settingsProperties, posthog]);

  const identify = useCallback<AnaylticsState["identify"]>((properties) => {
    if (DEBUG) {
      console.log("useAnalytics: anonymous session", properties);
    }
    setIdentifyCalled(true);
  }, []);

  const value = useMemo<AnaylticsState>(
    () => ({
      identify,
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
      isIdentified,
      isEnabled,
    }),
    [
      identify,
      posthog,
      setSettings,
      isEnabled,
      options.enabled,
      isIdentified,
      settingsProperties,
    ]
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

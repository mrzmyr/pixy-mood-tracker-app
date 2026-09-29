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
  const isEnabled = settings.analyticsEnabled;

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

  // Super properties: PostHog adds them to every later event.
  useEffect(() => {
    if (!settings.loaded) {
      return;
    }

    void posthog?.register({
      scale_type: settings.scaleType,
      reminder_enabled: settings.reminderEnabled,
      steps: settings.steps,
    });
  }, [
    settings.loaded,
    settings.scaleType,
    settings.reminderEnabled,
    settings.steps,
    posthog,
  ]);

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
      reset: () => {
        posthog?.reset();
        posthog?.optOut();
        setSettings((currentSettings) => ({
          ...currentSettings,
          analyticsEnabled: false,
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

        posthog?.capture(eventName, properties);
      },
      screen: (name) => {
        if (!isEnabled || !options.enabled) {
          return;
        }

        void posthog?.screen(name);
      },
      isIdentified,
      isEnabled,
    }),
    [identify, posthog, setSettings, isEnabled, options.enabled, isIdentified]
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

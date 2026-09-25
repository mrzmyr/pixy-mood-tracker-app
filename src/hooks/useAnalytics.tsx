import { usePostHog } from "posthog-react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSettings } from "./useSettings";
import { createMissingProviderError } from "@/lib/errors";
import { Observe } from "expo-observe";
import { logger } from "@/lib/logger";

interface AnaylticsState {
  enable: () => void;
  disable: () => void;
  reset: () => void;
  track: <Properties extends object>(
    event: string,
    properties?: Properties
  ) => void;
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

  const identify = useCallback<AnaylticsState["identify"]>((properties) => {
    if (DEBUG) {
      logger.debug("useAnalytics: anonymous session", properties);
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
      track: (eventName, properties) => {
        if (!isEnabled) {
          return;
        }

        if (DEBUG) {
          logger.debug("useAnalytics: track", eventName, properties);
        }

        if (!options.enabled) {
          return;
        }

        posthog?.capture(eventName);
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

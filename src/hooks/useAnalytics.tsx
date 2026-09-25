import { usePostHog } from "posthog-react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "./useSettings";
import { createMissingProviderError } from "@/lib/errors";

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

  const [isIdentified, setIsIdentified] = useState(false);
  const [isEnabled, setIsEnabled] = useState(settings.analyticsEnabled);

  useEffect(() => {
    setIsEnabled(settings.analyticsEnabled);
    if (!settings.loaded) {
      return;
    }

    if (settings.analyticsEnabled) {
      posthog?.optIn();
    } else {
      posthog?.optOut();
    }
  }, [settings.loaded, settings.analyticsEnabled, posthog]);

  const identify: AnaylticsState["identify"] = (properties) => {
    if (DEBUG) {
      console.log("useAnalytics: anonymous session", properties);
    }
    setIsIdentified(true);
  };

  const value: AnaylticsState = {
    identify,
    enable: () => {
      posthog?.optIn();
      setIsEnabled(true);
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: true,
      }));
    },
    disable: () => {
      posthog?.optOut();
      setIsEnabled(false);
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: false,
      }));
    },
    reset: () => {
      posthog?.reset();
      posthog?.optOut();
      setIsEnabled(false);
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: false,
      }));
    },
    track: (eventName, properties) => {
      if (!isEnabled) {
        return;
      }

      if (DEBUG) {
        console.log("useAnalytics: track", eventName, properties);
      }

      if (!options.enabled) {
        return;
      }

      posthog?.capture(eventName);
    },
    isIdentified,
    isEnabled,
  };

  useEffect(() => {
    if (!isIdentified && settings.deviceId !== null) {
      identify();
    }
  }, [settings.deviceId]);

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

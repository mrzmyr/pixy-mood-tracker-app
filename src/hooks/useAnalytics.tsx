import { usePostHog } from "posthog-react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "./useSettings";


interface AnaylticsState {
  enable: () => void;
  disable: () => void;
  reset: () => void;
  track: (event: string, properties?: any) => void;
  identify: (properties?: {}) => void;
  isIdentified: boolean;
  isEnabled: boolean;
}

interface AnalyticsProviderProps {
  enabled: boolean;
}

const AnalyticsContext = createContext({} as AnaylticsState);

const DEBUG = false;

function AnalyticsProvider({
  children,
  options = {
    enabled: false,
  },
}: {
  children: React.ReactNode;
  options?: AnalyticsProviderProps;
}) {
  const { settings, setSettings } = useSettings();
  const posthog = usePostHog();

  const [isIdentified, setIsIdentified] = useState(false);
  const [isEnabled, setIsEnabled] = useState(settings.analyticsEnabled);

  useEffect(() => {
    setIsEnabled(settings.analyticsEnabled);
    if (!settings.loaded) return;

    if (settings.analyticsEnabled) {
      posthog?.optIn();
    } else {
      posthog?.optOut();
    }
  }, [settings.loaded, settings.analyticsEnabled, posthog]);

  const identify = (properties?: any) => {
    if (DEBUG) console.log("useAnalytics: anonymous session", properties);
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
    track: (eventName: string, properties?: any) => {
      if (!isEnabled) return;

      if (DEBUG) console.log("useAnalytics: track", eventName, properties);

      if (!options.enabled) return;

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
}

function useAnalytics(): AnaylticsState {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within a AnalyticsProvider");
  }
  return context;
}

export { AnalyticsProvider, useAnalytics };

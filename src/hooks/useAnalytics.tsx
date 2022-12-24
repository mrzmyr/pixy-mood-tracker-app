import * as Device from "expo-device";
import * as Localization from "expo-localization";
import { usePostHog } from "posthog-react-native";
import { createContext, useContext, useEffect, useState } from "react";
import pkg from "../../package.json";
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

  useEffect(() => setIsEnabled(settings.analyticsEnabled), [settings.analyticsEnabled])

  const identify = (properties?: any) => {
    const traits = {
      userId: settings.deviceId,
      appVersion: pkg.version,
      deviceModel: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      locale: Localization.locale,

      settingsPasscodeEnabled: settings.passcodeEnabled,
      settingsReminderEnabled: settings.reminderEnabled,
      settingsReminderTime: settings.reminderTime,
      settingsScaleType: settings.scaleType,
      settingsActionsDone: settings.actionsDone,
      settingsSteps: settings.steps,

      ...properties,
    };

    if (!isEnabled) return;

    if (DEBUG) console.log("useAnalytics: identify", JSON.stringify(traits, null, 2));

    if (!options.enabled) return;

    if (settings.deviceId === null) {
      console.warn('useAnalytics: deviceId is null, cannot identify')
      return;
    }

    posthog!.identify(settings.deviceId, traits);
    setIsIdentified(true);
  };

  const value: AnaylticsState = {
    identify,
    enable: () => {
      posthog!.optIn();
      setIsEnabled(true);
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: true,
      }));
    },
    disable: () => {
      posthog!.optOut();
      setIsEnabled(false);
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: false,
      }));
    },
    reset: () => {
      posthog!.reset();
      setIsEnabled(true);
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: true,
      }));
    },
    track: (eventName: string, properties?: any) => {
      if (!isEnabled) return;

      if (DEBUG) console.log("useAnalytics: track", eventName, properties);

      if (!options.enabled) return;

      posthog!.capture(eventName, {
        ...properties,
        userId: settings.deviceId,
      });
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

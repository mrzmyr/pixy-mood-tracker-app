import { PostHogProvider } from "posthog-react-native";
import { useLayoutEffect, useRef } from "react";
import { POSTHOG_API_KEY } from "@/constants/API";
import { TRACKING_ENABLED } from "@/constants/Config";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { AnalyticsProvider } from "./index";

const SettingsAwarePostHogProvider = ({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) => {
  const { settings } = useSettings();
  const currentSettings = useRef(settings);

  // The SDK keeps its first options callback. Update its settings snapshot
  // before passive effects capture events after a settings change.
  useLayoutEffect(() => {
    currentSettings.current = settings;
  }, [settings]);

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: "https://app.posthog.com",
        disabled: !enabled || !settings.loaded,
        defaultOptIn: settings.analyticsEnabled,
        captureAppLifecycleEvents: true,
        before_send: (event) => {
          const snapshot = currentSettings.current;
          if (
            !event ||
            !enabled ||
            !snapshot.loaded ||
            !snapshot.analyticsEnabled
          ) {
            return null;
          }

          // Colors reports the chosen scale before settings commit.
          const scaleType =
            event.event === "settings:scale_changed"
              ? (event.properties?.scale_type ?? snapshot.scaleType)
              : snapshot.scaleType;

          return {
            ...event,
            properties: {
              ...event.properties,
              scale_type: scaleType,
              reminder_enabled: snapshot.reminderEnabled,
              steps: snapshot.steps,
            },
          };
        },
      }}
      autocapture={false}
    >
      <AnalyticsProvider options={{ enabled }}>{children}</AnalyticsProvider>
    </PostHogProvider>
  );
};

/**
 * Initialize analytics after settings load, so SDK lifecycle events and
 * child effects share consent and settings context from their first capture.
 * Failed reads still mount the app's storage recovery screen with SDK disabled.
 */
export const ConfiguredAnalyticsProvider = ({
  children,
  enabled = TRACKING_ENABLED,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) => {
  const settingsLoad = useSettingsLoad();
  if (settingsLoad.status === "loading") {
    return null;
  }

  return (
    <SettingsAwarePostHogProvider enabled={enabled}>
      {children}
    </SettingsAwarePostHogProvider>
  );
};

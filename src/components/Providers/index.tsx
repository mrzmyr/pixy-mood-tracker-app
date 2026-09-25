import { PostHogProvider } from "posthog-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { POSTHOG_API_KEY } from "@/constants/API";
import { TRACKING_ENABLED } from "@/constants/Config";
import { AnalyticsProvider } from "@/state/analytics";
import { CalendarFiltersProvider } from "@/features/calendar/filters";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import { StatisticsProvider } from "@/features/statistics";
import { TagsProvider } from "@/features/tags";
import { TemporaryLogProvider } from "@/features/logs/temporaryLog";
import type { SupportClient } from "@/support";
import { SupportProvider } from "@/support";
import { resolveDevelopmentSupportClient } from "@/support/clients";
import { ConfiguredSupportProvider } from "@/support/ConfiguredSupportProvider";

const Providers = ({
  children,
  supportClient,
}: {
  children: React.ReactNode;
  supportClient?: SupportClient;
}) => {
  const developmentSupportClient = resolveDevelopmentSupportClient({
    isDevelopment: __DEV__,
    mode: process.env.EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE,
  });
  const injectedSupportClient = supportClient ?? developmentSupportClient;
  const supportContent = injectedSupportClient ? (
    <SupportProvider client={injectedSupportClient}>
      <LogsProvider>
        <TagsProvider>
          <TemporaryLogProvider>
            <CalendarFiltersProvider>
              <StatisticsProvider>{children}</StatisticsProvider>
            </CalendarFiltersProvider>
          </TemporaryLogProvider>
        </TagsProvider>
      </LogsProvider>
    </SupportProvider>
  ) : (
    <ConfiguredSupportProvider>
      <LogsProvider>
        <TagsProvider>
          <TemporaryLogProvider>
            <CalendarFiltersProvider>
              <StatisticsProvider>{children}</StatisticsProvider>
            </CalendarFiltersProvider>
          </TemporaryLogProvider>
        </TagsProvider>
      </LogsProvider>
    </ConfiguredSupportProvider>
  );

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PostHogProvider
          apiKey={POSTHOG_API_KEY}
          options={{
            host: "https://app.posthog.com",
            disabled: !TRACKING_ENABLED,
            defaultOptIn: false,
            captureAppLifecycleEvents: false,
          }}
          autocapture={false}
        >
          <AnalyticsProvider options={{ enabled: TRACKING_ENABLED }}>
            {supportContent}
          </AnalyticsProvider>
        </PostHogProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
};

export default Providers;

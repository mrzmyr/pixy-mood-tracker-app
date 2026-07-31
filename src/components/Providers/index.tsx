import { PostHogProvider } from "posthog-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { POSTHOG_API_KEY } from "@/constants/API";
import { TRACKING_ENABLED } from "@/constants/Config";
import { AnalyticsProvider } from "@/hooks/useAnalytics";
import { CalendarFiltersProvider } from "@/hooks/useCalendarFilters";
import { LogsProvider } from "@/hooks/useLogs";
import { SettingsProvider } from "@/hooks/useSettings";
import { StatisticsProvider } from "@/hooks/useStatistics";
import { TagsProvider } from "@/hooks/useTags";
import { TemporaryLogProvider } from "@/hooks/useTemporaryLog";
import {
  SupportClient,
  SupportProvider,
  resolveDevelopmentSupportClient,
} from "@/support";
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
        {/* <PasscodeProvider> */}
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
        {/* </PasscodeProvider> */}
      </SettingsProvider>
    </SafeAreaProvider>
  );
};

export default Providers;

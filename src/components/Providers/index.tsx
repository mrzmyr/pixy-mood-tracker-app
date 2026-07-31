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
  defaultSupportClient,
} from "@/support";

const Providers = ({
  children,
  supportClient = defaultSupportClient,
}: {
  children: React.ReactNode;
  supportClient?: SupportClient;
}) => {
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
            <SupportProvider client={supportClient}>
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
          </AnalyticsProvider>
        </PostHogProvider>
        {/* </PasscodeProvider> */}
      </SettingsProvider>
    </SafeAreaProvider>
  );
};

export default Providers;

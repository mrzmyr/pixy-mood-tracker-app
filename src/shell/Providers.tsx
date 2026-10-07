import { PostHogProvider } from "posthog-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { POSTHOG_API_KEY } from "@/constants/API";
import { TRACKING_ENABLED } from "@/constants/Config";
import { POSTHOG_OPTIONS } from "@/shell/posthogOptions";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import { AppLockProvider } from "@/features/applock";
import { CalendarFiltersProvider } from "@/features/calendar";
import { InterventionHistoryProvider } from "@/features/interventions";
import { LogsProvider } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { SettingsProvider } from "@/state/settings";
import { StatisticsProvider } from "@/features/statistics";
import { TagsProvider } from "@/features/tags";
import { SupportProvider } from "@/support";
import type { SupportClient } from "@/support";

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
          <PeopleProvider>
            <InterventionHistoryProvider>
              <CalendarFiltersProvider>
                <StatisticsProvider>{children}</StatisticsProvider>
              </CalendarFiltersProvider>
            </InterventionHistoryProvider>
          </PeopleProvider>
        </TagsProvider>
      </LogsProvider>
    </SupportProvider>
  ) : (
    <ConfiguredSupportProvider>
      <LogsProvider>
        <TagsProvider>
          <PeopleProvider>
            <InterventionHistoryProvider>
              <CalendarFiltersProvider>
                <StatisticsProvider>{children}</StatisticsProvider>
              </CalendarFiltersProvider>
            </InterventionHistoryProvider>
          </PeopleProvider>
        </TagsProvider>
      </LogsProvider>
    </ConfiguredSupportProvider>
  );

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PostHogProvider
          apiKey={POSTHOG_API_KEY}
          options={POSTHOG_OPTIONS}
          autocapture={false}
        >
          <AnalyticsProvider options={{ enabled: TRACKING_ENABLED }}>
            <FeatureFlagsProvider options={{ enabled: TRACKING_ENABLED }}>
              <AppLockProvider>{supportContent}</AppLockProvider>
            </FeatureFlagsProvider>
          </AnalyticsProvider>
        </PostHogProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
};

export default Providers;

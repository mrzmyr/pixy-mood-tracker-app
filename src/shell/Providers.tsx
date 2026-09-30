import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConfiguredAnalyticsProvider } from "@/state/analytics/ConfiguredAnalyticsProvider";
import { CalendarFiltersProvider } from "@/features/calendar";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import { StatisticsProvider } from "@/features/statistics";
import { TagsProvider } from "@/features/tags";
import { TemporaryLogProvider } from "@/features/logger";
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
        <ConfiguredAnalyticsProvider>
          {supportContent}
        </ConfiguredAnalyticsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
};

export default Providers;

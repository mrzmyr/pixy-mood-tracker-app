import { SafeAreaProvider } from "react-native-safe-area-context";
import { TRACKING_ENABLED } from "@/constants/config";
import { ConsentPostHogProvider } from "@/shell/consent-posthog-provider";
import { AnalyticsProvider } from "@/state/analytics";
import { BackupProvider } from "@/features/backup";
import { FeatureFlagsProvider } from "@/state/feature-flags";
import { AppLockProvider } from "@/features/applock";
import { CalendarFiltersProvider } from "@/features/calendar";
import { LogsProvider } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { SettingsProvider } from "@/state/settings";
import { TagsProvider } from "@/features/tags";
import { SupportProvider } from "@/support";
import type { SupportClient } from "@/support";

import { resolveDevelopmentSupportClient } from "@/support/clients";
import { ConfiguredSupportProvider } from "@/support/configured-support-provider";

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
            <BackupProvider>
              <CalendarFiltersProvider>{children}</CalendarFiltersProvider>
            </BackupProvider>
          </PeopleProvider>
        </TagsProvider>
      </LogsProvider>
    </SupportProvider>
  ) : (
    <ConfiguredSupportProvider>
      <LogsProvider>
        <TagsProvider>
          <PeopleProvider>
            <BackupProvider>
              <CalendarFiltersProvider>{children}</CalendarFiltersProvider>
            </BackupProvider>
          </PeopleProvider>
        </TagsProvider>
      </LogsProvider>
    </ConfiguredSupportProvider>
  );

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ConsentPostHogProvider>
          <AnalyticsProvider options={{ enabled: TRACKING_ENABLED }}>
            <FeatureFlagsProvider options={{ enabled: TRACKING_ENABLED }}>
              <AppLockProvider>{supportContent}</AppLockProvider>
            </FeatureFlagsProvider>
          </AnalyticsProvider>
        </ConsentPostHogProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
};

export default Providers;

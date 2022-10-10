import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { POSTHOG_API_KEY } from '../constants/API';
import { AnalyticsProvider, TRACKING_ENABLED } from '../hooks/useAnalytics';
import { CalendarFiltersProvider } from '../hooks/useCalendarFilters';
import { LogsProvider } from '../hooks/useLogs';
import { SettingsProvider } from '../hooks/useSettings';
import { StatisticsProvider } from '../hooks/useStatistics';
import { TemporaryLogProvider } from '../hooks/useTemporaryLog';

const Providers = ({ 
  children
}: {
  children: React.ReactNode
}) => {  
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PostHogProvider 
          apiKey={POSTHOG_API_KEY} 
          options={{
            host: 'https://app.posthog.com',
            enable: TRACKING_ENABLED,
          }}
          autocapture={{
            captureTouches: false, 
            captureLifecycleEvents: TRACKING_ENABLED,
            captureScreens: TRACKING_ENABLED, 
          }}
        >
        {/* <PasscodeProvider> */}
          <LogsProvider>
            <AnalyticsProvider>
              <TemporaryLogProvider>
                <CalendarFiltersProvider>
                  <StatisticsProvider>
                    {children}
                  </StatisticsProvider>
                </CalendarFiltersProvider>
              </TemporaryLogProvider>
            </AnalyticsProvider>
          </LogsProvider>
        </PostHogProvider>
        {/* </PasscodeProvider> */}
      </SettingsProvider>
    </SafeAreaProvider>
  )
}

export default Providers;
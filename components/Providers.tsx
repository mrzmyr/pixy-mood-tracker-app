import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SegmentProvider } from '../hooks/useSegment';
import { LogsProvider } from '../hooks/useLogs';
import { SettingsProvider } from '../hooks/useSettings';
import { PasscodeProvider } from '../hooks/usePasscode';
import { TemporaryLogProvider } from '../hooks/useTemporaryLog';
import { CalendarFiltersProvider } from '../hooks/useCalendarFilters';

const Providers = ({ 
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PasscodeProvider>
          <SegmentProvider>
            <LogsProvider>
              <TemporaryLogProvider>
                <CalendarFiltersProvider>
                  {children}
                </CalendarFiltersProvider>
              </TemporaryLogProvider>
            </LogsProvider>
          </SegmentProvider>
        </PasscodeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  )
}

export default Providers;
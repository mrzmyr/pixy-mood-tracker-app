import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SegmentProvider } from '../hooks/useSegment';
import { LogsProvider } from '../hooks/useLogs';
import { SettingsProvider } from '../hooks/useSettings';
import { PasscodeProvider } from '../hooks/usePasscode';

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
              {children}
            </LogsProvider>
          </SegmentProvider>
        </PasscodeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  )
}

export default Providers;
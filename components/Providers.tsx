import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SegmentProvider } from '../hooks/useSegment';
import { LogsProvider } from '../hooks/useLogs';
import { SettingsProvider } from '../hooks/useSettings';

const Providers = ({ 
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SegmentProvider>
          <LogsProvider>
            {children}
          </LogsProvider>
        </SegmentProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  )
}

export default Providers;
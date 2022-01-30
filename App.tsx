import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from 'sentry-expo';
import useCachedResources from './hooks/useCachedResources';
import { LogsProvider } from './hooks/useLogs';
import { SettingsProvider } from './hooks/useSettings';
import Navigation from './navigation';

import Localization from './lib/Localization';

export default function App() {
  const isLoadingComplete = useCachedResources();

  Sentry.init({
    dsn: 'https://d98d0f519b324d9cb0c947b8f29cd0cf@o1112922.ingest.sentry.io/6142792',
    // enableInExpoDevelopment: true,
    debug: __DEV__,
  });

  Localization.init();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
        <SettingsProvider>
          <LogsProvider>
            <Navigation />
            <StatusBar />
          </LogsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    );
  }
}

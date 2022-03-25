import { StatusBar } from 'expo-status-bar';
import * as Sentry from 'sentry-expo';
import useCachedResources from './hooks/useCachedResources';
import Navigation from './navigation';

import Localization from './lib/Localization';
import Providers from './components/Providers';

export default function App() {
  const isLoadingComplete = useCachedResources();

  console.log('__DEV__', __DEV__)
  
  if(!__DEV__) {
    Sentry.init({
      dsn: 'https://d98d0f519b324d9cb0c947b8f29cd0cf@o1112922.ingest.sentry.io/6142792',
    });
  }

  Localization.init();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <Providers>
        <Navigation />
        <StatusBar />
      </Providers>
    );
  }
}

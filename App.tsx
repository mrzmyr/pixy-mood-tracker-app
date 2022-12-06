import { StatusBar } from 'expo-status-bar';
import useCachedResources from '@/hooks/useCachedResources';
import Navigation from '@/navigation';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const isLoadingComplete = useCachedResources();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Navigation />
        <StatusBar />
      </GestureHandlerRootView>
    );
  }
}

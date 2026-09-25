import { Observe, ObserveRoot } from "expo-observe";
import { StatusBar } from "expo-status-bar";
import useCachedResources from "@/hooks/useCachedResources";
import Navigation from "@/navigation";

import { GestureHandlerRootView } from "react-native-gesture-handler";

// Drop startup metrics until stored settings confirm analytics consent;
// AnalyticsProvider enables dispatching for opted-in users.
Observe.configure({ dispatchingEnabled: false });

const App = () => {
  const isLoadingComplete = useCachedResources();

  if (isLoadingComplete) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Navigation />
        <StatusBar />
      </GestureHandlerRootView>
    );
  }
  return null;
};

/**
 * Root component. `ObserveRoot` records time to first render for EAS
 * Observe; the calendar marks the app interactive once its data is shown.
 */
export default ObserveRoot.wrap(App);

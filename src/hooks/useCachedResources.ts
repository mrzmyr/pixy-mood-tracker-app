/* istanbul ignore file */

import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";

const loadResourcesAndDataAsync = (onComplete: () => void) => {
  try {
    // await Font.loadAsync({
    //   'sora-regular': require('../assets/fonts/Sora-Regular.ttf'),
    //   'sora-bold': require('../assets/fonts/Sora-Bold.ttf'),
    // });

    SplashScreen.preventAutoHideAsync();
  } catch (error) {
    // We might want to provide this error information to an error reporting service
    console.warn(error);
  } finally {
    onComplete();
    SplashScreen.hideAsync();
  }
};

export default function useCachedResources() {
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  // Load any resources or data that we need prior to rendering the app
  useEffect(() => {
    loadResourcesAndDataAsync(() => setIsLoadingComplete(true));
  }, []);

  return isLoadingComplete;
}

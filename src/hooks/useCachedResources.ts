/* istanbul ignore file */

import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { logger, toStructuredError } from "@/lib/logger";

const loadResourcesAndDataAsync = (onComplete: () => void) => {
  try {
    // await Font.loadAsync({
    //   'sora-regular': require('../assets/fonts/Sora-Regular.ttf'),
    //   'sora-bold': require('../assets/fonts/Sora-Bold.ttf'),
    // });

    SplashScreen.preventAutoHideAsync();
  } catch (error) {
    logger.warn(
      toStructuredError(error, {
        status: "splash_screen_failed",
        message: "Splash screen could not be kept visible",
        fix: "None needed; the app continues without the splash screen",
      })
    );
  } finally {
    onComplete();
    SplashScreen.hideAsync();
  }
};

/**
 * Report when startup resources are ready; the splash screen hides at the
 * same time. Nothing is preloaded yet, so it completes on the first effect.
 */
export default function useCachedResources() {
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  // Load any resources or data that we need prior to rendering the app
  useEffect(() => {
    loadResourcesAndDataAsync(() => setIsLoadingComplete(true));
  }, []);

  return isLoadingComplete;
}

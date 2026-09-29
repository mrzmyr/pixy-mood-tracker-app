import { createNavigationContainerRef } from "@react-navigation/native";
import { useEffect, useEffectEvent, useRef } from "react";
import { useAnalytics } from "@/state/analytics";
import type { RootStackParamList } from "../../types";

/** Ref for the app's `NavigationContainer`; screen tracking reads routes from it. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Sends a `$screen` event each time the focused route changes, including
 * nested tab routes. Route params are never sent.
 *
 * PostHog's screen autocapture does not support `@react-navigation/native`
 * v7, so screens are captured here from the container state.
 */
export const useScreenTracking = () => {
  const analytics = useAnalytics();
  const lastRouteName = useRef<string | null>(null);

  const trackCurrentRoute = useEffectEvent(() => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (!analytics.isEnabled || !name || name === lastRouteName.current) {
      return;
    }

    lastRouteName.current = name;
    analytics.screen(name);
  });

  // Settings load after the first render, and users can opt in later:
  // track the route in view once analytics turns on.
  useEffect(() => {
    if (analytics.isEnabled && navigationRef.isReady()) {
      trackCurrentRoute();
    }
  }, [analytics.isEnabled]);

  useEffect(() => {
    const onStateChange = () => {
      trackCurrentRoute();
    };
    navigationRef.addListener("state", onStateChange);

    return () => {
      navigationRef.removeListener("state", onStateChange);
    };
  }, []);
};

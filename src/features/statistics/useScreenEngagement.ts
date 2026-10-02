import { useNavigation } from "expo-router";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useAnalytics } from "@/state/analytics";
import type { StatisticsScreenName } from "@/state/analytics/events";

/** Share of the content seen at this scroll position, 0 to 100. */
export const getScrollDepthPct = ({
  contentOffset,
  contentSize,
  layoutMeasurement,
}: Pick<
  NativeScrollEvent,
  "contentOffset" | "contentSize" | "layoutMeasurement"
>) => {
  if (contentSize.height <= 0) {
    return 0;
  }
  const seen = contentOffset.y + layoutMeasurement.height;
  return Math.max(
    0,
    Math.min(100, Math.round((seen / contentSize.height) * 100))
  );
};

/**
 * Send `statistics:screen_left` with focus time and deepest scroll when the
 * screen loses focus. Pass the returned `onScroll` to the screen's ScrollView.
 *
 * `scroll_depth_pct` stays 0 when the user never scrolled.
 */
export const useScreenEngagement = (
  screen: StatisticsScreenName,
  isUnlocked: boolean
) => {
  const analytics = useAnalytics();
  const navigation = useNavigation();
  const focusedAt = useRef<number | null>(null);
  const scrollDepthMax = useRef(0);

  // Effect event: reports the latest unlock state and analytics client
  // without re-subscribing the focus listeners.
  const reportLeft = useEffectEvent((startedAt: number) => {
    analytics.track("statistics:screen_left", {
      screen,
      duration_ms: Date.now() - startedAt,
      scroll_depth_pct: scrollDepthMax.current,
      is_unlocked: isUnlocked,
    });
  });

  useEffect(() => {
    const start = () => {
      focusedAt.current = Date.now();
      scrollDepthMax.current = 0;
    };
    // Blur and unmount can both fire; report each focus period once.
    const stop = () => {
      if (focusedAt.current !== null) {
        reportLeft(focusedAt.current);
        focusedAt.current = null;
      }
    };

    if (navigation.isFocused()) {
      start();
    }
    const unsubscribeFocus = navigation.addListener("focus", start);
    const unsubscribeBlur = navigation.addListener("blur", stop);

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      stop();
    };
  }, [navigation]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const depth = getScrollDepthPct(event.nativeEvent);
      if (depth > scrollDepthMax.current) {
        scrollDepthMax.current = depth;
      }
    },
    []
  );

  return { onScroll };
};

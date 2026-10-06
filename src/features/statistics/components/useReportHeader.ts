import { useFocusEffect, useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback, useLayoutEffect, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useWindowDimensions } from "react-native";
import useColors from "@/hooks/useColors";

const BANNER_HEIGHT_RATIO = 0.25;
const BANNER_CONTENT_MIN = 96;

/** True once the banner has scrolled under the navigation header. */
export const isBannerCovered = (
  offsetY: number,
  bannerHeight: number,
  headerHeight: number
) => offsetY >= bannerHeight - headerHeight;

/**
 * Header options for a report screen. Transparent while the banner is
 * visible. Solid with the title once the banner is covered.
 */
export const getReportHeaderOptions = ({
  covered,
  title,
  headerColor,
  tintColor,
}: {
  covered: boolean;
  title: string;
  headerColor: string;
  tintColor: string;
}) => ({
  headerTransparent: !covered,
  headerTitle: covered ? title : "",
  headerTintColor: tintColor,
  headerTitleStyle: { color: tintColor },
  headerShadowVisible: false,
  headerStyle: { backgroundColor: covered ? headerColor : "transparent" },
});

/**
 * Native header over the report banner. The native back button (white via
 * `headerTintColor`) stays pinned while the content scrolls. Light status bar
 * icons while focused.
 */
export const useReportHeader = ({
  title,
  headerColor,
}: {
  title: string;
  headerColor: string;
}) => {
  const navigation = useNavigation();
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const [covered, setCovered] = useState(false);

  const bannerHeight = Math.max(
    windowHeight * BANNER_HEIGHT_RATIO,
    headerHeight + BANNER_CONTENT_MIN
  );

  const { white } = colors.palette;
  useLayoutEffect(() => {
    navigation.setOptions(
      getReportHeaderOptions({
        covered,
        title,
        headerColor,
        tintColor: white,
      })
    );
  }, [navigation, covered, title, headerColor, white]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("auto");
    }, [])
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = isBannerCovered(
        event.nativeEvent.contentOffset.y,
        bannerHeight,
        headerHeight
      );
      setCovered((prev) => (prev === next ? prev : next));
    },
    [bannerHeight, headerHeight]
  );

  return { bannerHeight, headerHeight, onScroll };
};

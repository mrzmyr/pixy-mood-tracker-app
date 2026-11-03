import { Image } from "expo-image";
import type { Ref } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { NightStars } from "@/components/night-stars";
import Colors from "@/constants/colors";

// Same cloud photo as the app sky (`Sky`).
const SKY = require(`../../../assets/images/onboarding/sky.webp`);
const SKY_ASPECT_RATIO = 2560 / 762;
/** Night: the clouds show only faintly, as in the app sky. */
const NIGHT_CLOUD_OPACITY = 0.07;

/**
 * Width in points of the captured sky: the large widget on the largest
 * iPhones. Smaller widgets crop the center.
 */
export const WIDGET_SKY_WIDTH = 364;
/** Height in points of the captured sky, see `WIDGET_SKY_WIDTH`. */
export const WIDGET_SKY_HEIGHT = 382;

/**
 * Still frame of the app sky for the widget background, captured as one
 * image per scheme. Day: cloud photo. Night: navy, faint clouds, stars.
 * Widgets cannot run the drifting `Sky`, so the frame never moves.
 *
 * Captured with react-native-view-shot, so it must stay mounted and
 * `collapsable={false}` until `onReady` fired and the capture finished.
 */
export const WidgetSkyCanvas = ({
  scheme,
  onReady,
  ref,
}: {
  scheme: "light" | "dark";
  /** The cloud photo loaded: the frame is ready to capture. */
  onReady: () => void;
  ref: Ref<View>;
}) => {
  const isNight = scheme === "dark";
  const still = useSharedValue(0);
  const photoWidth = Math.ceil(WIDGET_SKY_HEIGHT * SKY_ASPECT_RATIO);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: WIDGET_SKY_WIDTH,
        height: WIDGET_SKY_HEIGHT,
        overflow: "hidden",
        backgroundColor: Colors[scheme].onboardingSkyBackground,
      }}
    >
      <Image
        source={SKY}
        onLoad={onReady}
        style={{
          width: photoWidth,
          height: WIDGET_SKY_HEIGHT,
          opacity: isNight ? NIGHT_CLOUD_OPACITY : 1,
        }}
      />
      {isNight ? <NightStars clock={still} offset={still} /> : null}
    </View>
  );
};

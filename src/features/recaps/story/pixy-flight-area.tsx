import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SkyPixy } from "@/components/sky-pixy";
import type { FlightZone } from "@/components/sky-pixy";
import { usePixyIdle } from "@/features/logger";

/** Pixy waits for the slide to settle, then glides in this long. */
const ARRIVAL_DELAY_MS = 400;
const ARRIVAL_MS = 2400;

/**
 * Free sky where cloud Pixy flies its loop, sized by `style`. Pixy glides
 * in from beyond the right screen edge, then stays inside the area, so it
 * never crosses text next to it. Reduced motion: an empty area.
 */
export const PixyFlightArea = ({ style }: { style?: ViewStyle }) => {
  const isReducedMotion = useReducedMotion();
  const boost = useSharedValue(0);
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion });
  const [zone, setZone] = useState<FlightZone | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const arrival = useSharedValue(1);
  useEffect(() => {
    arrival.set(
      withDelay(
        ARRIVAL_DELAY_MS,
        withTiming(0, {
          duration: ARRIVAL_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  }, [arrival]);
  const arrivalStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrival.get() * screenWidth }],
  }));
  return (
    <View
      style={style}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setZone({ x: 0, y: 0, width, height });
      }}
    >
      {!isReducedMotion && (
        <Animated.View pointerEvents="box-none" style={arrivalStyle}>
          <SkyPixy boost={boost} zone={zone} isBlinking={idle.isBlinking} />
        </Animated.View>
      )}
    </View>
  );
};

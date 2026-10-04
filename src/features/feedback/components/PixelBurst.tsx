import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import useScale from "@/hooks/useScale";
import { useSetting } from "@/state/settings";

const COUNT = 18;
const DURATION_MS = 900;

/** Fixed spread so every burst looks the same and tests stay stable. */
const PIXELS = Array.from({ length: COUNT }, (_, index) => {
  const angle = (index / COUNT) * Math.PI * 2;
  const distance = 56 + (index % 3) * 22;
  return {
    id: index,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 10,
    rotate: (index % 4) * 45,
  };
});

const Pixel = ({
  x,
  y,
  rotate,
  color,
}: {
  x: number;
  y: number;
  rotate: number;
  color: string;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { rotate: `${rotate * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

/**
 * Pixels in the user's mood colors flying out once from the center of the
 * parent. Decorative only; callers skip it when reduce motion is on.
 */
export const PixelBurst = () => {
  const scale = useScale(useSetting("scaleType"));
  const palette = [
    scale.colors.extremely_good.background,
    scale.colors.very_good.background,
    scale.colors.good.background,
    scale.colors.bad.background,
    scale.colors.very_bad.background,
    scale.colors.extremely_bad.background,
  ];

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 0,
        height: 0,
      }}
    >
      {PIXELS.map((pixel) => (
        <Pixel
          key={pixel.id}
          x={pixel.x}
          y={pixel.y}
          rotate={pixel.rotate}
          color={palette[pixel.id % palette.length]}
        />
      ))}
    </View>
  );
};

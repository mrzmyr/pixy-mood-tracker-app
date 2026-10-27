import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/**
 * Soft color glow behind voice mode. Grows and brightens with the input level.
 * Reduced motion: static.
 */
export const VoiceBlob = ({
  level,
  color,
}: {
  level: SharedValue<number>;
  color: string;
}) => {
  const { width, height } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const size = Math.max(width, height) * 0.9;

  const style = useAnimatedStyle(() => {
    const value = isReducedMotion ? 0 : level.get();
    return {
      opacity: interpolate(value, [0, 1], [0.5, 1]),
      transform: [{ scale: interpolate(value, [0, 1], [1, 1.3]) }],
    };
  });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            left: (width - size) / 2 - width * 0.15,
            top: height * 0.45 - size / 2,
          },
          style,
        ]}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="voice-blob" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={0.45} />
              <Stop offset="0.55" stopColor={color} stopOpacity={0.16} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={size / 2}
            cy={size / 2}
            rx={size / 2}
            ry={size / 2}
            fill="url(#voice-blob)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

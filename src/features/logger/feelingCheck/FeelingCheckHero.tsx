import chroma from "chroma-js";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import useScale from "@/hooks/useScale";
import { useSettings } from "@/state/settings";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 132;
// Length of the check path below, in view box units.
const CHECK_LENGTH = 20;
const GLOW_LAYERS = [1, 0.74, 0.5];

/** Soft glow in the mood color with a check that draws itself. */
export const FeelingCheckHero = ({ rating }: { rating: LogItem["rating"] }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const mood = scale.colors[rating].background;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        350,
        withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })
      )
    );
  }, [progress]);

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - progress.get()),
  }));

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {GLOW_LAYERS.map((size, index) => (
        <Animated.View
          key={size}
          entering={FadeIn.delay(index * 120).duration(900)}
          style={{
            position: "absolute",
            width: SIZE * size,
            height: SIZE * size,
            borderRadius: (SIZE * size) / 2,
            backgroundColor: chroma(mood)
              .alpha(0.12 + index * 0.06)
              .css(),
          }}
        />
      ))}
      <Animated.View
        entering={ZoomIn.delay(200).springify().damping(14)}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.logCardBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <AnimatedPath
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke={colors.text}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

import chroma from "chroma-js";
import { Check } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import useScale from "@/hooks/useScale";
import { useSettings } from "@/state/settings";

const SIZE = 104;
const BREATH_MS = 3200;

/** Check in a soft circle that breathes slowly in the mood color. */
export const FeelingCheckHero = ({ rating }: { rating: LogItem["rating"] }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const breath = useSharedValue(1);

  useEffect(() => {
    breath.set(
      withRepeat(
        withTiming(1.14, {
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    );
  }, [breath]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.get() }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.duration(500)}
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: chroma(scale.colors[rating].background)
              .alpha(0.25)
              .css(),
          },
          glowStyle,
        ]}
      />
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.logCardBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check color={colors.text} size={26} strokeWidth={2} />
      </View>
    </Animated.View>
  );
};

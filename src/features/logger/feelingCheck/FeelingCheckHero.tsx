import { Heart } from "lucide-react-native";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import colors from "@/constants/Colors/TailwindColors";

const SIZE = 104;
const BEAT_PAUSE_MS = 1600;

/** Soft heart that beats twice, then rests, with a ring on each beat. */
export const FeelingCheckHero = (_props: { rating: LogItem["rating"] }) => {
  const isDark = useColorScheme() === "dark";
  const heart = isDark ? colors.rose[300] : colors.rose[400];
  const halo = isDark ? colors.rose[900] : colors.rose[100];
  const beat = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    const ease = { duration: 140, easing: Easing.out(Easing.quad) };
    beat.set(
      withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1.14, ease),
            withTiming(1, ease),
            withTiming(1.1, ease),
            withTiming(1, ease),
            withTiming(1, { duration: BEAT_PAUSE_MS })
          ),
          -1
        )
      )
    );
    ring.set(
      withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 0 }),
            withTiming(0, { duration: BEAT_PAUSE_MS - 340 })
          ),
          -1
        )
      )
    );
  }, [beat, ring]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: beat.get() }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - ring.get()),
    transform: [{ scale: 0.7 + ring.get() * 0.6 }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12)}
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
            borderWidth: 2,
            borderColor: heart,
          },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: halo,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={heartStyle}>
          <Heart color={heart} fill={heart} size={32} strokeWidth={1.5} />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

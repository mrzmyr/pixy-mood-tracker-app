import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const STAR_COUNT = 90;
const TWINKLE_GROUPS = [0, 1, 2];
const TWINKLE_MS = 2400;

interface Star {
  left: number;
  top: number;
  size: number;
  opacity: number;
  group: number;
}

/**
 * Fixed pseudo-random numbers from 0 to 1, so the stars sit in the same
 * place on every render.
 */
const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return state / 2_147_483_647;
  };
};

const createStars = () => {
  const next = seededRandom(7);
  return Array.from({ length: STAR_COUNT }, (_, index) => ({
    left: next() * 100,
    // More stars near the top, like a sky over a horizon.
    top: next() ** 1.4 * 100,
    size: next() < 0.85 ? 1.5 : 2.5,
    opacity: 0.35 + next() * 0.6,
    group: index % TWINKLE_GROUPS.length,
  }));
};

const STARS: Star[] = createStars();
const STAR_GROUPS = TWINKLE_GROUPS.map((group) =>
  STARS.filter((star) => star.group === group)
);

/** One third of the stars, dimming and brightening out of step with the rest. */
const StarGroup = ({ group, stars }: { group: number; stars: Star[] }) => {
  const isReducedMotion = useReducedMotion();
  const dim = useSharedValue(1);

  useEffect(() => {
    if (isReducedMotion) {
      dim.set(1);
      return;
    }
    dim.set(
      withDelay(
        (group * TWINKLE_MS) / TWINKLE_GROUPS.length,
        withRepeat(
          withTiming(0.45, {
            duration: TWINKLE_MS,
            easing: Easing.inOut(Easing.sin),
          }),
          -1,
          true
        )
      )
    );
  }, [dim, group, isReducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: dim.get() }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {stars.map((star) => (
        <View
          key={`${star.left}-${star.top}`}
          style={{
            position: "absolute",
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: "#fff",
            opacity: star.opacity,
          }}
        />
      ))}
    </Animated.View>
  );
};

/**
 * Full-screen night sky: deep blue with stars that twinkle slowly. Dark mode
 * counterpart of the cloud {@link Sky}. Reduced motion keeps the stars still.
 */
export const NightSky = () => (
  <View
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <LinearGradient
      colors={["#070b1a", "#111a36", "#1d2850"]}
      style={StyleSheet.absoluteFill}
    />
    {TWINKLE_GROUPS.map((group) => (
      <StarGroup key={group} group={group} stars={STAR_GROUPS[group]} />
    ))}
  </View>
);

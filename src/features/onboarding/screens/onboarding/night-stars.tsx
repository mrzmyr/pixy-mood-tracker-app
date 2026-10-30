import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

/** One star per this many square points. Keeps the sky sparse. */
const AREA_PER_STAR = 4000;
/** Seconds per twinkle. */
const TWINKLE_PERIOD = 5;

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

/** Same stars on every render and every launch. */
const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
};

const makeStars = (width: number, height: number, seed: number): Star[] => {
  const random = seededRandom(seed);
  const count = Math.round((width * height) / AREA_PER_STAR / 2);
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    r: 0.5 + random() ** 3 * 1,
    opacity: 0.25 + random() * 0.45,
  }));
};

const StarLayer = ({
  stars,
  clock,
  phase,
}: {
  stars: Star[];
  clock: SharedValue<number>;
  phase: number;
}) => {
  const { width, height } = useWindowDimensions();
  const twinkleStyle = useAnimatedStyle(() => ({
    opacity:
      0.75 +
      0.25 * Math.sin((clock.get() / TWINKLE_PERIOD) * 2 * Math.PI + phase),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, twinkleStyle]}>
      <Svg width={width} height={height}>
        {stars.map((star) => (
          <Circle
            key={`${star.x}-${star.y}`}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#fff"
            opacity={star.opacity}
          />
        ))}
      </Svg>
    </Animated.View>
  );
};

/**
 * Subtle stars for the night sky: small, sparse, dim. Two groups twinkle
 * slowly against each other. `clock` counts seconds; a still clock keeps
 * the stars still.
 */
export const NightStars = ({ clock }: { clock: SharedValue<number> }) => {
  const { width, height } = useWindowDimensions();

  return (
    <>
      <StarLayer stars={makeStars(width, height, 7)} clock={clock} phase={0} />
      <StarLayer
        stars={makeStars(width, height, 19)}
        clock={clock}
        phase={Math.PI}
      />
    </>
  );
};

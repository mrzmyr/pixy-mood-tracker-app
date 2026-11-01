import memoize from "lodash/memoize";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  createAnimatedComponent,
  useAnimatedProps,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

// Built on first render, never at module load: expo-router's Jest mock of
// reanimated is empty. Memoized, so every render gets the same component.
const getAnimatedCircle = memoize(() => createAnimatedComponent(Circle));
const getAnimatedLine = memoize(() => createAnimatedComponent(Line));

/**
 * Stars that blink now and then. `x` and `y` are shares of the card size.
 * Each has its own period, so they never blink together.
 */
const BLINKERS = [
  { x: 0.34, y: 0.22, r: 1.2, period: 5.3, at: 1.1 },
  { x: 0.52, y: 0.62, r: 1, period: 7.9, at: 4.2 },
  { x: 0.63, y: 0.14, r: 1.4, period: 6.7, at: 2.5 },
  { x: 0.46, y: 0.9, r: 0.9, period: 9.1, at: 6.8 },
  { x: 0.78, y: 0.48, r: 1.1, period: 8.3, at: 0.4 },
] as const;
/** Seconds a blink takes, up and down. */
const BLINK = 0.7;

/** A shooting star may cross once per this many seconds. */
const SHOOT_CYCLE = 14;
/** Seconds one shooting star takes to cross. */
const SHOOT_TIME = 0.9;
/** Its trail length in points. */
const TRAIL = 46;

/** Same pick for the same cycle: no state, survives remounts. */
const hash = (n: number) => {
  "worklet";
  const s = Math.sin(n * 127.1 + 311.7) * 43_758.5453;
  return s - Math.floor(s);
};

const Blinker = ({
  star,
  width,
  height,
  clock,
}: {
  star: (typeof BLINKERS)[number];
  width: number;
  height: number;
  clock: SharedValue<number>;
}) => {
  const animatedProps = useAnimatedProps(() => {
    const t = (clock.get() + star.at) % star.period;
    // Triangle bump around the blink moment, eased: dim most of the time.
    const bump = Math.max(0, 1 - Math.abs(t - BLINK) / BLINK);
    const eased = bump * bump * (3 - 2 * bump);
    return { opacity: 0.15 + 0.85 * eased, r: star.r * (1 + 0.6 * eased) };
  });
  const AnimatedCircle = getAnimatedCircle();
  return (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedCircle
      cx={star.x * width}
      cy={star.y * height}
      fill="#fff"
      animatedProps={animatedProps}
    />
  );
};

/**
 * Tail pieces share the head. Longer pieces are fainter, so the trail fades
 * out behind the star. One color per piece: a gradient stroke does not
 * follow a line that moves.
 */
const TRAIL_PIECES = [
  { share: 1, opacity: 0.2, width: 1.2 },
  { share: 0.6, opacity: 0.45, width: 1.4 },
  { share: 0.25, opacity: 1, width: 1.8 },
] as const;

const TrailPiece = ({
  piece,
  width,
  height,
  clock,
}: {
  piece: (typeof TRAIL_PIECES)[number];
  width: number;
  height: number;
  clock: SharedValue<number>;
}) => {
  const animatedProps = useAnimatedProps(() => {
    const cycle = Math.floor(clock.get() / SHOOT_CYCLE);
    const t = clock.get() - cycle * SHOOT_CYCLE;
    // About two cycles in three get a star: rare, not on a beat.
    if (hash(cycle) > 0.66 || t > SHOOT_TIME) {
      return { strokeOpacity: 0, x1: 0, y1: 0, x2: 0, y2: 0 };
    }
    const p = t / SHOOT_TIME;
    // Starts right of the label, so it never crosses text.
    const startX = width * (0.45 + 0.25 * hash(cycle + 1));
    const startY = height * (0.04 + 0.2 * hash(cycle + 2));
    // Down and to the right, about 30 degrees.
    const headX = startX + p * width * 0.3;
    const headY = startY + p * width * 0.3 * 0.55;
    const tail = TRAIL * piece.share * Math.min(1, p * 3);
    return {
      // Fades in fast, out slowly.
      strokeOpacity: piece.opacity * Math.min(1, p * 6) * (1 - p),
      x1: headX - tail,
      y1: headY - tail * 0.55,
      x2: headX,
      y2: headY,
    };
  });
  const AnimatedLine = getAnimatedLine();
  return (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedLine
      stroke="#fff"
      strokeWidth={piece.width}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
};

/**
 * Night extras for the recap card: a few stars blink now and then, and
 * now and then a shooting star crosses. Timing comes from the frame clock,
 * not from mount, and repeats the same way. Hidden under reduced motion.
 * Place it over the sky, under the text.
 */
export const NightSparkle = () => {
  const isReducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** Seconds on the frame clock. */
  const clock = useSharedValue(0);

  useFrameCallback(({ timestamp }) => {
    clock.set(timestamp / 1000);
  }, !isReducedMotion);

  if (isReducedMotion) {
    return null;
  }

  const { width, height } = size;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setSize({ width: w, height: h });
      }}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {BLINKERS.map((star) => (
            <Blinker
              key={`${star.x}-${star.y}`}
              star={star}
              width={width}
              height={height}
              clock={clock}
            />
          ))}
          {TRAIL_PIECES.map((piece) => (
            <TrailPiece
              key={piece.share}
              piece={piece}
              width={width}
              height={height}
              clock={clock}
            />
          ))}
        </Svg>
      )}
    </View>
  );
};

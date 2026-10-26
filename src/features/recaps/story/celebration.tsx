import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

/** CE1: pixels burst from a point. CE2: a pixel wave fills the screen. */
export type CelebrationKind = "burst" | "wave";

/** Where a celebration starts, in screen points. */
export interface CelebrationOrigin {
  x: number;
  y: number;
}

const BURST_PIXELS = 42;
const WAVE_CELL = 26;

/** Stable pseudo-random value 0 to 1 per particle, so renders match. */
const noise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
};

const BurstPixel = ({
  index,
  origin,
  color,
}: {
  index: number;
  origin: CelebrationOrigin;
  color: string;
}) => {
  const progress = useSharedValue(0);
  const angle = noise(index + 1) * Math.PI * 2;
  const distance = 70 + noise(index + 7) * 150;
  const size = 6 + noise(index + 13) * 8;
  const spin = noise(index + 19) * 540;
  const duration = 1100 + noise(index + 23) * 500;
  useEffect(() => {
    progress.set(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) })
    );
  }, [progress, duration]);
  const style = useAnimatedStyle(() => {
    const value = progress.get();
    // Out fast, then gravity pulls the pixel down while it fades.
    const fall = value > 0.55 ? (value - 0.55) * 300 : 0;
    return {
      opacity: value > 0.55 ? 1 - (value - 0.55) / 0.45 : 1,
      transform: [
        { translateX: Math.cos(angle) * distance * Math.min(1, value / 0.55) },
        {
          translateY:
            Math.sin(angle) * distance * Math.min(1, value / 0.55) -
            40 * Math.min(1, value / 0.55) +
            fall,
        },
        { rotate: `${spin * value}deg` },
        { scale: 0.4 + 0.6 * Math.min(1, value / 0.3) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: origin.x - size / 2,
          top: origin.y - size / 2,
          width: size,
          height: size,
          borderRadius: 3,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

const WavePixel = ({
  x,
  y,
  delay,
  color,
}: {
  x: number;
  y: number;
  delay: number;
  color: string;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration: 1100 })));
  }, [progress, delay]);
  const style = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity:
        value < 0.3 ? (value / 0.3) * 0.9 : 0.9 * (1 - (value - 0.3) / 0.7),
      transform: [
        {
          scale:
            value < 0.3 ? 0.2 + (value / 0.3) * 0.8 : 1 - (value - 0.3) * 0.5,
        },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x + 2,
          top: y + 2,
          width: WAVE_CELL - 4,
          height: WAVE_CELL - 4,
          borderRadius: 4,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

/**
 * Pixel celebration for a right quiz answer, in the month's colors. Draws
 * nothing with Reduce Motion on. Remount with a new `key` to play again.
 */
export const Celebration = ({
  kind,
  origin,
  colors,
}: {
  kind: CelebrationKind;
  origin: CelebrationOrigin;
  colors: string[];
}) => {
  const { width, height } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  if (isReducedMotion || colors.length === 0) {
    return null;
  }
  const colorAt = (index: number) => colors[index % colors.length] ?? "#34D399";
  if (kind === "burst") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: BURST_PIXELS }, (_, index) => (
          <BurstPixel
            // Particles never reorder; the index is their identity.
            key={`burst-${index}`}
            index={index}
            origin={origin}
            color={colorAt(index)}
          />
        ))}
      </View>
    );
  }
  const cells: { x: number; y: number; delay: number; index: number }[] = [];
  const columns = Math.ceil(width / WAVE_CELL);
  const rows = Math.ceil(height / WAVE_CELL);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      // About half the cells light up, so the wave reads as pixels.
      if (noise(index + 31) < 0.5) {
        const x = column * WAVE_CELL;
        const y = row * WAVE_CELL;
        cells.push({
          x,
          y,
          index,
          delay: Math.hypot(x - origin.x, y - origin.y) * 1.2,
        });
      }
    }
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cells.map((cell) => (
        <WavePixel
          key={`wave-${cell.index}`}
          x={cell.x}
          y={cell.y}
          delay={cell.delay}
          color={colorAt(cell.index * 7)}
        />
      ))}
    </View>
  );
};

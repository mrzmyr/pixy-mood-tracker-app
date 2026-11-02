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
import Svg, { Path } from "react-native-svg";

// Built on first render, never at module load: expo-router's Jest mock of
// reanimated is empty. Memoized, so every render gets the same component.
const getAnimatedPath = memoize(() => createAnimatedComponent(Path));

/** Speed along the edge in points per second. Slow: the light creeps. */
const SPEED = 70;

/** Length of the light, head to the end of its tail, in points. */
const TRAIL = 140;
/** Stroke width: a fine line, no glow. */
const WIDTH = 1.5;
/**
 * The trail is many faint dashes that all start at the head and reach back
 * further and further. Where more of them overlap, the line is brighter:
 * full at the head, fading to nothing at the tail, with no seams between
 * pieces. One color per dash: a gradient stroke does not follow a dash
 * that moves.
 */
const PIECES = 24;
/** Opacity of one dash: all of them together give 0.95 at the head. */
const PIECE_OPACITY = 1 - 0.05 ** (1 / PIECES);
const SEGMENTS = Array.from({ length: PIECES }, (_, index) => ({
  index,
  length: (TRAIL * (index + 1)) / PIECES,
}));

/**
 * Rounded rectangle outline, clockwise from the middle of the top edge.
 * Built by hand so its length is exact: the dash pattern repeats once per
 * lap and the light never jumps where the outline closes.
 */
const outline = (w: number, h: number, r: number) => {
  const x0 = 0.5;
  const y0 = 0.5;
  const x1 = w - 0.5;
  const y1 = h - 0.5;
  const path = [
    `M ${w / 2} ${y0}`,
    `H ${x1 - r}`,
    `A ${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
    `V ${y1 - r}`,
    `A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
    `H ${x0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
    `V ${y0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
    "Z",
  ].join(" ");
  const length = 2 * (x1 - x0 + y1 - y0) - 8 * r + 2 * Math.PI * r;
  return { path, length };
};

const Segment = ({
  segment,
  d,
  perimeter,
  distance,
  color,
}: {
  segment: (typeof SEGMENTS)[number];
  d: string;
  perimeter: number;
  distance: SharedValue<number>;
  color: string;
}) => {
  const animatedProps = useAnimatedProps(() => {
    const head = distance.get() % perimeter;
    // The dash covers [head - length, head]. Kept in [0, perimeter): same
    // picture, no negative dash phase.
    return {
      strokeDashoffset:
        (((segment.length - head) % perimeter) + perimeter) % perimeter,
    };
  });
  const AnimatedPath = getAnimatedPath();
  return (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeOpacity={PIECE_OPACITY}
      strokeWidth={WIDTH}
      // Butt caps: a dash split where the outline closes shows no seam.
      strokeLinecap="butt"
      strokeDasharray={[segment.length, perimeter - segment.length]}
      animatedProps={animatedProps}
    />
  );
};

/**
 * A short band of light that creeps around the inside of a rounded card.
 * Place it as the last child of a card with `overflow: "hidden"`: the card
 * clips the outer half of the line. Hidden under reduced motion.
 */
export const RunningBorder = ({
  radius,
  color = "#FFFFFF",
}: {
  radius: number;
  color?: string;
}) => {
  const isReducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  /**
   * Head position from the frame clock, not from mount: a remount (list
   * recycling, data refresh) keeps the light where it was instead of
   * snapping it back to the start.
   */
  const distance = useSharedValue(0);

  useFrameCallback(({ timestamp }) => {
    distance.set((timestamp * SPEED) / 1000);
  }, !isReducedMotion);

  if (isReducedMotion) {
    return null;
  }

  const { width, height } = size;
  const { path, length } = outline(width, height, Math.max(0, radius - 0.5));

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
          {SEGMENTS.map((segment) => (
            <Segment
              key={segment.index}
              segment={segment}
              d={path}
              perimeter={length}
              distance={distance}
              color={color}
            />
          ))}
        </Svg>
      )}
    </View>
  );
};

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

/**
 * Stacked strokes share one head. Longer strokes are fainter and wider, so
 * the light has a soft glow and a tail that fades out behind it.
 */
const LAYERS = [
  { length: 180, width: 10, opacity: 0.18 },
  { length: 120, width: 5, opacity: 0.35 },
  { length: 60, width: 2, opacity: 1 },
] as const;

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

const Layer = ({
  layer,
  d,
  perimeter,
  distance,
  color,
}: {
  layer: (typeof LAYERS)[number];
  d: string;
  perimeter: number;
  distance: SharedValue<number>;
  color: string;
}) => {
  const animatedProps = useAnimatedProps(() => {
    const head = distance.get() % perimeter;
    // The dash covers [head - length, head] along the outline. Kept in
    // [0, perimeter): same picture, no negative dash phase.
    return {
      strokeDashoffset:
        (((layer.length - head) % perimeter) + perimeter) % perimeter,
    };
  });
  const AnimatedPath = getAnimatedPath();
  return (
    // oxlint-disable-next-line react/static-components -- memoized above, same component on every render.
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeOpacity={layer.opacity}
      strokeWidth={layer.width}
      // Butt caps: a dash split where the outline closes shows no seam.
      strokeLinecap="butt"
      strokeDasharray={[layer.length, perimeter - layer.length]}
      animatedProps={animatedProps}
    />
  );
};

/**
 * A short band of light that creeps around the inside of a rounded card.
 * Place it as the last child of a card with `overflow: "hidden"`: the card
 * clips the outer half of the glow. Hidden under reduced motion.
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
          {LAYERS.map((layer) => (
            <Layer
              key={layer.length}
              layer={layer}
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

import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import type { CSSAnimationKeyframes } from "react-native-reanimated";
import Svg, { Circle, Polygon } from "react-native-svg";
import type { WeatherId } from "./weather";

// Art for the inner weather tiles, ported from the HTML prototype
// (docs/prototypes/emotion-picker/12-weather.html in the prototypes branch).
// Sizes assume a tile about 115 × 104 pt; the tile clips what overflows.

interface Loop {
  keyframes: CSSAnimationKeyframes;
  /** Milliseconds per cycle. */
  duration: number;
  /** Milliseconds. Negative starts the loop part way through, as in CSS. */
  delay?: number;
  easing?: "linear" | "ease-in-out" | "ease-out";
  alternate?: boolean;
}

/**
 * One animated piece of art. `still` is the frame shown while the system
 * reduces motion, so the picture stays readable without movement.
 */
const Piece = ({
  style,
  loop,
  still,
  children,
}: {
  style: ViewStyle;
  loop: Loop;
  still?: ViewStyle;
  children?: React.ReactNode;
}) => {
  const isReducedMotion = useReducedMotion();

  return (
    <Animated.View
      style={{
        position: "absolute",
        ...style,
        ...(isReducedMotion
          ? still
          : {
              animationName: loop.keyframes,
              animationDuration: loop.duration,
              animationDelay: loop.delay ?? 0,
              animationTimingFunction: loop.easing ?? "linear",
              animationIterationCount: "infinite",
              animationDirection: loop.alternate ? "alternate" : "normal",
            }),
      }}
    >
      {children}
    </Animated.View>
  );
};

const circle = (size: number, color: string): ViewStyle => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  backgroundColor: color,
});

// Sunny: pale sun with two glow rings that breathe.
const PULSE_INNER: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 1 }] },
  "50%": { transform: [{ scale: 60 / 54 }] },
  "100%": { transform: [{ scale: 1 }] },
};
const PULSE_OUTER: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 1 }], opacity: 1 },
  "50%": { transform: [{ scale: 82 / 70 }], opacity: 0.67 },
  "100%": { transform: [{ scale: 1 }], opacity: 1 },
};
const SunnyArt = () => (
  <>
    {/* Rings centered on the sun at top 16, right 18, size 38. */}
    <Piece
      style={{
        top: 16 - 16,
        right: 18 - 16,
        ...circle(70, "rgba(255,255,255,0.18)"),
      }}
      loop={{ keyframes: PULSE_OUTER, duration: 3000, easing: "ease-in-out" }}
    />
    <Piece
      style={{
        top: 16 - 8,
        right: 18 - 8,
        ...circle(54, "rgba(255,255,255,0.35)"),
      }}
      loop={{ keyframes: PULSE_INNER, duration: 3000, easing: "ease-in-out" }}
    />
    <View
      style={{
        position: "absolute",
        top: 16,
        right: 18,
        ...circle(38, "#fff7d6"),
      }}
    />
  </>
);

// Clear & calm: moon over still water, one ripple spreading out.
const RIPPLE: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 0.4 }], opacity: 1 },
  to: { transform: [{ scale: 3 }], opacity: 0 },
};
const ClearArt = () => (
  <>
    <View
      style={{
        position: "absolute",
        top: 16,
        right: 22,
        opacity: 0.9,
        ...circle(22, "#ffffff"),
      }}
    />
    <LinearGradient
      colors={["#99f6e4", "#5eead4"]}
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36 }}
    />
    <Piece
      style={{
        left: "50%",
        bottom: 14,
        width: 30,
        height: 8,
        marginLeft: -15,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.8)",
        borderRadius: 15,
      }}
      loop={{ keyframes: RIPPLE, duration: 4000, easing: "ease-out" }}
      still={{ transform: [{ scale: 1.6 }], opacity: 0.6 }}
    />
  </>
);

// Breezy: three gusts and a tumbling leaf cross the tile.
const GUST: CSSAnimationKeyframes = {
  from: { transform: [{ translateX: -60 }] },
  to: { transform: [{ translateX: 130 }] },
};
const LEAF: CSSAnimationKeyframes = {
  "0%": {
    transform: [{ translateX: -10 }, { translateY: 40 }, { rotate: "0deg" }],
  },
  "50%": {
    transform: [{ translateX: 60 }, { translateY: 20 }, { rotate: "270deg" }],
  },
  "100%": {
    transform: [{ translateX: 130 }, { translateY: 46 }, { rotate: "540deg" }],
  },
};
const GUSTS = [
  { top: 24, width: 50, delay: 0, still: 12 },
  { top: 42, width: 34, delay: 800, still: 52 },
  { top: 58, width: 44, delay: 1500, still: 22 },
];
const BreezyArt = () => (
  <>
    {GUSTS.map((gust) => (
      <Piece
        key={gust.top}
        style={{
          left: 0,
          top: gust.top,
          width: gust.width,
          height: 2,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.95)",
          transform: [{ translateX: -60 }],
        }}
        loop={{ keyframes: GUST, duration: 2400, delay: gust.delay }}
        still={{ transform: [{ translateX: gust.still }] }}
      />
    ))}
    <Piece
      style={{
        left: 0,
        top: 0,
        width: 10,
        height: 6,
        borderTopLeftRadius: 10,
        borderBottomRightRadius: 10,
        backgroundColor: "#10b981",
        transform: [{ translateX: -10 }, { translateY: 40 }],
      }}
      loop={{ keyframes: LEAF, duration: 3200, easing: "ease-in-out" }}
      still={{
        transform: [
          { translateX: 78 },
          { translateY: 26 },
          { rotate: "30deg" },
        ],
      }}
    />
  </>
);

// Foggy: soft white bands drift sideways. Stacked layers stand in for blur.
const FOG_LAYERS = [
  { inset: 0, alpha: 0.18 },
  { inset: 2, alpha: 0.25 },
  { inset: 4, alpha: 0.35 },
];
const DRIFT: CSSAnimationKeyframes = {
  from: { transform: [{ translateX: 0 }] },
  to: { transform: [{ translateX: 36 }] },
};
const BANDS = [
  { top: 18, width: 160, delay: 0 },
  { top: 40, width: 120, delay: -2000 },
  { top: 62, width: 160, delay: -4000 },
];
const FoggyArt = () => (
  <>
    {BANDS.map((band) => (
      <Piece
        key={band.top}
        style={{ left: -40, top: band.top - 3, width: band.width, height: 18 }}
        loop={{
          keyframes: DRIFT,
          duration: 6000,
          delay: band.delay,
          easing: "ease-in-out",
          alternate: true,
        }}
      >
        {FOG_LAYERS.map((layer) => (
          <View
            key={layer.inset}
            style={{
              position: "absolute",
              left: layer.inset,
              right: layer.inset,
              top: layer.inset,
              bottom: layer.inset,
              borderRadius: 9 - layer.inset,
              backgroundColor: `rgba(255,255,255,${layer.alpha})`,
            }}
          />
        ))}
      </Piece>
    ))}
  </>
);

// Cloud shared by drizzle and storm: a pill with two round puffs.
const Cloud = ({ color }: { color: string }) => (
  <View
    style={{ position: "absolute", top: 12, left: 24, width: 64, height: 22 }}
  >
    <View
      style={{ position: "absolute", left: 10, top: -14, ...circle(30, color) }}
    />
    <View
      style={{ position: "absolute", left: 32, top: -9, ...circle(22, color) }}
    />
    <View
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 20,
        backgroundColor: color,
      }}
    />
  </View>
);

// Drizzle: grey cloud, thin drops falling and fading.
const RAIN: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 0 }], opacity: 1 },
  to: { transform: [{ translateY: 48 }], opacity: 0 },
};
const DROPS = [0, 1, 2, 3, 4];
const DrizzleArt = () => (
  <>
    <Cloud color="#f1f5f9" />
    {DROPS.map((i) => (
      <Piece
        key={i}
        style={{
          left: 30 + i * 11,
          top: 38,
          width: 1.5,
          height: 9,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.95)",
        }}
        loop={{
          keyframes: RAIN,
          duration: 1100,
          delay: Math.round(((i * 0.37) % 1.1) * 1000),
        }}
        still={{ transform: [{ translateY: (i % 3) * 12 }] }}
      />
    ))}
  </>
);

// Storm: dark cloud, a bolt that flashes, the sky lighting up with it.
const FLASH: CSSAnimationKeyframes = {
  "0%": { opacity: 0 },
  "62%": { opacity: 0 },
  "64%": { opacity: 1 },
  "68%": { opacity: 1 },
  "70%": { opacity: 0 },
  "100%": { opacity: 0 },
};
const SKY: CSSAnimationKeyframes = {
  "0%": { opacity: 0 },
  "62%": { opacity: 0 },
  "64%": { opacity: 0.18 },
  "70%": { opacity: 0 },
  "100%": { opacity: 0 },
};
// CSS clip-path polygon(50% 0, 10% 55%, 45% 55%, 25% 100%, 90% 40%, 55% 40%, 80% 0) on 18 × 34.
const BOLT_POINTS = "9,0 1.8,18.7 8.1,18.7 4.5,34 16.2,13.6 9.9,13.6 14.4,0";
const StormArt = () => (
  <>
    <Cloud color="#64748b" />
    <Piece
      style={{ left: 52, top: 36, width: 18, height: 34, opacity: 0 }}
      loop={{ keyframes: FLASH, duration: 2800 }}
      still={{ opacity: 1 }}
    >
      <Svg width={18} height={34}>
        <Polygon points={BOLT_POINTS} fill="#fde047" />
      </Svg>
    </Piece>
    <Piece
      style={{
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "#ffffff",
        opacity: 0,
      }}
      loop={{ keyframes: SKY, duration: 2800 }}
    />
  </>
);

// Heatwave: hot sun, two lines of air shimmering above the ground.
const SHIMMER: CSSAnimationKeyframes = {
  from: { transform: [{ scaleX: 0.7 }, { skewX: "20deg" }] },
  to: { transform: [{ scaleX: 1 }, { skewX: "-20deg" }] },
};
const HeatwaveArt = () => (
  <>
    <View
      style={{
        position: "absolute",
        top: 14,
        left: 18,
        ...circle(30, "#fff1c2"),
      }}
    />
    {[
      { top: 58, delay: 0 },
      { top: 68, delay: 400 },
    ].map((line) => (
      <Piece
        key={line.top}
        style={{
          left: 6,
          right: 6,
          top: line.top,
          height: 3,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.6)",
        }}
        loop={{
          keyframes: SHIMMER,
          duration: 1400,
          delay: line.delay,
          easing: "ease-in-out",
          alternate: true,
        }}
      />
    ))}
  </>
);

// Frost: flakes fall and turn slowly.
const SNOW: CSSAnimationKeyframes = {
  from: {
    transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: "0deg" }],
  },
  to: {
    transform: [{ translateX: 10 }, { translateY: 120 }, { rotate: "180deg" }],
  },
};
const FLAKES = [0, 1, 2, 3, 4, 5];
const FrostArt = () => (
  <>
    {FLAKES.map((i) => (
      <Piece
        key={i}
        style={{ left: 8 + i * 18, top: -14 }}
        loop={{ keyframes: SNOW, duration: 4000, delay: -i * 700 }}
        still={{ transform: [{ translateY: 22 + ((i * 37) % 60) }] }}
      >
        <Text
          style={{
            color: "#818cf8",
            fontSize: 15,
            textShadowColor: "rgba(99,102,241,0.4)",
            textShadowRadius: 2,
          }}
        >
          ✻
        </Text>
      </Piece>
    ))}
  </>
);

// After the rain: a rainbow arc rising and fading in.
const RISE: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 6 }], opacity: 0.6 },
  to: { transform: [{ translateY: -2 }], opacity: 1 },
};
// CSS radial-gradient bands from 48% to 72% of the 120 pt circle's corner
// radius (84.9 pt), clipped to the circle: six 3.4 pt rings.
const RAINBOW = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fde047",
  "#fb923c",
  "#f87171",
];
const RainbowArt = () => (
  <Piece
    style={{
      left: "50%",
      top: 26,
      width: 120,
      height: 120,
      marginLeft: -60,
      opacity: 0.9,
    }}
    loop={{
      keyframes: RISE,
      duration: 4000,
      easing: "ease-in-out",
      alternate: true,
    }}
  >
    <Svg width={120} height={120}>
      {RAINBOW.map((color, i) => (
        <Circle
          key={color}
          cx={60}
          cy={60}
          r={40.7 + 3.4 * i + 1.7}
          stroke={color}
          strokeWidth={3.4}
          fill="none"
        />
      ))}
    </Svg>
  </Piece>
);

const ART: Record<WeatherId, () => React.ReactElement> = {
  sunny: SunnyArt,
  clear: ClearArt,
  breezy: BreezyArt,
  foggy: FoggyArt,
  drizzle: DrizzleArt,
  storm: StormArt,
  heatwave: HeatwaveArt,
  frost: FrostArt,
  rainbow: RainbowArt,
};

/**
 * Gradient background and animated picture of one weather tile. Fills its
 * parent; hidden from screen readers, the tile carries the label.
 */
export const WeatherArt = ({
  id,
  gradient,
}: {
  id: WeatherId;
  gradient: readonly [string, string];
}) => {
  const Art = ART[id];
  // 160deg tiles lean their gradient right, 180deg tiles go straight down.
  const isTilted = id === "sunny" || id === "breezy";

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <LinearGradient
        colors={gradient}
        start={isTilted ? { x: 0.33, y: 0 } : { x: 0.5, y: 0 }}
        end={isTilted ? { x: 0.67, y: 1 } : { x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <Art />
    </View>
  );
};

import { useEffect, useId, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  createAnimatedComponent,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import Svg, { Ellipse, G, Path } from "react-native-svg";
import {
  PIXY_CHEEK,
  PIXY_EYE_R,
  PIXY_EYE_Y,
  PIXY_EYES_X,
  PIXY_INK,
  PIXY_PUPIL_R,
} from "./constants";
import { PixyBackground, PixyDefs } from "./face";

const AnimatedEllipse = createAnimatedComponent(Ellipse);
const AnimatedG = createAnimatedComponent(G);

/** How long the happy face stays after a celebration. */
const HAPPY_MS = 1150;
const HOP_MS = 620;
const SPARK_MS = 900;
const SPARKS = [
  { id: "a", glyph: "✦", color: "#FB6B0F" },
  { id: "b", glyph: "✧", color: "#FFC23D" },
  { id: "c", glyph: "♥", color: "#ff6b81" },
  { id: "d", glyph: "✦", color: "#FB6B0F" },
  { id: "e", glyph: "★", color: "#FFC23D" },
];

/** Pupil travel when Pixy glances, in the 100 x 100 box. */
const LOOK_X = 3.4;
const LOOK_Y = 3;

const styles = StyleSheet.create({
  shadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#000",
  },
  spark: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontWeight: "700",
  },
});

const random = (min: number, max: number) => min + Math.random() * (max - min);

// Stable 0..1 noise, so each celebration gets new sparkle paths without state.
const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43_758.5453;
  return x - Math.floor(x);
};

const getEaseOut = () => Easing.bezier(0.23, 1, 0.32, 1);

// Open eye: white eye and pupil. `open` squeezes both to blink; `lookX/Y`
// move the pupil.
const Eye = ({
  cx,
  open,
  lookX,
  lookY,
}: {
  cx: number;
  open: SharedValue<number>;
  lookX: SharedValue<number>;
  lookY: SharedValue<number>;
}) => {
  const white = useAnimatedProps(() => ({ ry: PIXY_EYE_R * open.get() }));
  const pupil = useAnimatedProps(() => ({
    cx: cx + lookX.get() * LOOK_X,
    cy: PIXY_EYE_Y - 0.5 + lookY.get() * LOOK_Y * open.get(),
    ry: PIXY_PUPIL_R * open.get(),
  }));
  const glint = useAnimatedProps(() => ({
    cx: cx - PIXY_PUPIL_R * 0.35 + lookX.get() * LOOK_X,
    cy: PIXY_EYE_Y - 0.5 - PIXY_PUPIL_R * 0.4 + lookY.get() * LOOK_Y,
    opacity: open.get() > 0.6 ? 1 : 0,
  }));

  return (
    <G>
      <AnimatedEllipse
        cx={cx}
        cy={PIXY_EYE_Y}
        rx={PIXY_EYE_R}
        fill="#fff"
        animatedProps={white}
      />
      <AnimatedEllipse
        rx={PIXY_PUPIL_R}
        fill={PIXY_INK}
        animatedProps={pupil}
      />
      <AnimatedEllipse
        rx={PIXY_PUPIL_R * 0.32}
        ry={PIXY_PUPIL_R * 0.32}
        fill="#fff"
        animatedProps={glint}
      />
    </G>
  );
};

const Cheeks = ({ opacity }: { opacity: number }) =>
  [19, 81].map((cx) => (
    <Ellipse
      key={cx}
      cx={cx}
      cy={61}
      rx={6.5}
      ry={3.6}
      fill={PIXY_CHEEK}
      opacity={opacity}
    />
  ));

// One sparkle flies up and out from Pixy's head and fades.
const Spark = ({
  index,
  round,
  size,
  progress,
}: {
  index: number;
  round: number;
  size: number;
  progress: SharedValue<number>;
}) => {
  const spark = SPARKS[index];
  const count = SPARKS.length;
  const angle =
    -Math.PI / 2 +
    (index - (count - 1) / 2) * 0.62 +
    (noise(round * 7 + index) - 0.5) * 0.3;
  const distance = (0.3 + noise(round * 13 + index) * 0.14) * size;
  const delay = index * 0.04;

  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (progress.get() - delay) / (1 - delay)));
    return {
      opacity: p === 0 ? 0 : interpolate(p, [0, 0.25, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * distance * 1.25 * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: interpolate(p, [0, 1], [0.3, 1.1]) },
        { rotate: `${25 * p}deg` },
      ],
    };
  });

  return (
    <Animated.Text
      style={[
        styles.spark,
        {
          color: spark.color,
          fontSize: Math.max(11, size * 0.14),
          top: size * 0.12,
        },
        style,
      ]}
    >
      {spark.glyph}
    </Animated.Text>
  );
};

/**
 * Animated Pixy for flows where Pixy keeps you company. While nothing
 * happens, Pixy bobs, blinks at random (sometimes twice), and glances
 * around. Each change of `celebrateKey` makes Pixy happy: `^ ^` eyes, open
 * smile, a hop, and sparkles. With reduced motion Pixy only blinks and
 * changes its face.
 *
 * Decorative: hidden from screen readers.
 */
export const PixyMascot = ({
  size,
  celebrateKey = 0,
}: {
  size: number;
  /** Change this value to celebrate, for example after an answer. */
  celebrateKey?: number;
}) => {
  const id = useId().replaceAll(":", "");
  const isReducedMotion = useReducedMotion();

  const open = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const happy = useSharedValue(0);
  const hop = useSharedValue(0);
  const bob = useSharedValue(0);
  const spark = useSharedValue(0);
  const isHappy = useRef(false);

  // Random blinks, sometimes a double blink. Paused while Pixy is happy.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const close = () =>
      withSequence(
        withTiming(0.08, { duration: 70 }),
        withTiming(1, { duration: 110 })
      );
    const tick = () => {
      timer = setTimeout(
        () => {
          if (!isHappy.current) {
            open.set(
              Math.random() < 0.22
                ? withSequence(close(), withDelay(50, close()))
                : close()
            );
          }
          tick();
        },
        random(1800, 5200)
      );
    };
    tick();
    return () => clearTimeout(timer);
  }, [open]);

  // After a few quiet seconds Pixy glances somewhere, then back.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      timer = setTimeout(
        () => {
          if (!isHappy.current) {
            const ease = { duration: 260, easing: getEaseOut() };
            const hold = random(700, 1400);
            lookX.set(
              withSequence(
                withTiming(random(-1, 1), ease),
                withDelay(hold, withTiming(0, ease))
              )
            );
            lookY.set(
              withSequence(
                withTiming(random(-0.6, 0.8), ease),
                withDelay(hold, withTiming(0, ease))
              )
            );
          }
          tick();
        },
        random(2600, 6000)
      );
    };
    tick();
    return () => clearTimeout(timer);
  }, [lookX, lookY]);

  useEffect(() => {
    if (isReducedMotion) {
      bob.set(0);
      return;
    }
    bob.set(
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [bob, isReducedMotion]);

  useEffect(() => {
    if (celebrateKey === 0) {
      return;
    }
    isHappy.current = true;
    open.set(1);
    happy.set(
      withSequence(
        // Instant swap: a crossfade shows both faces at once.
        withTiming(1, { duration: 0 }),
        withDelay(HAPPY_MS, withTiming(0, { duration: 0 }))
      )
    );
    if (!isReducedMotion) {
      hop.set(0);
      hop.set(withTiming(1, { duration: HOP_MS }));
      spark.set(0);
      spark.set(withTiming(1, { duration: SPARK_MS, easing: getEaseOut() }));
    }
    const timer = setTimeout(() => {
      isHappy.current = false;
    }, HAPPY_MS);
    return () => clearTimeout(timer);
  }, [celebrateKey, isReducedMotion, open, happy, hop, spark]);

  // Hop: squash, jump, land, settle. Bob adds a slow float on top.
  const body = useAnimatedStyle(() => {
    const p = hop.get();
    const steps = [0, 0.18, 0.45, 0.72, 1];
    const lift = (size / 92) * 14;
    return {
      transform: [
        {
          translateY:
            interpolate(p, steps, [0, 0, -lift, 0, 0]) - bob.get() * 2.5,
        },
        { scaleX: interpolate(p, steps, [1, 1.08, 0.95, 1.05, 1]) },
        { scaleY: interpolate(p, steps, [1, 0.9, 1.06, 0.95, 1]) },
      ],
    };
  });
  const shadow = useAnimatedStyle(() => ({
    opacity: interpolate(hop.get(), [0, 0.45, 1], [0.06, 0.03, 0.06]),
    transform: [{ scale: interpolate(hop.get(), [0, 0.45, 1], [1, 0.7, 1]) }],
  }));
  const idleFace = useAnimatedProps(() => ({ opacity: 1 - happy.get() }));
  const happyFace = useAnimatedProps(() => ({ opacity: happy.get() }));

  return (
    <View
      style={{ width: size, height: size * 1.1 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          styles.shadow,
          {
            width: size * 0.68,
            height: size * 0.07,
            left: size * 0.16,
            top: size * 1.02,
          },
          shadow,
        ]}
      />
      <Animated.View
        style={[{ width: size, height: size, transformOrigin: "bottom" }, body]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <PixyDefs id={id} />
          <G clipPath={`url(#${id}clip)`}>
            <PixyBackground id={id} />
            <AnimatedG animatedProps={idleFace}>
              {PIXY_EYES_X.map((cx) => (
                <Eye key={cx} cx={cx} open={open} lookX={lookX} lookY={lookY} />
              ))}
              <Cheeks opacity={0.4} />
              <Path
                d="M42 64.5 Q50 71.5 58 64.5"
                stroke={PIXY_INK}
                strokeWidth={4}
                strokeLinecap="round"
                fill="none"
              />
            </AnimatedG>
            <AnimatedG animatedProps={happyFace}>
              {PIXY_EYES_X.map((cx) => (
                <Path
                  key={cx}
                  d={`M${cx - 10.5} ${PIXY_EYE_Y + 4} Q${cx} ${PIXY_EYE_Y - 12} ${cx + 10.5} ${PIXY_EYE_Y + 4}`}
                  stroke="#fff"
                  strokeWidth={7}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
              <Cheeks opacity={0.8} />
              <Path
                d="M38.5 61 Q50 61 61.5 61 Q60 77 50 77 Q40 77 38.5 61 Z"
                fill={PIXY_INK}
              />
              <Path
                d="M44 72.5 Q50 69 56 72.5 Q53 76.5 50 76.5 Q47 76.5 44 72.5 Z"
                fill="#ff6b81"
              />
            </AnimatedG>
          </G>
        </Svg>
      </Animated.View>
      {celebrateKey > 0 && !isReducedMotion
        ? SPARKS.map((item, index) => (
            <Spark
              // New key each celebration restarts the sparkle.
              key={`${celebrateKey}-${item.id}`}
              index={index}
              round={celebrateKey}
              size={size}
              progress={spark}
            />
          ))
        : null}
    </View>
  );
};

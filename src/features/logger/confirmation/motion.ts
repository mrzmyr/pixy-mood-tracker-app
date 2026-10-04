import { Easing, FadeIn, Keyframe } from "react-native-reanimated";

// Everything here is built on call, never at module load: some Jest suites
// load this module through a reanimated mock without `Easing` or `Keyframe`.

/** Delay before Pixy jumps in. */
export const JUMP_DELAY_MS = 150;

/** Duration of Pixy's jump. */
export const JUMP_MS = 1100;

/** Moment Pixy first touches down, for the success haptic. */
export const LAND_MS = JUMP_DELAY_MS + JUMP_MS * 0.55;

/**
 * Strong ease-out for entering UI. Built-in easings are too weak; never use
 * ease-in on UI. See https://emilkowal.ski/ui/great-animations
 */
export const getEaseOut = () => Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Pixy jumps up, lands with a squash, and settles. With reduced motion Pixy
 * only fades in. Call inside `useMemo`, keyed on reduced motion.
 */
export const createJump = ({
  isReducedMotion,
}: {
  isReducedMotion: boolean;
}) => {
  if (isReducedMotion) {
    return FadeIn.delay(JUMP_DELAY_MS).duration(200);
  }

  return new Keyframe({
    0: {
      opacity: 0,
      transform: [{ translateY: 40 }, { scaleX: 0.9 }, { scaleY: 1.05 }],
    },
    30: {
      opacity: 1,
      transform: [{ translateY: -30 }, { scaleX: 0.95 }, { scaleY: 1.08 }],
      easing: getEaseOut(),
    },
    55: {
      opacity: 1,
      transform: [{ translateY: 0 }, { scaleX: 1.1 }, { scaleY: 0.88 }],
    },
    72: {
      opacity: 1,
      transform: [{ translateY: -6 }, { scaleX: 0.98 }, { scaleY: 1.02 }],
    },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }],
      easing: getEaseOut(),
    },
  })
    .delay(JUMP_DELAY_MS)
    .duration(JUMP_MS);
};

/**
 * Text fades in while it rises 8 pt. With reduced motion only the fade
 * stays. Call inside `useMemo`, keyed on reduced motion.
 *
 * Use on `Animated.View`, not `Animated.Text`: entering animations on text
 * do not run on iOS.
 */
export const createFadeIn = ({
  delay,
  isReducedMotion,
}: {
  delay: number;
  isReducedMotion: boolean;
}) => {
  if (isReducedMotion) {
    return FadeIn.delay(delay).duration(400);
  }

  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 8 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: getEaseOut() },
  })
    .delay(delay)
    .duration(700);
};

/** Duration of Pixy's happy jump on tap. */
export const HAPPY_JUMP_MS = 1200;

/** Moment Pixy lands from the happy jump, for the impact haptic. */
export const HAPPY_LAND_MS = HAPPY_JUMP_MS * 0.6;

/**
 * Tap on Pixy: crouch, jump high with a full spin, squash on landing, one
 * more small hop. No delay: it answers the tap. With reduced motion Pixy only
 * fades in again. Call inside `useMemo`, keyed on reduced motion.
 */
export const createHappyJump = ({
  isReducedMotion,
}: {
  isReducedMotion: boolean;
}) => {
  if (isReducedMotion) {
    return FadeIn.duration(200);
  }

  return new Keyframe({
    0: {
      transform: [
        { translateY: 0 },
        { rotate: "0deg" },
        { scaleX: 1 },
        { scaleY: 1 },
      ],
    },
    12: {
      transform: [
        { translateY: 4 },
        { rotate: "0deg" },
        { scaleX: 1.15 },
        { scaleY: 0.82 },
      ],
      easing: getEaseOut(),
    },
    35: {
      transform: [
        { translateY: -56 },
        { rotate: "200deg" },
        { scaleX: 0.92 },
        { scaleY: 1.1 },
      ],
      easing: getEaseOut(),
    },
    60: {
      transform: [
        { translateY: 0 },
        { rotate: "360deg" },
        { scaleX: 1.18 },
        { scaleY: 0.8 },
      ],
    },
    74: {
      transform: [
        { translateY: -14 },
        { rotate: "360deg" },
        { scaleX: 0.96 },
        { scaleY: 1.05 },
      ],
      easing: getEaseOut(),
    },
    86: {
      transform: [
        { translateY: 0 },
        { rotate: "360deg" },
        { scaleX: 1.06 },
        { scaleY: 0.94 },
      ],
    },
    100: {
      transform: [
        { translateY: 0 },
        { rotate: "360deg" },
        { scaleX: 1 },
        { scaleY: 1 },
      ],
      easing: getEaseOut(),
    },
  }).duration(HAPPY_JUMP_MS);
};

/**
 * One confetti pixel: bursts out from Pixy to `x`, `y` while it spins, then
 * falls a little and fades. Starts as Pixy takes off.
 */
export const createConfettiBurst = ({
  x,
  y,
  rotate,
}: {
  x: number;
  y: number;
  rotate: number;
}) =>
  new Keyframe({
    0: {
      opacity: 0,
      transform: [
        { translateX: 0 },
        { translateY: 0 },
        { rotate: "0deg" },
        { scale: 0.3 },
      ],
    },
    15: {
      opacity: 1,
      transform: [
        { translateX: 0 },
        { translateY: 0 },
        { rotate: "0deg" },
        { scale: 0.3 },
      ],
    },
    55: {
      opacity: 1,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotate * 0.7}deg` },
        { scale: 1 },
      ],
      easing: getEaseOut(),
    },
    100: {
      opacity: 0,
      transform: [
        { translateX: x * 1.15 },
        { translateY: y + 24 },
        { rotate: `${rotate}deg` },
        { scale: 0.8 },
      ],
    },
  }).duration(HAPPY_JUMP_MS);

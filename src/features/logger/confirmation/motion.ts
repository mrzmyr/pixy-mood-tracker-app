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

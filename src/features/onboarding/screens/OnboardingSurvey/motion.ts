import { Easing, FadeIn, Keyframe } from "react-native-reanimated";

// Built on call, never at module load: Jest suites load this module through a
// reanimated mock without `Easing` or `Keyframe`.

/** Delay after a single-choice pick, so Pixy's hop is seen before the next question. */
export const ADVANCE_MS = 720;

/** Strong ease-out for entering UI. */
const getEaseOut = () => Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Step enters from the side it comes from: forward slides in from the right,
 * back from the left. Reduced motion only fades.
 */
export const createStepEnter = ({
  direction,
  isReducedMotion,
}: {
  direction: 1 | -1;
  isReducedMotion: boolean;
}) => {
  if (isReducedMotion) {
    return FadeIn.duration(200);
  }

  return new Keyframe({
    0: { opacity: 0, transform: [{ translateX: 28 * direction }] },
    100: {
      opacity: 1,
      transform: [{ translateX: 0 }],
      easing: getEaseOut(),
    },
  }).duration(420);
};

/** List items rise in one after another. */
export const createRise = ({
  delay,
  isReducedMotion,
}: {
  delay: number;
  isReducedMotion: boolean;
}) => {
  if (isReducedMotion) {
    return FadeIn.delay(delay).duration(200);
  }

  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }],
      easing: getEaseOut(),
    },
  })
    .delay(delay)
    .duration(400);
};

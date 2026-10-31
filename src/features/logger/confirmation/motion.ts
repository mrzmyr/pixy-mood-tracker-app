import { Easing, FadeIn, Keyframe } from "react-native-reanimated";

// Everything here is built on call, never at module load: some Jest suites
// load this module through a reanimated mock without `Easing` or `Keyframe`.

/**
 * Strong ease-out for entering UI. Built-in easings are too weak; never use
 * ease-in on UI. See https://emilkowal.ski/ui/great-animations
 */
export const getEaseOut = () => Easing.bezier(0.23, 1, 0.32, 1);

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

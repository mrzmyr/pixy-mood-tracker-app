import { cubicBezier, Easing, FadeIn, Keyframe } from "react-native-reanimated";

// Everything here is built on call, never at module load: some Jest suites
// load this module through a reanimated mock without `Easing` or `Keyframe`.

/** Delay before the entry's pixel starts to drop. */
export const DROP_DELAY_MS = 80;

/** Duration of the pixel drop. The pixel lands at delay + duration. */
export const DROP_MS = 320;

/** Moment the entry's pixel lands, for the ripple and the success haptic. */
export const LAND_MS = DROP_DELAY_MS + DROP_MS;

/**
 * Strong ease-out for entering UI. Built-in easings are too weak; never use
 * ease-in on UI. See https://emilkowal.ski/ui/great-animations
 */
export const getEaseOut = () => Easing.bezier(0.23, 1, 0.32, 1);

/** {@link getEaseOut} for Reanimated CSS transitions. */
export const getEaseOutCss = () => cubicBezier(0.23, 1, 0.32, 1);

/**
 * Content rises 8 pt and fades in. With reduced motion only the fade stays.
 * Call inside `useMemo`, keyed on reduced motion.
 */
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
    0: { opacity: 0, transform: [{ translateY: 8 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: getEaseOut() },
  })
    .delay(delay)
    .duration(300);
};

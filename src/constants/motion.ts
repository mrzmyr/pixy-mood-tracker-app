import { Easing } from "react-native-reanimated";

/**
 * Animation durations in ms. Pick a step by role. One-off choreography, such
 * as a recap story reveal, may time itself.
 */
export const DURATION = {
  /** Press-down and release feedback. */
  press: 120,
  /** Fade-outs, color changes, small state changes. */
  fast: 150,
  /** Toasts, sheets of content, short moves. */
  base: 250,
  /** Fade-ins and reveals. */
  slow: 400,
  /** Text that fades in while it rises. */
  slower: 700,
} as const;

/** Cubic bezier control points: `[x1, y1, x2, y2]`. */
const CURVES = {
  /** Strong ease-out. Entering UI and press feedback. */
  out: [0.23, 1, 0.32, 1],
  /** Fast start, soft landing, no overshoot. UI that moves or grows on screen. */
  move: [0.2, 0, 0, 1],
  /** Soft ease for color and opacity crossfades. */
  standard: [0.25, 0.1, 0.25, 1],
} as const;

/**
 * Easing for one motion role. Pixy motion is soft and eased: never a spring
 * (`pixy-standards/no-spring-animation`), never ease-in on entering UI.
 *
 * Call it in a component or hook, never at module load: some Jest suites load
 * reanimated as an empty mock.
 */
export const getEasing = (curve: keyof typeof CURVES) => {
  const [x1, y1, x2, y2] = CURVES[curve];
  return Easing.bezier(x1, y1, x2, y2);
};

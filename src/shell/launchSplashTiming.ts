/** One step: the square rests, then turns 90° into the next color. */
export const STEP_MS = 520;
/** Part of each step the square rests before it turns. */
export const REST = 0.35;

/**
 * Time from ready data to the exit. The exit starts at 0°, so a square
 * that leaves mid-turn would jump back. During a rest it leaves at once;
 * mid-turn it finishes the turn first. Reduced motion has no turn.
 */
export const getExitDelay = (elapsedMs: number, isReducedMotion: boolean) => {
  if (isReducedMotion) {
    return 0;
  }
  const inStep = elapsedMs % STEP_MS;
  return inStep < REST * STEP_MS ? 0 : STEP_MS - inStep;
};

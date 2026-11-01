import { useEffect, useRef } from "react";
import {
  Easing,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { SKY_DRIFT_SPEED, Sky } from "@/components/sky";

/** Peak speed while the flow moves to the next step. */
const STEP_SPEED = 220;
const STEP_RAMP_UP_MS = 250;
const STEP_RAMP_DOWN_MS = 1600;

/**
 * Full-screen sky behind stepped flows: onboarding, recap stories. The
 * clouds drift slowly and speed up for a moment each time `step` changes; `boost` reports how
 * fast, so cloud Pixy can keep pace.
 */
export const SteppedSky = ({
  step,
  isVisible = true,
  boost,
}: {
  step: number;
  /** False fades the sky out, for the hand-off to the calendar. */
  isVisible?: boolean;
  /** 0 at drift speed, 1 at the peak of a step change. */
  boost: SharedValue<number>;
}) => {
  const isReducedMotion = useReducedMotion();
  const speed = useSharedValue(SKY_DRIFT_SPEED);

  useAnimatedReaction(
    () => speed.get(),
    (current) => {
      // Reduced motion: the sky stands still, so cloud Pixy does too.
      if (!isReducedMotion) {
        boost.set((current - SKY_DRIFT_SPEED) / (STEP_SPEED - SKY_DRIFT_SPEED));
      }
    }
  );

  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) {
      return;
    }
    previousStep.current = step;
    speed.set(
      withSequence(
        withTiming(STEP_SPEED, {
          duration: STEP_RAMP_UP_MS,
          easing: Easing.in(Easing.quad),
        }),
        withTiming(SKY_DRIFT_SPEED, {
          duration: STEP_RAMP_DOWN_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  }, [step, speed]);

  return <Sky speed={speed} isVisible={isVisible} />;
};

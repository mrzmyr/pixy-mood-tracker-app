import { useEffect, useState } from "react";
import { HAPPY_JUMP_MS } from "./motion";

/**
 * Taps on Pixy. Each tap starts a happy jump. On good and neutral days a
 * tap also laughs and bursts confetti for `HAPPY_JUMP_MS`.
 *
 * The confetti unmounts when the burst ends. Android draws the pixels again
 * at full opacity after their entering keyframe fades them out, so the
 * keyframe alone cannot hide them.
 */
export const usePixyJumps = ({
  isCelebrating,
  isReducedMotion,
}: {
  isCelebrating: boolean;
  isReducedMotion: boolean;
}) => {
  // Each tap remounts Pixy and the confetti, so the keyframes play again.
  const [jumps, setJumps] = useState(0);
  // Tap that still celebrates; 0 once the jump is over.
  const [celebratingJump, setCelebratingJump] = useState(0);

  useEffect(() => {
    if (celebratingJump === 0) {
      return;
    }
    const timeout = setTimeout(() => setCelebratingJump(0), HAPPY_JUMP_MS);
    return () => clearTimeout(timeout);
  }, [celebratingJump]);

  const isJoyful = celebratingJump > 0 && celebratingJump === jumps;

  return {
    jumps,
    isJoyful,
    hasConfetti: isJoyful && !isReducedMotion,
    tap: () => {
      const next = jumps + 1;
      setJumps(next);
      setCelebratingJump(isCelebrating ? next : 0);
    },
  };
};

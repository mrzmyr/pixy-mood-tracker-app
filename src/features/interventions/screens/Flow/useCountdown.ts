import { useEffect, useEffectEvent, useRef, useState } from "react";

const TICK_MS = 100;

/**
 * Remaining time of a countdown that can pause. Measures wall-clock time
 * between ticks, so slow renders do not stretch it. Calls `onDone` once at
 * zero. Starts from `durationMs` on mount; remount with a new `key` to
 * restart.
 */
export const useCountdown = ({
  durationMs,
  isPaused,
  onDone,
}: {
  durationMs: number;
  isPaused: boolean;
  onDone?: () => void;
}) => {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const remaining = useRef(durationMs);
  const done = useEffectEvent(() => onDone?.());

  useEffect(() => {
    if (isPaused || remaining.current <= 0) {
      return;
    }
    let last = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      remaining.current = Math.max(0, remaining.current - (now - last));
      last = now;
      setRemainingMs(remaining.current);
      if (remaining.current === 0) {
        clearInterval(interval);
        done();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isPaused]);

  return remainingMs;
};

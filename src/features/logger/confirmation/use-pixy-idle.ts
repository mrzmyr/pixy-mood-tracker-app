import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Where Pixy's pupils point, seen from the user. */
export type PixyLook = "center" | "left" | "right";

/** Eye state for one frame of Pixy's idle behavior. */
export interface PixyIdle {
  isBlinking: boolean;
  look: PixyLook;
}

/** Eyes stay closed this long per blink. Real blinks take 100-150 ms. */
const BLINK_MS = 130;
/** Open time between the two blinks of a double blink. */
const DOUBLE_BLINK_GAP_MS = 140;
/** Share of blinks that are double blinks. */
const DOUBLE_BLINK_CHANCE = 0.25;
/** Wait before the next blink, min and max. */
const BLINK_WAIT_MS = [2000, 6000] as const;
/** Wait before the next glance, min and max. */
const GLANCE_WAIT_MS = [4000, 9000] as const;
/** Pixy holds a glance this long, min and max. */
const GLANCE_HOLD_MS = [700, 1400] as const;

const REST: PixyIdle = { isBlinking: false, look: "center" };

type Random = () => number;

const between = ([min, max]: readonly [number, number], random: Random) =>
  min + random() * (max - min);

interface Blink {
  isClosed: boolean;
  /** Closes still to come in this blink: 1 during a double blink. */
  closesLeft: number;
}

const OPEN: Blink = { isClosed: false, closesLeft: 0 };

/** Next blink state and how long the current one lasts. */
const stepBlink = (blink: Blink, random: Random) => {
  if (blink.isClosed) {
    return {
      delay: BLINK_MS,
      next: { isClosed: false, closesLeft: blink.closesLeft },
    };
  }
  if (blink.closesLeft > 0) {
    return {
      delay: DOUBLE_BLINK_GAP_MS,
      next: { isClosed: true, closesLeft: blink.closesLeft - 1 },
    };
  }
  return {
    delay: between(BLINK_WAIT_MS, random),
    next: {
      isClosed: true,
      closesLeft: random() < DOUBLE_BLINK_CHANCE ? 1 : 0,
    },
  };
};

type Side = "left" | "right";

interface Glance {
  look: PixyLook;
  /** Side of the next glance. Sides alternate. */
  nextSide: Side;
}

const OTHER_SIDE: Record<Side, Side> = { left: "right", right: "left" };

/** Next glance state and how long the current one lasts. */
const stepGlance = (glance: Glance, random: Random) => {
  if (glance.look === "center") {
    return {
      delay: between(GLANCE_WAIT_MS, random),
      next: { look: glance.nextSide, nextSide: OTHER_SIDE[glance.nextSide] },
    };
  }
  return {
    delay: between(GLANCE_HOLD_MS, random),
    next: { look: "center" as const, nextSide: glance.nextSide },
  };
};

/**
 * Pixy's idle behavior: blinks every 2-6 s (sometimes twice) and now and
 * then glances to one side, holds, and looks back. Glances alternate sides.
 *
 * Runs only while `isEnabled`, the app is in the foreground, and reduced
 * motion is off. Otherwise Pixy rests: eyes open, looking ahead. Each step
 * owns one timer; unmount clears it.
 *
 * `random` returns a number in [0, 1), like `Math.random`. Pass a stable
 * function; a new function restarts the current wait.
 */
export const usePixyIdle = ({
  isEnabled,
  isReducedMotion,
  random = Math.random,
}: {
  isEnabled: boolean;
  isReducedMotion: boolean;
  random?: Random;
}): PixyIdle => {
  const [isForeground, setIsForeground] = useState(
    AppState.currentState === "active"
  );
  const [blink, setBlink] = useState<Blink>(OPEN);
  const [glance, setGlance] = useState<Glance>(() => ({
    look: "center",
    nextSide: random() < 0.5 ? "left" : "right",
  }));
  const isRunning = isEnabled && !isReducedMotion && isForeground;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setIsForeground(state === "active")
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const { delay, next } = stepBlink(blink, random);
    const timer = setTimeout(() => setBlink(next), delay);
    return () => clearTimeout(timer);
  }, [isRunning, blink, random]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const { delay, next } = stepGlance(glance, random);
    const timer = setTimeout(() => setGlance(next), delay);
    return () => clearTimeout(timer);
  }, [isRunning, glance, random]);

  if (!isRunning) {
    return REST;
  }
  return { isBlinking: blink.isClosed, look: glance.look };
};

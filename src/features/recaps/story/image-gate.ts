import { createContext } from "react";

/**
 * Calls `ready` once: after the frame's layout, with no image loading.
 * Images `add` themselves before the first layout and call `done` once.
 * Create one per capture, in the Share handler.
 */
export const createImageGate = (ready: () => void) => {
  let pending = 0;
  let isLaidOut = false;
  let isReady = false;
  const check = () => {
    if (!isReady && isLaidOut && pending === 0) {
      isReady = true;
      ready();
    }
  };
  return {
    add: () => {
      pending += 1;
    },
    done: () => {
      pending -= 1;
      check();
    },
    laidOut: () => {
      isLaidOut = true;
      check();
    },
  };
};

/** One capture's image count, from `createImageGate`. */
export type ImageGate = ReturnType<typeof createImageGate>;

/** Gate of the share frame being drawn. */
export const ImageGateContext = createContext<ImageGate | null>(null);

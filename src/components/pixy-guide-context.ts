import { createContext } from "react";
import type { SharedValue } from "react-native-reanimated";

/** Pixy cheers once: happy hop and a burst of emotes, e.g. on an unlock. */
export const cheer = (guide: PixyGuide) => {
  guide.cheers.set(guide.cheers.get() + 1);
};

/**
 * Lets a control on the current slide call Cloudy over: Cloudy leaves its
 * free sky, hovers at `x`, `y`, and cheers along. Null where no Cloudy
 * flies.
 */
export interface PixyGuide {
  /** Center Pixy hovers at, in the coordinates of Pixy's layer. */
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** 0: Pixy flies its free path. 1: Pixy hovers at `x`, `y`. */
  follow: SharedValue<number>;
  /** 0 to 1: Pixy's joy. Happy eyes above 0, more emotes the higher. */
  joy: SharedValue<number>;
  /** Counts cheers: each new count makes Pixy hop with a burst of emotes. */
  cheers: SharedValue<number>;
}

/** Guide of Cloudy above the current slide. Null without Cloudy. */
export const PixyGuideContext = createContext<PixyGuide | null>(null);

/** Joy levels above 0: `SkyPixyEmotes` sends more emotes per level. */
const JOY_LEVELS = 4;

/** Joy 0 to 1 as a level, 0 to 4. */
export const getJoyLevel = (joy: number) => {
  "worklet";
  return Math.ceil(Math.min(1, Math.max(0, joy)) * JOY_LEVELS);
};

import noop from "lodash/noop";
import type { View } from "react-native";

/** A rectangle in window points. */
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Route param of the story: the tapped card's frame, `x,y,width,height`. */
export const formatStoryOrigin = (frame: Frame): string =>
  [frame.x, frame.y, frame.width, frame.height]
    .map((value) => Math.round(value))
    .join(",");

/**
 * Frame of the card that opened the story, or `null` without one, for
 * example after a notification tap or with a broken param.
 */
export const parseStoryOrigin = (value?: string): Frame | null => {
  if (value === undefined) {
    return null;
  }
  const parts = value.split(",").map(Number);
  const [x, y, width, height] = parts;
  if (
    parts.length !== 4 ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    !parts.every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { x, y, width, height };
};

/** At least part of the frame shows in the window. */
export const isFrameOnScreen = (
  frame: Frame,
  window: { width: number; height: number }
): boolean =>
  frame.width > 0 &&
  frame.height > 0 &&
  frame.x + frame.width > 0 &&
  frame.y + frame.height > 0 &&
  frame.x < window.width &&
  frame.y < window.height;

/** A mounted view, as far as measuring goes. */
type Measurable = Pick<View, "measureInWindow">;

/** Window frame of a mounted view, `null` once it is gone. */
export const measureView = (view: Measurable | null): Promise<Frame | null> =>
  // oxlint-disable-next-line promise/avoid-new -- measureInWindow reports only through its callback, so a Promise adapter is required
  new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measureInWindow((x, y, width, height) =>
      resolve({ x, y, width, height })
    );
  });

/** Story cards on screen, by `getStoryCardKey`. */
const cards = new Map<string, Measurable>();

/** One card per screen and period: the calendar and Recaps each have one. */
export const getStoryCardKey = ({
  source,
  kind,
  date,
}: {
  source: string;
  kind: "week" | "month";
  date: string;
}) => `${source}:${kind}:${date}`;

/**
 * Makes a mounted story card findable, so the story can shrink back into
 * it. Returns the cleanup for unmount.
 */
export const registerStoryCard = (key: string, view: Measurable | null) => {
  if (!view) {
    return noop;
  }
  cards.set(key, view);
  return () => {
    if (cards.get(key) === view) {
      cards.delete(key);
    }
  };
};

/**
 * Current window frame of the story card, measured again: it may have
 * moved since the tap, for example after a scroll. `null` when the card is
 * gone or off screen.
 */
export const measureStoryCard = async (
  key: string,
  window: { width: number; height: number }
): Promise<Frame | null> => {
  const frame = await measureView(cards.get(key) ?? null);
  return frame && isFrameOnScreen(frame, window) ? frame : null;
};

/** A slow release closes after this share of the screen height. */
const CLOSE_DISTANCE_RATIO = 0.2;
/** Flick speed in points per second that decides on its own. */
const CLOSE_VELOCITY = 800;

/**
 * Release decision of the drag down on a story. A fast flick down closes,
 * a fast flick back up keeps the story. A slow release closes after
 * {@link CLOSE_DISTANCE_RATIO} of the screen height.
 */
export const shouldCloseStory = ({
  translationY,
  velocityY,
  screenHeight,
}: {
  translationY: number;
  velocityY: number;
  screenHeight: number;
}): boolean => {
  "worklet";
  if (translationY <= 0) {
    return false;
  }
  if (Math.abs(velocityY) > CLOSE_VELOCITY) {
    return velocityY > 0;
  }
  return translationY > screenHeight * CLOSE_DISTANCE_RATIO;
};

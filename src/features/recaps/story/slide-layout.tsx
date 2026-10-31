import type { SharedValue } from "react-native-reanimated";
import { SlideBackdrop } from "./slides";
import type { StorySlide } from "./types";

/** Backdrop of the slide at `index`; it can carry on from the slide before. */
export const slideBackdrop = (
  story: StorySlide[],
  index: number,
  progress: SharedValue<number>
) => {
  const slide = story[index];
  return slide ? (
    <SlideBackdrop
      slide={slide}
      previous={story[index - 1]}
      progress={progress}
    />
  ) : null;
};

/** Slides that lay out the whole screen, over a photo, map, or sky. */
const FULL_SCREEN_SLIDES: ReadonlySet<StorySlide["type"]> = new Set([
  "share",
  "first-city",
  "intro",
  "best-day",
  "week-mood",
  "top-emotions",
  "close-by",
  "far-out",
]);

/**
 * Slides drawn over the whole screen: photo backdrops, content pushed to the
 * bottom, or centered. Every other slide stacks from the top.
 */
export const fillsScreen = (slide: StorySlide) =>
  FULL_SCREEN_SLIDES.has(slide.type) ||
  (slide.type === "cover" && slide.variant === "photo");

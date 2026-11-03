import { STORY_SLIDE_MS } from "./theme";
import type { StorySlide } from "./types";

/**
 * Time a slide stays on screen. The last slide and the best day stay twice
 * as long: the best day builds up from its photos after the swipe.
 */
export const getSlideDuration = (slide: StorySlide) =>
  slide.type === "share" || slide.type === "best-day"
    ? STORY_SLIDE_MS * 2
    : STORY_SLIDE_MS;

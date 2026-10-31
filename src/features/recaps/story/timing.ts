import { STORY_SLIDE_MS } from "./theme";
import type { StorySlide } from "./types";

/** Time a slide stays on screen. The last slide stays twice as long. */
export const getSlideDuration = (slide: StorySlide) =>
  slide.type === "share" ? STORY_SLIDE_MS * 2 : STORY_SLIDE_MS;

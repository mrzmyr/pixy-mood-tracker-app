import { STORY_PHOTO_MS, STORY_SLIDE_MS } from "./theme";
import type { StorySlide } from "./types";

/**
 * Time a slide stays on screen. A cover with several photos stays longer,
 * so each photo gets its moment.
 */
export const getSlideDuration = (slide: StorySlide) =>
  slide.type === "cover" && slide.variant === "photo"
    ? Math.max(STORY_SLIDE_MS, slide.photos.length * STORY_PHOTO_MS)
    : STORY_SLIDE_MS;

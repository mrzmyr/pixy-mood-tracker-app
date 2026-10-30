import {
  STORY_COVER_PHOTO_MS,
  STORY_PHOTO_MS,
  STORY_SLIDE_MS,
  STORY_SLOW_SLIDE_MS,
} from "./theme";
import type { StorySlide } from "./types";

/** Slides whose items come in one by one before the headline settles. */
const SLOW_SLIDES: ReadonlySet<StorySlide["type"]> = new Set([
  "top-emotions",
  "close-by",
  "far-out",
]);

/**
 * Time a slide stays on screen. A cover with photos stays longer, so the
 * photos get a moment: each full-screen photo its own share. Slides whose
 * items come in one by one stay longer too.
 */
export const getSlideDuration = (slide: StorySlide) => {
  // The last slide is the one to keep: twice the time of a normal slide.
  if (slide.type === "share") {
    return STORY_SLIDE_MS * 2;
  }
  if (SLOW_SLIDES.has(slide.type)) {
    return STORY_SLOW_SLIDE_MS;
  }
  if (slide.type === "best-day" && slide.photos.length > 1) {
    return Math.max(STORY_COVER_PHOTO_MS, slide.photos.length * STORY_PHOTO_MS);
  }
  if (slide.type !== "cover" || slide.variant === "pixels") {
    return STORY_SLIDE_MS;
  }
  return slide.variant === "photo"
    ? Math.max(STORY_COVER_PHOTO_MS, slide.photos.length * STORY_PHOTO_MS)
    : STORY_COVER_PHOTO_MS;
};

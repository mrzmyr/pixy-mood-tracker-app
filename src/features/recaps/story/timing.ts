import { STORY_COVER_PHOTO_MS, STORY_PHOTO_MS, STORY_SLIDE_MS } from "./theme";
import type { StorySlide } from "./types";

/**
 * Time a slide stays on screen. A cover with photos stays longer, so the
 * photos get a moment: each full-screen photo its own share.
 */
export const getSlideDuration = (slide: StorySlide) => {
  if (slide.type !== "cover" || slide.variant === "pixels") {
    return STORY_SLIDE_MS;
  }
  return slide.variant === "photo"
    ? Math.max(STORY_COVER_PHOTO_MS, slide.photos.length * STORY_PHOTO_MS)
    : STORY_COVER_PHOTO_MS;
};

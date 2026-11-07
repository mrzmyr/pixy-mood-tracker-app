import { STORY_SLIDE_MS } from "./theme";
import type { StorySlide } from "./types";

/**
 * Time a slide stays on screen, or `null` when it waits for the user. The
 * last slide (`share`) waits, so the user can look at the card.
 */
export const getSlideDuration = (slide: StorySlide): number | null =>
  slide.type === "share" ? null : STORY_SLIDE_MS * 2;

import type { PeriodKind } from "../types";
import { STORY_SLIDE_MS } from "./theme";
import type { StorySlide } from "./types";

/**
 * Time a slide stays on screen, or `null` when it waits for the user. Month
 * slides stay twice as long as week slides: they hold more days to read.
 * The best day gets the month time in any story: it builds up from its
 * photos after the swipe. The last slide (`share`) waits, so the user can
 * look at the card.
 */
export const getSlideDuration = (
  slide: StorySlide,
  kind: PeriodKind
): number | null => {
  if (slide.type === "share") {
    return null;
  }
  return kind === "month" || slide.type === "best-day"
    ? STORY_SLIDE_MS * 2
    : STORY_SLIDE_MS;
};

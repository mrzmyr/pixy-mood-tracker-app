import type { StorySlide } from "./types";

/**
 * Slides drawn over the whole screen on the sky: content centered or pushed
 * to the bottom. Every other slide stacks from the top.
 */
export const fillsScreen = (slide: StorySlide) =>
  slide.type === "share" || slide.type === "intro";

import type { StoryTheme } from "./theme";
import type { StorySlide } from "./types";

/** Slide background. Photo slides draw their own photo. */
export const getSlideTheme = (slide: StorySlide): StoryTheme => {
  if (slide.type === "cover" && slide.variant === "photo") {
    return "photo";
  }
  if (slide.type === "first-city" && slide.photo) {
    return "photo";
  }
  return slide.type === "hard-pattern" || slide.type === "quiz"
    ? "paper"
    : "night";
};

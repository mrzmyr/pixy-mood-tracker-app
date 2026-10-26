import type { StoryTheme } from "./theme";
import type { StorySlide } from "./types";

/**
 * Slide background. Photo slides draw their own photo. Dark mode never shows
 * a white `paper` slide: it turns `night`. The share slide is always
 * `night`, so its card stands out in both modes.
 */
export const getSlideTheme = (
  slide: StorySlide,
  isDark = false
): StoryTheme => {
  if (slide.type === "cover" && slide.variant === "photo") {
    return "photo";
  }
  if (slide.type === "first-city" && slide.photo) {
    return "photo";
  }
  const isPaper =
    slide.type === "hard-pattern" ||
    slide.type === "quiz" ||
    slide.type === "thanks";
  return isPaper && !isDark ? "paper" : "night";
};

import type { StoryTheme } from "./theme";
import type { StorySlide } from "./types";

/**
 * Slide background. Photo slides draw their own photo. Dark mode never shows
 * a white `paper` slide: it turns `night`. Map and sky slides, the share
 * slide too, follow the app's light or dark mode.
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
  if (slide.type === "best-day" && slide.photo) {
    return "photo";
  }
  // The map and the sky follow the app: light by day, dark at night.
  const isMapOrSky =
    slide.type === "best-day" ||
    slide.type === "week-mood" ||
    slide.type === "top-emotions" ||
    slide.type === "share" ||
    slide.type === "close-by" ||
    slide.type === "far-out";
  const isPaper =
    isMapOrSky || slide.type === "hard-pattern" || slide.type === "quiz";
  return isPaper && !isDark ? "paper" : "night";
};

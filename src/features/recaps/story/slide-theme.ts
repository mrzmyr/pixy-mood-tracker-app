import type { StoryTheme } from "./theme";
import type { StorySlide } from "./types";

/**
 * Slide background. Sky slides (intro, share) follow the app's light or dark
 * mode. Every other slide is `night`.
 */
export const getSlideTheme = (slide: StorySlide, isDark = false): StoryTheme =>
  (slide.type === "intro" || slide.type === "share") && !isDark
    ? "paper"
    : "night";

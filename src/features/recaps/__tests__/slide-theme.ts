import { getSlideTheme } from "../story/slide-theme";
import type { StorySlide } from "../story/types";

/** Fields of a slide `getSlideTheme` reads. */
interface ThemeFields {
  type: string;
  variant?: string;
}

// SAFETY: getSlideTheme reads only `type`, `variant`, and `photo`.
const slide = (fields: ThemeFields) => fields as StorySlide;

describe("story slide theme", () => {
  test("light mode keeps white slides for quizzes, patterns, and sharing", () => {
    expect(getSlideTheme(slide({ type: "quiz" }))).toBe("paper");
    expect(getSlideTheme(slide({ type: "share" }))).toBe("paper");
    expect(getSlideTheme(slide({ type: "hard-pattern" }))).toBe("paper");
    expect(getSlideTheme(slide({ type: "coming-up" }))).toBe("night");
  });

  test("dark mode never shows a white slide", () => {
    for (const type of ["quiz", "share", "hard-pattern", "coming-up"]) {
      expect(getSlideTheme(slide({ type }), true)).toBe("night");
    }
  });

  test("photo slides stay photo slides in both modes", () => {
    const cover = slide({ type: "cover", variant: "photo" });

    expect(getSlideTheme(cover)).toBe("photo");
    expect(getSlideTheme(cover, true)).toBe("photo");
  });
});

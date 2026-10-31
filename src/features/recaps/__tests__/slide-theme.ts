import { getSlideTheme } from "../story/slide-theme";

describe("story slide theme", () => {
  test("sky slides follow light mode, other slides stay night", () => {
    expect(getSlideTheme({ type: "intro" })).toBe("paper");
    expect(getSlideTheme({ type: "share", photos: [] })).toBe("paper");
    expect(getSlideTheme({ type: "positive-tags", rows: [] })).toBe("night");
  });

  test("dark mode never shows a white slide", () => {
    expect(getSlideTheme({ type: "intro" }, true)).toBe("night");
    expect(getSlideTheme({ type: "share", photos: [] }, true)).toBe("night");
  });
});

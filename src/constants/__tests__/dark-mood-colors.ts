import chroma, { contrast } from "chroma-js";
import scales, { toDarkMood } from "@/constants/colors/scales";

const luminance = (color: string) => chroma(color).luminance();

describe("dark mood colors", () => {
  test("strong moods glow brighter than mild ones on every scale", () => {
    for (const scale of Object.values(scales.dark)) {
      expect(luminance(scale.extremely_good.background)).toBeGreaterThan(
        luminance(scale.good.background)
      );
      expect(luminance(scale.extremely_bad.background)).toBeGreaterThan(
        luminance(scale.bad.background)
      );
    }
  });

  test("mild moods stay visible on the dark background", () => {
    for (const scale of Object.values(scales.dark)) {
      expect(
        contrast(scale.neutral.background, scale.empty.background)
      ).toBeGreaterThan(1.3);
    }
  });

  test("keeps grays gray", () => {
    const [, colorfulness] = chroma(toDarkMood("#e5e5e5")).oklch();
    expect(colorfulness).toBeLessThan(0.01);
  });
});

import { getAccent } from "@/constants/Colors/accent";

const luminance = (color: string) => {
  const hex =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const themes = (os: "ios" | "android") => {
  const a = getAccent(os);
  return {
    light: {
      tint: a.tintLight,
      background: "#f5f5f5",
      fill: a.tintLight,
    },
    dark: { tint: a.tintDark, background: "#000", fill: a.buttonDark },
  };
};

describe("accent colors", () => {
  it.each(["light", "dark"] as const)(
    "Android %s: white button text reads on primary fill",
    (mode) => {
      expect(
        contrast("#fff", themes("android")[mode].fill)
      ).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(["light", "dark"] as const)(
    "Android %s: tint and link text read on the screen background",
    (mode) => {
      const t = themes("android")[mode];
      expect(contrast(t.tint, t.background)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(["light", "dark"] as const)(
    "Android %s: accents are plain hex strings, safe for color math",
    (mode) => {
      const t = themes("android")[mode];
      for (const value of [t.tint, t.fill]) {
        expect(value).toMatch(/^#[0-9a-f]{6}$/iu);
      }
    }
  );

  it("iOS keeps system blue", () => {
    const { light, dark } = themes("ios");
    expect(light.tint).toBe("#007aff");
    expect(dark.tint).toBe("#0a84ff");
    expect(dark.fill).toBe("#0a84ff");
  });
});

import type { IColors } from "@/constants/Colors";

interface Themes {
  light: IColors;
  dark: IColors;
}

const loadColors = (os: "ios" | "android"): Themes => {
  const themes: Themes[] = [];
  jest.isolateModules(() => {
    const { Platform } = require("react-native");
    Platform.OS = os;
    themes.push(require("@/constants/Colors").default);
  });
  return themes[0];
};

describe("danger color", () => {
  it("uses iOS systemRed on iOS", () => {
    const c = loadColors("ios");
    expect(c.light.danger).toBe("#FF3B30");
    expect(c.dark.danger).toBe("#FF453A");
  });

  it("uses Material 3 error on Android", () => {
    const c = loadColors("android");
    expect(c.light.danger).toBe("#BA1A1A");
    expect(c.dark.danger).toBe("#FFB4AB");
  });

  it("colors danger buttons with the danger token", () => {
    const c = loadColors("ios");
    expect(c.light.dangerButtonText).toBe(c.light.danger);
    expect(c.dark.dangerButtonText).toBe(c.dark.danger);
  });
});

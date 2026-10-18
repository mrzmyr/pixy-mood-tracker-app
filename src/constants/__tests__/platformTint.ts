import { contrast, valid } from "chroma-js";

import type { IColors } from "@/constants/Colors";

type OS = "ios" | "android" | "web";
type Scheme = "light" | "dark";

const OSES: OS[] = ["ios", "android", "web"];
const SCHEMES: Scheme[] = ["light", "dark"];

const loadColors = (os: OS): Record<Scheme, IColors> => {
  const themes: Record<Scheme, IColors>[] = [];
  jest.isolateModules(() => {
    const { Platform } = require("react-native");
    Platform.OS = os;
    themes.push(require("@/constants/Colors").default);
  });
  return themes[0];
};

/** Keys that paint chrome in the tint color. */
const TINT_KEYS = [
  "tint",
  "link",
  "logActionBorder",
  "tabsIconActive",
  "tabsTextActive",
  "linkButtonTextPrimary",
  "primaryButtonBackground",
  "primaryButtonBorder",
  "checkboxCheckedBackground",
  "checkboxCheckedBorder",
  "onboardingPrivacyBadgeBackground",
] as const;

/** Foreground key drawn on top of a tint background. */
const ON_TINT_PAIRS = [
  ["primaryButtonBackground", "primaryButtonText"],
  ["checkboxCheckedBackground", "checkboxCheckedText"],
  ["onboardingPrivacyBadgeBackground", "onboardingPrivacyBadgeVector"],
] as const;

describe("platform tint", () => {
  it("does not use the iOS system blue on Android", () => {
    const ios = loadColors("ios");
    const android = loadColors("android");
    for (const scheme of SCHEMES) {
      expect(android[scheme].tint).not.toBe(ios[scheme].tint);
    }
  });

  it.each(OSES)("paints all tint chrome in one color on %s", (os) => {
    const themes = loadColors(os);
    for (const scheme of SCHEMES) {
      const values = new Set(TINT_KEYS.map((key) => themes[scheme][key]));
      expect([...values]).toEqual([themes[scheme].tint]);
    }
  });

  it.each(OSES)(
    "keeps tint colors as plain strings that chroma-js parses on %s",
    (os) => {
      const themes = loadColors(os);
      for (const scheme of SCHEMES) {
        for (const key of TINT_KEYS) {
          const value = themes[scheme][key];
          expect(value).toEqual(expect.any(String));
          expect(valid(value)).toBe(true);
        }
      }
    }
  );

  // iOS systemBlue with white text reaches 3.65:1 in dark mode, so iOS
  // keeps the 3:1 floor. Android Material 3 pairs reach WCAG AA.
  const MIN_CONTRAST: Record<OS, number> = { ios: 3, android: 4.5, web: 3 };

  it.each(OSES)("keeps text on tint readable on %s", (os) => {
    const themes = loadColors(os);
    for (const scheme of SCHEMES) {
      for (const [background, foreground] of ON_TINT_PAIRS) {
        const ratio = contrast(
          themes[scheme][background],
          themes[scheme][foreground]
        );
        expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST[os]);
      }
    }
  });

  it("keeps brand colors the same on every platform", () => {
    const ios = loadColors("ios");
    const android = loadColors("android");
    for (const scheme of SCHEMES) {
      expect(android[scheme].scales).toEqual(ios[scheme].scales);
      expect(android[scheme].tags).toEqual(ios[scheme].tags);
    }
  });
});

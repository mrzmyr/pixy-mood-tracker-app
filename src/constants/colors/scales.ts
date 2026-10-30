import chroma from "chroma-js";
import colors from "@/constants/colors/tailwind-colors";

interface IScaleMood {
  background: string;
  text: string;
  textSecondary: string;
}

/** Colors for every mood rating plus the empty (no entry) state. */
export interface IScale {
  extremely_good: IScaleMood;
  very_good: IScaleMood;
  good: IScaleMood;
  neutral: IScaleMood;
  bad: IScaleMood;
  very_bad: IScaleMood;
  extremely_bad: IScaleMood;
  empty: { background: string; border: string; text: string };
}

/**
 * Scales keyed by `scaleType` (for example `ColorBrew-RdYlGn`). Keys are
 * persisted in settings, so do not rename them.
 */
export interface IScaleColors {
  [key: string]: IScale;
}

const getScaleMood = (color: string): IScaleMood => ({
  background: color,
  text:
    chroma(color).luminance() > 0.45
      ? chroma(color).darken(4).hex()
      : chroma(color).brighten(2.5).hex(),
  textSecondary:
    chroma(color).luminance() > 0.45
      ? chroma(color).darken(2.5).hex()
      : chroma(color).brighten(4).hex(),
});

const getScale = (scale: string[]): IScale => {
  const [
    extremely_good,
    very_good,
    good,
    neutral,
    bad,
    very_bad,
    extremely_bad,
    empty,
  ] = scale;

  return {
    extremely_good: getScaleMood(extremely_good),
    very_good: getScaleMood(very_good),
    good: getScaleMood(good),
    neutral: getScaleMood(neutral),
    bad: getScaleMood(bad),
    very_bad: getScaleMood(very_bad),
    extremely_bad: getScaleMood(extremely_bad),
    empty: {
      background: empty,
      border:
        chroma(empty).luminance() > 0.5
          ? chroma(empty).darken(0.5).hex()
          : chroma(empty).brighten(1.5).hex(),
      text:
        chroma(empty).luminance() > 0.5
          ? chroma(empty).darken(3).hex()
          : chroma(empty).brighten(4).hex(),
    },
  };
};

/**
 * Mood colors per scale, `extremely_good` to `extremely_bad`. The light
 * theme uses them as is; the dark theme translates them with
 * {@link toDarkMood}.
 */
const MOODS = {
  "ColorBrew-RdYlGn": [
    colors.emerald[600],
    colors.emerald[400],
    colors.emerald[200],
    colors.neutral[200],
    colors.orange[100],
    colors.orange[300],
    colors.red[500],
  ],
  "ColorBrew-RdYlGn-old": [
    "#006837",
    "#1a9850",
    "#91cf60",
    "#ffffbf",
    "#fee08b",
    "#fc8d59",
    "#d73027",
  ],
  "ColorBrew-PuOr": [
    "#542788",
    "#998ec3",
    "#d8daeb",
    colors.neutral[200],
    "#fee0b6",
    "#f1a340",
    "#b35806",
  ],
  "ColorBrew-BrBG": [
    "#01665e",
    "#5ab4ac",
    "#c7eae5",
    colors.neutral[200],
    "#f6e8c3",
    "#d8b365",
    "#8c510a",
  ],
  "ColorBrew-RdYG": [
    "#4d9221",
    "#a1d76a",
    "#e6f5d0",
    colors.neutral[200],
    "#fddbc7",
    "#ef8a62",
    "#b2182b",
  ],
};

/** Dark mood colors stay between these OKLCH lightness values. */
const DARK_LIGHTNESS_MIN = 0.4;
const DARK_LIGHTNESS_MAX = 0.8;

/**
 * Highest OKLCH chroma that still shows in sRGB at this lightness and hue.
 * Binary search: chroma-js flags colors outside sRGB as clipped.
 */
const getMaxChroma = (lightness: number, hue: number) => {
  let low = 0;
  let high = 0.4;
  for (let step = 0; step < 20; step += 1) {
    const middle = (low + high) / 2;
    if (chroma.oklch(lightness, middle, hue).clipped()) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return low;
};

/**
 * Mood color for dark mode, in OKLCH: same hue, lightness reversed. In light
 * mode a mild mood is pale, close to the white background, and a strong mood
 * is deep. In dark mode a mild mood is dim, close to the black background,
 * and a strong mood glows. Chroma keeps its share of the most the hue can
 * show at each lightness, so colors stay as vivid and inside sRGB. Rule:
 * DESIGN.md, Mood colors.
 */
export const toDarkMood = (color: string) => {
  const [lightness, chromaValue, rawHue] = chroma(color).oklch();
  const hue = Number.isNaN(rawHue) ? 0 : rawHue;
  const vividness = Math.min(
    1,
    chromaValue / Math.max(getMaxChroma(lightness, hue), 0.001)
  );
  // Reversed: pale (L 0.95) lands at 0.4, deep (L 0.56) at 0.8.
  const darkLightness = Math.min(
    DARK_LIGHTNESS_MAX,
    Math.max(DARK_LIGHTNESS_MIN, 1.37 - 1.02 * lightness)
  );
  return chroma
    .oklch(darkLightness, vividness * getMaxChroma(darkLightness, hue), hue)
    .hex();
};

const mapScales = (
  toColor: (color: string) => string,
  empty: string
): IScaleColors =>
  Object.fromEntries(
    Object.entries(MOODS).map(([key, moods]) => [
      key,
      getScale([...moods.map(toColor), empty]),
    ])
  );

const light = mapScales((color) => color, colors.neutral[100]);
const dark = mapScales(toDarkMood, colors.neutral[800]);

interface ThemeScales {
  dark: IScaleColors;
  light: IScaleColors;
}

const scales: ThemeScales = {
  dark,
  light,
};

export default scales;

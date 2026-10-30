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

/** Dark mood colors stay between these LCH lightness values. */
const DARK_LIGHTNESS_MIN = 30;
const DARK_LIGHTNESS_MAX = 78;
/** Below this LCH chroma a color counts as gray and stays gray. */
const GRAY_CHROMA = 8;
/** Chroma floor for colored dark moods, so dim moods keep their hue. */
const DARK_CHROMA_MIN = 32;

/**
 * Mood color for dark mode: same hue, lightness flipped. In light mode a
 * mild mood is pale, close to the white background, and a strong mood is
 * deep. In dark mode a mild mood is dim, close to the black background, and
 * a strong mood glows. Rule: DESIGN.md, Mood colors.
 */
export const toDarkMood = (color: string) => {
  const [lightness, chromaValue, hue] = chroma(color).lch();
  const isGray = chromaValue < GRAY_CHROMA;
  return chroma
    .lch(
      Math.min(
        DARK_LIGHTNESS_MAX,
        Math.max(DARK_LIGHTNESS_MIN, 125 - lightness)
      ),
      isGray ? chromaValue : Math.max(chromaValue, DARK_CHROMA_MIN),
      Number.isNaN(hue) ? 0 : hue
    )
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

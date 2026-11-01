import chroma from "chroma-js";
import colors from "@/constants/colors/tailwind-colors";

interface IScaleMood {
  background: string;
  text: string;
  textSecondary: string;
  /** Outline for marks and pixels in this color: same hue, a step apart. */
  border: string;
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

/** Below this LCH chroma a color is gray: saturating it would tint it. */
const GRAY_CHROMA = 5;

/**
 * Outline shade of a mood color: a step darker on light colors, a step
 * lighter on dark ones, never near black. Saturation goes up with the step
 * so the shade stays colorful instead of dull ("Refactoring UI": don't let
 * lightness kill your saturation).
 */
const getBorder = (color: string) => {
  const isGray = chroma(color).lch()[1] < GRAY_CHROMA;
  const shade =
    chroma(color).luminance() > 0.35
      ? chroma(color).darken(0.8)
      : chroma(color).brighten(1);
  return (isGray ? shade : shade.saturate(0.6)).hex();
};

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
  border: getBorder(color),
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

const light = {
  "ColorBrew-RdYlGn": getScale([
    colors.emerald[600],
    colors.emerald[400],
    colors.emerald[200],
    colors.neutral[200],
    colors.orange[100],
    colors.orange[300],
    colors.red[500],
    colors.neutral[100],
  ]),
  "ColorBrew-RdYlGn-old": getScale([
    "#006837",
    "#1a9850",
    "#91cf60",
    "#ffffbf",
    "#fee08b",
    "#fc8d59",
    "#d73027",
    colors.neutral[100],
  ]),
  "ColorBrew-PuOr": getScale([
    "#542788",
    "#998ec3",
    "#d8daeb",
    colors.neutral[200],
    "#fee0b6",
    "#f1a340",
    "#b35806",
    colors.neutral[100],
  ]),
  "ColorBrew-BrBG": getScale([
    "#01665e",
    "#5ab4ac",
    "#c7eae5",
    colors.neutral[200],
    "#f6e8c3",
    "#d8b365",
    "#8c510a",
    colors.neutral[100],
  ]),
  "ColorBrew-RdYG": getScale([
    "#4d9221",
    "#a1d76a",
    "#e6f5d0",
    colors.neutral[200],
    "#fddbc7",
    "#ef8a62",
    "#b2182b",
    colors.neutral[100],
  ]),
} satisfies IScaleColors;

const dark = {
  "ColorBrew-RdYlGn": getScale([
    colors.emerald[600],
    colors.emerald[400],
    colors.emerald[200],
    colors.neutral[100],
    colors.orange[100],
    colors.orange[300],
    colors.red[500],
    colors.neutral[800],
  ]),
  "ColorBrew-RdYlGn-old": getScale([
    "#006837",
    "#1a9850",
    "#91cf60",
    "#ffffbf",
    "#fee08b",
    "#fc8d59",
    "#d73027",
    colors.neutral[800],
  ]),
  "ColorBrew-PuOr": getScale([
    "#542788",
    "#998ec3",
    "#d8daeb",
    colors.neutral[200],
    "#fee0b6",
    "#f1a340",
    "#b35806",
    colors.neutral[800],
  ]),
  "ColorBrew-BrBG": getScale([
    "#01665e",
    "#5ab4ac",
    "#c7eae5",
    colors.neutral[200],
    "#f6e8c3",
    "#d8b365",
    "#8c510a",
    colors.neutral[800],
  ]),
  "ColorBrew-RdYG": getScale([
    "#4d9221",
    "#a1d76a",
    "#e6f5d0",
    colors.neutral[200],
    "#fddbc7",
    "#ef8a62",
    "#b2182b",
    colors.neutral[800],
  ]),
} satisfies IScaleColors;

interface ThemeScales {
  dark: IScaleColors;
  light: IScaleColors;
}

const scales: ThemeScales = {
  dark,
  light,
};

export default scales;

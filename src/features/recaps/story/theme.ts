/**
 * Story colors: `night` slides on black, `paper` slides on white, `photo`
 * over a photo. In dark mode `paper` slides turn `night` (`getSlideTheme`),
 * so no slide flashes white.
 */
export type StoryTheme = "night" | "paper" | "photo";

interface StoryPalette {
  background: string;
  text: string;
  muted: string;
  /** Eyebrow above the title. */
  accent: string;
  /** Tiles, empty pixels, tracks. */
  surface: string;
  /** Pixel of a day without check-in. */
  empty: string;
}

/** Colors per slide theme. Fixed hex values: slides ignore the app theme. */
export const STORY_PALETTE: Record<StoryTheme, StoryPalette> = {
  night: {
    background: "#0A0A0A",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.6)",
    accent: "#34D399",
    surface: "#1C1C1E",
    empty: "#262626",
  },
  paper: {
    background: "#FFFFFF",
    text: "#0A0A0A",
    muted: "#71717A",
    accent: "#059669",
    surface: "#F4F4F5",
    empty: "#EEEEEE",
  },
  photo: {
    background: "#000000",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.8)",
    accent: "#34D399",
    surface: "rgba(0,0,0,0.45)",
    empty: "rgba(255,255,255,0.25)",
  },
};

/** Fixed story type sizes. Capped font scaling keeps slides on one screen. */
export const STORY_TYPE = {
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  number: {
    fontSize: 96,
    lineHeight: 96,
    fontWeight: "800",
    letterSpacing: -4,
  },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400", letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 17, fontWeight: "600", letterSpacing: 0 },
} as const;

/** Largest font scale on slides. Bigger text would push content off screen. */
export const STORY_MAX_FONT_SCALE = 1.3;

/** Time per slide before it moves on, in milliseconds. */
export const STORY_SLIDE_MS = 7000;

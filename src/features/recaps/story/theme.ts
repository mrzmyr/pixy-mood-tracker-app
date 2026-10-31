import { getTextRevealDuration } from "@/components/text-reveal-parts";

/**
 * Story colors: `paper` text on the day sky, `night` on the night sky
 * (`getStoryTheme`). `photo` over a photo.
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
  /** See-through fill on the sky: tracks, empty pixels. Adapts to the sky behind. */
  glass: string;
  /** 1 pt outline of `glass`, so it holds on bright clouds. */
  glassBorder: string;
}

/** Space between the screen edge and slide content. */
export const STORY_SCREEN_PADDING = 24;

/** Space between a slide title and its content. */
export const STORY_TITLE_GAP = 40;

/** Space between blocks of slide content. */
export const STORY_BLOCK_GAP = 28;

/** Theme of every slide: text on the sky follows the app's light or dark mode. */
export const getStoryTheme = (isDark: boolean): StoryTheme =>
  isDark ? "night" : "paper";

/** Colors per slide theme. Fixed hex values: slides ignore the app theme. */
export const STORY_PALETTE: Record<StoryTheme, StoryPalette> = {
  night: {
    background: "#0A0A0A",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.6)",
    accent: "#34D399",
    surface: "#1C1C1E",
    empty: "#262626",
    glass: "rgba(255,255,255,0.1)",
    glassBorder: "rgba(255,255,255,0.18)",
  },
  paper: {
    background: "#FFFFFF",
    text: "#0A0A0A",
    muted: "#71717A",
    accent: "#059669",
    surface: "#F4F4F5",
    empty: "#EEEEEE",
    glass: "rgba(255,255,255,0.35)",
    glassBorder: "rgba(255,255,255,0.75)",
  },
  photo: {
    background: "#000000",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.8)",
    accent: "#34D399",
    surface: "rgba(0,0,0,0.45)",
    empty: "rgba(255,255,255,0.25)",
    glass: "rgba(255,255,255,0.15)",
    glassBorder: "rgba(255,255,255,0.3)",
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
    fontWeight: "500",
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

/** Pause before a slide title starts to write itself, as on the intro. */
export const TITLE_DELAY_MS = 500;

/** Time from slide start until `title` has written itself. */
export const titleRevealEnd = (title: string) =>
  TITLE_DELAY_MS + getTextRevealDuration(title);

/** Time `text` takes to write itself word by word. */
export const revealTextMs = (text: string) =>
  getTextRevealDuration(text, "word");

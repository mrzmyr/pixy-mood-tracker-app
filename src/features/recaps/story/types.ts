import type { LogPhoto } from "@/types";
import type { DateKey } from "../types";

/** Photo of a story slide and the day it comes from. */
export interface StoryPhoto {
  date: DateKey;
  photo: LogPhoto;
}

/**
 * Cover of the story: the check-in count over the period's pixel grid.
 * Good days with a photo show it in their pixel.
 */
export interface CoverSlide {
  type: "cover";
  /** Days with a check-in. */
  checkIns: number;
  /** Good days with a photo. Empty without photos. */
  photos: StoryPhoto[];
}

/** First slide of the week story: the sky, cloud Pixy, and a kind welcome. */
export interface IntroSlide {
  type: "intro";
}

/** One row of a tags slide: a tag, its check-in days, and its mood effect. */
export interface TagEffectRow {
  tagId: string;
  days: number;
  /** Mood steps above (positive) or below (negative) days without the tag. */
  delta: number;
}

/** Tags whose days felt lighter than days without them. Biggest first. */
export interface PositiveTagsSlide {
  type: "positive-tags";
  rows: TagEffectRow[];
}

/** Tags whose days felt heavier than days without them. Biggest first. */
export interface NegativeTagsSlide {
  type: "negative-tags";
  rows: TagEffectRow[];
}

/**
 * The user in the middle, people around like planets. Closer and bigger:
 * more connected days. Counts only, never how the days felt.
 */
export interface OrbitSlide {
  type: "orbit";
  /** Most connected days first. */
  people: { personId: string; days: number }[];
}

/** Days still to come in the year, and days without a check-in so far. */
export interface ComingUpSlide {
  type: "coming-up";
  year: number;
  left: number;
  missed: number;
}

/**
 * Last slide, on the sky: thanks for looking back, and a card to send to
 * someone close, with the period's days and 3 photos when it has 3+ bright
 * photo days. `photos` is the shuffle pool, brightest first.
 */
export interface ShareSlide {
  type: "share";
  photos: StoryPhoto[];
}

/** One page of a story. Each type has one renderer. */
export type StorySlide =
  | IntroSlide
  | CoverSlide
  | PositiveTagsSlide
  | NegativeTagsSlide
  | OrbitSlide
  | ComingUpSlide
  | ShareSlide;

/** Key of a slide type. */
export type StorySlideType = StorySlide["type"];

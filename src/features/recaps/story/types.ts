import type { LogPhoto } from "@/types";
import type { DateKey } from "../types";
import type { QuizSlide } from "./quiz";

/** Photo of a story slide and the day it comes from. */
export interface StoryPhoto {
  date: DateKey;
  photo: LogPhoto;
}

/**
 * Cover of the story. `photos`: a month with 7+ photo days, the grid shows
 * them. `photo`: fewer photo days, or any week with photos: up to 5 photos
 * fill the screen one after another. `pixels`: no photos, a big check-in
 * count over the grid.
 */
export interface CoverSlide {
  type: "cover";
  variant: "photos" | "photo" | "pixels";
  /** Days with a check-in. */
  checkIns: number;
  /**
   * Good days with a photo: every one for the grid, the brightest first for
   * the full-screen photos. Empty without photos.
   */
  photos: StoryPhoto[];
}

/** One tag on the same weekday, week after week. */
export interface WeekdayHabitSlide {
  type: "weekday-habit";
  tagId: string;
  /** 0 Sunday to 6 Saturday, as in `dayjs().day()`. */
  weekday: number;
  /** Days of that weekday with the tag. */
  hits: number;
  /** Days of that weekday in the month. */
  total: number;
  /** Same weekday in the month before, `null` without check-ins then. */
  previous: { hits: number; total: number } | null;
}

/** The month's most used tags, each as a row of days. */
export interface MadeOfSlide {
  type: "made-of";
  /** Most days first. */
  tagIds: string[];
}

/** Tags whose days felt lighter than days without them. */
export interface LiftedSlide {
  type: "lifted";
  rows: { tagId: string; days: number; delta: number }[];
}

/** People connected on the most days, with those days as pixels. */
export interface PeopleSlide {
  type: "people";
  people: { personId: string; days: DateKey[] }[];
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

/** A tag that came up on harder days far more than on other days. */
export interface HardPatternSlide {
  type: "hard-pattern";
  tagId: string;
  /** Harder days of the month, oldest first. */
  hardDates: DateKey[];
  /** Harder days with the tag. */
  tagHard: number;
  /** Other check-in days. */
  otherDays: number;
  /** Other days with the tag. */
  tagOther: number;
}

/** First check-in in a city far from every earlier place. */
export interface FirstCitySlide {
  type: "first-city";
  city: string;
  date: DateKey;
  /** Distance from home, `null` without a home city yet. */
  km: number | null;
  photo: StoryPhoto | null;
}

/** Tags used on more or fewer days than in the month before. */
export interface VsLastSlide {
  type: "vs-last";
  /** First day of the month before. */
  previousStart: DateKey;
  rows: { tagId: string; days: number; change: number }[];
}

/** One photo per week of the month. */
export interface MomentsSlide {
  type: "moments";
  /** Weeks of the month with up to 4 bright photos each, brightest first. */
  weeks: { start: DateKey; end: DateKey; photos: StoryPhoto[] }[];
}

/** Good emotions and tags back after a break, as on the came-back card. */
export interface CameBackSlide {
  type: "came-back";
  emotions: { emotion: string; lastDate: DateKey }[];
  tags: { tagId: string; days: number; weeks: number }[];
}

/** Days still to come in the year, and days without a check-in so far. */
export interface ComingUpSlide {
  type: "coming-up";
  year: number;
  left: number;
  missed: number;
}

/**
 * Second to last slide: Pixy thanks the user for looking back and says why
 * it helps. The story screen sends confetti when it shows.
 */
export interface ThanksSlide {
  type: "thanks";
}

/**
 * Last slide: a card to send to someone close, with the period's days and 3
 * photos when it has 3+ bright photo days. `photos` is the shuffle pool,
 * brightest first.
 */
export interface ShareSlide {
  type: "share";
  photos: StoryPhoto[];
}

/** One page of the month story. Each type has one renderer. */
export type StorySlide =
  | CoverSlide
  | WeekdayHabitSlide
  | MadeOfSlide
  | LiftedSlide
  | PeopleSlide
  | OrbitSlide
  | HardPatternSlide
  | FirstCitySlide
  | VsLastSlide
  | MomentsSlide
  | CameBackSlide
  | ComingUpSlide
  | QuizSlide
  | ThanksSlide
  | ShareSlide;

/** Key of a slide type. */
export type StorySlideType = StorySlide["type"];

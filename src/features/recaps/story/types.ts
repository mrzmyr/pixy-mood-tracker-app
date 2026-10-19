import type { LogPhoto } from "@/types";
import type { DateKey } from "../types";

/** Photo of a story slide and the day it comes from. */
export interface StoryPhoto {
  date: DateKey;
  photo: LogPhoto;
}

/**
 * Cover of the month story. `photos`: 7+ photo days, the grid shows them.
 * `photo`: 1 to 6 photo days, one photo fills the screen. `pixels`: no
 * photos, a big check-in count over the grid.
 */
export interface CoverSlide {
  type: "cover";
  variant: "photos" | "photo" | "pixels";
  /** Days with a check-in. */
  checkIns: number;
  /** Good days with a photo, for the grid. Empty without photos. */
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
  weeks: { start: DateKey; end: DateKey; photo: StoryPhoto | null }[];
}

/** Days still to come in the year, and days without a check-in so far. */
export interface ComingUpSlide {
  type: "coming-up";
  year: number;
  left: number;
  missed: number;
}

/** One page of the month story. Each type has one renderer. */
export type StorySlide =
  | CoverSlide
  | WeekdayHabitSlide
  | MadeOfSlide
  | LiftedSlide
  | PeopleSlide
  | HardPatternSlide
  | FirstCitySlide
  | VsLastSlide
  | MomentsSlide
  | ComingUpSlide;

/** Key of a slide type. */
export type StorySlideType = StorySlide["type"];

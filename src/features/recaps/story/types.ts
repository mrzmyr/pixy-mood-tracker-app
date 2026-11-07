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

/**
 * Guess before the orbit: which of 3 or 4 people had the most connected
 * days. Days show on the tiles after the answer.
 */
export interface PeopleQuizSlide {
  type: "people-quiz";
  /** People and their connected days, in a stable shuffled order. */
  people: { personId: string; days: number }[];
  /** Person with the most connected days. Always a clear winner. */
  answer: string;
  /** What stood out on the answer's days, shown after the guess. */
  insight: QuizInsight | null;
}

/**
 * A tag or a city on `days` of the answer's connected days. Says what came
 * up on those days, never how the connection felt.
 */
export type QuizInsight =
  | { kind: "tag"; tagId: string; days: number }
  | { kind: "place"; city: string; days: number };

/**
 * People connected for the first time ever in the month, in the order they
 * arrived. Counts and dates only, never how the days felt.
 */
export interface NewPeopleSlide {
  type: "new-people";
  /** First connected day first. */
  people: { personId: string; firstDate: DateKey }[];
}

/**
 * Best day of the month: the highest mean rating above neutral. Locked at
 * first: the user swipes to see it, then photos, title, people, emotions,
 * and tags show one after another.
 */
export interface BestDaySlide {
  type: "best-day";
  date: DateKey;
}

/** Trip of a places slide: city, first and last day, check-in days. */
export interface PlacesTrip {
  city: string;
  start: DateKey;
  end: DateKey;
  /** Check-in days of the trip, oldest first: the pixels that stay bright. */
  dates: DateKey[];
}

/**
 * The cover's pixel calendar again: home days fade, days away stay bright.
 * Rows below name the trips and home. Home stays the anchor: the text counts
 * days away and at home, never one against the other.
 */
export interface PlacesSlide {
  type: "places";
  /** Home city name. */
  home: string;
  /** Oldest first. */
  trips: PlacesTrip[];
  /** Check-in days on a trip. */
  awayDays: number;
  /** Check-in days with a place in the home city. */
  homeDays: number;
}

/** Days still to come in the year. */
export interface ComingUpSlide {
  type: "coming-up";
  year: number;
  left: number;
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

/** Sleep of one night, stored on the next morning's entries. */
export interface SleepNight {
  /** Day the sleep is stored on: the morning after the night. */
  date: DateKey;
  /** Mean sleep quality, 0 (very bad) to 4 (very good). */
  quality: number;
}

/**
 * A rough night (quality bad or very bad) and what the user logged the
 * evening before it. Only data of steps the user has on.
 */
export interface RoughNight {
  /** Day before the night. Its entries hold the evening. */
  evening: DateKey;
  quality: number;
  tagIds: string[];
  personIds: string[];
  /** Emotion keys, in entry order. */
  emotions: string[];
  photos: LogPhoto[];
  /** Notes of the evening, joined. Empty without notes. */
  note: string;
}

/** Tag or person seen the evening before a rough night. */
export interface RoughNightItem {
  kind: "tag" | "person";
  id: string;
  /** Rough nights with the item the evening before. */
  nights: number;
  /** Logged on most days of the month: never marked as a repeat. */
  isEveryday: boolean;
}

/**
 * Sleep calendar of the month. With 2+ rough nights that have something
 * logged the evening before, it asks if the user wants to look closer.
 * The answer opens one slide per rough night, an overview, a question,
 * and a closing slide (`buildRoughNightSlides`).
 */
export interface SleepSlide {
  type: "sleep";
  nights: SleepNight[];
  goodNights: number;
  /** Oldest first. Empty when there is nothing to look at. */
  roughNights: RoughNight[];
  /** Tags and people of the rough nights. Most standing out first. */
  items: RoughNightItem[];
  /**
   * Item keys (`tag:<id>`) that get a repeat marker: at most 2 tags seen
   * on rough nights clearly more than on other days. Never people.
   */
  marked: string[];
  /** Item key Pixy would suggest. Only measured, never shown. */
  suggestion: string | null;
  /** Evening steps the user has on. Each shows, "Nothing logged" when empty. */
  steps: RoughNightStep[];
}

/** Step of an evening that a rough-night slide can show. */
export type RoughNightStep =
  | "photos"
  | "tags"
  | "people"
  | "emotions"
  | "message";

/** One rough night: sleep, then tags, people, emotions, photos, note. */
export interface RoughNightSlide {
  type: "rough-night";
  position: number;
  count: number;
  night: RoughNight;
  sleep: SleepSlide;
}

/** All rough nights side by side. */
export interface RoughNightsAllSlide {
  type: "rough-nights-all";
  sleep: SleepSlide;
}

/** What the user thinks was behind the rough nights. Waits for Done. */
export interface RoughNightsAskSlide {
  type: "rough-nights-ask";
  sleep: SleepSlide;
}

/** Calm closing of the rough nights, then back to the recap. */
export interface RoughNightsClosingSlide {
  type: "rough-nights-closing";
}

/** One page of a story. Each type has one renderer. */
export type StorySlide =
  | CoverSlide
  | BestDaySlide
  | PlacesSlide
  | PositiveTagsSlide
  | NegativeTagsSlide
  | PeopleQuizSlide
  | OrbitSlide
  | NewPeopleSlide
  | ComingUpSlide
  | SleepSlide
  | RoughNightSlide
  | RoughNightsAllSlide
  | RoughNightsAskSlide
  | RoughNightsClosingSlide
  | ShareSlide;

/** Key of a slide type. */
export type StorySlideType = StorySlide["type"];

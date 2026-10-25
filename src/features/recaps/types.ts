import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { LogItem } from "@/features/logs";
import type { Tag, TagCategory } from "@/features/tags";
import type { EffectSignal } from "./correlation";

/** Part of the app a card reads from. Shown above the card title. */
export type RecapModule =
  | "mood"
  | "emotions"
  | "people"
  | "location"
  | "tags"
  | "sleep"
  | "photos";

/** Kind of statement a card makes. Each card type has exactly one. */
export type CardFamily = "moment" | "summary" | "pattern" | "change" | "nudge";

/** How sure a card is. Weak signals never become cards. */
export type Signal = "strong" | "medium";

/** Length of a recap. Each kind maps to calendar boundaries. */
export type PeriodKind = "week" | "month" | "year";

/** `YYYY-MM-DD`, as in `LogItem.date`. */
export type DateKey = string;

/** Calendar period of a recap. `end` is the last day, inclusive. */
export interface Period {
  kind: PeriodKind;
  start: DateKey;
  end: DateKey;
}

/** All entries of one calendar day. Cards count days, not entries. */
export interface RecapDay {
  date: DateKey;
  items: LogItem[];
}

/** Everything a card rule reads. Built once per period by the screen. */
export interface RecapInput {
  period: Period;
  today: DateKey;
  /** Oldest entry of the user, `null` without entries. */
  firstEntryDate: DateKey | null;
  /** Days of `period` with at least one entry, oldest first. */
  days: RecapDay[];
  /** Every day with an entry, oldest first. Rules look back with it. */
  history: RecapDay[];
  /** Location setting on and available. */
  locationEnabled: boolean;
  /** Logger steps the user has on. */
  steps: ReadonlySet<ConfigurableLoggerStep>;
  /** Steps that exist in this build: People and Photos sit behind flags. */
  availableSteps: ReadonlySet<ConfigurableLoggerStep>;
  reminderEnabled: boolean;
  tags: Tag[];
  tagCategories: TagCategory[];
  /** Ids of people that still exist. Cards never name deleted people. */
  personIds: ReadonlySet<string>;
}

/** Card that offers to turn a feature on. */
export type NudgeCard =
  | { type: "nudge-reminder" }
  | { type: "intro-emotions" }
  | { type: "intro-people" }
  | { type: "intro-photos" }
  | { type: "intro-categories"; tagsCount: number };

/** Why a person shows in the people moment of a period. */
export type PersonMoment =
  | { kind: "back"; personId: string; lastDate: DateKey; weeks: number }
  | { kind: "new"; personId: string; firstDate: DateKey }
  | { kind: "milestone"; personId: string; days: number; year: number };

/**
 * A fact worth noticing. Cards name people, tags, and emotions by id; the
 * screen looks up names, so rules never read display data.
 */
export type MomentCard =
  | { type: "emotion-again"; emotion: string; lastDate: DateKey }
  | { type: "emotion-absent"; emotion: string; countBefore: number }
  | { type: "people-moments"; periodKind: PeriodKind; people: PersonMoment[] }
  | { type: "first-city"; city: string; district: string | null; date: DateKey }
  | { type: "tag-back"; tagId: string; days: number; weeks: number }
  | { type: "sleep-turnaround"; nights: DateKey[]; week: SleepNight[] }
  | { type: "sleep-rough"; nights: DateKey[]; week: SleepNight[] };

/** Night of the recap week: sleep 0 (very bad) to 4 (very good), or `null`. */
export interface SleepNight {
  date: DateKey;
  sleep: number | null;
}

/** Emotion and the number of days it showed up. */
export interface EmotionCount {
  emotion: string;
  days: number;
}

/** Person, connected days in the period, and their top emotions then. */
export interface ConnectedPerson {
  personId: string;
  days: number;
  emotions: string[];
  /** Back, new, or a milestone in this period. Week recaps only. */
  moment?: PersonMoment;
}

/** Days away from home in one city, gaps of up to 2 days allowed. */
export interface Trip {
  city: string;
  start: DateKey;
  end: DateKey;
  days: number;
}

/** Place that is no trip: a home city district or a nearby town, and its days. */
export interface Spot {
  name: string;
  days: number;
}

/** Describes the period: a day, emotions, people, places. No causes. */
export type SummaryCard =
  | { type: "day-recap"; mode: "best" | "ago" | "hard"; date: DateKey }
  | { type: "emotions"; counts: EmotionCount[] }
  | { type: "connected"; people: ConnectedPerson[] }
  | { type: "most-connected"; people: ConnectedPerson[] }
  | { type: "places"; trips: Trip[]; spots: Spot[] };

/** One driver in a pattern list: id, label for places, and its effect. */
export interface EffectRow {
  id: string;
  /** Place name; tags, categories, and people resolve their name by id. */
  label: string | null;
  delta: number;
  signal: EffectSignal;
}

/** A driver goes with an outcome over enough days. Never a cause. */
export type PatternCard =
  | { type: "stood-out"; tagId: string; days: number }
  | {
      type: "what-moves";
      tags: EffectRow[];
      categories: EffectRow[];
      places: EffectRow[];
    }
  | { type: "people-mood"; people: EffectRow[] };

/** Direction of a driver's effect from the start to the end of the period. */
export type Trend =
  | "steady"
  | "growing-lift"
  | "fading-lift"
  | "weighs-more"
  | "weighs-less";

/** One driver over time: rolling effects, `null` where data is thin. */
export interface TrendSeries {
  id: string;
  /** Place name; tags and people resolve their name by id. */
  label: string | null;
  values: (number | null)[];
  /** Mean effect of the first and last third of the windows. */
  first: number;
  last: number;
  trend: Trend;
}

/** Something grew or faded over the period. */
export interface ChangeCard {
  type: "trend-tags" | "trend-people" | "trend-location";
  /** Rolling window in days. */
  window: number;
  /** Last day of each window, one per value in every series. */
  ends: DateKey[];
  series: TrendSeries[];
}

/** Card data. `type` selects meta in `CARD_TYPES` and the body component. */
export type RecapCard =
  | NudgeCard
  | MomentCard
  | SummaryCard
  | PatternCard
  | ChangeCard;

/** Key of a card type in `CARD_TYPES`. */
export type CardType = RecapCard["type"];

/** Fixed facts of a card type. Same for every card of that type. */
export interface CardMeta {
  family: CardFamily;
  modules: RecapModule[];
  signal: Signal;
  /** Recaps this card fits. */
  periods: PeriodKind[];
}

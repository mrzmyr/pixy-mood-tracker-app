import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

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
export type PeriodKind = "week" | "month" | "quarter" | "year";

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

/**
 * A fact worth noticing. Cards name people, tags, and emotions by id; the
 * screen looks up names, so rules never read display data.
 */
export type MomentCard =
  | { type: "emotion-again"; emotion: string; lastDate: DateKey }
  | { type: "emotion-absent"; emotion: string; countBefore: number }
  | { type: "person-back"; personId: string; lastDate: DateKey; weeks: number }
  | { type: "person-new"; personId: string; firstDate: DateKey }
  | { type: "person-milestone"; personId: string; days: number; year: number }
  | { type: "first-city"; city: string; district: string | null; date: DateKey }
  | { type: "tag-back"; tagId: string; days: number; weeks: number }
  | { type: "sleep-turnaround"; nights: DateKey[] }
  | { type: "sleep-rough"; nights: DateKey[] };

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
}

/** Days away from home in one city, gaps of up to 2 days allowed. */
export interface Trip {
  city: string;
  start: DateKey;
  end: DateKey;
  days: number;
}

/** Describes the period: a day, emotions, people, places. No causes. */
export type SummaryCard =
  | { type: "day-recap"; mode: "best" | "ago" | "hard"; date: DateKey }
  | { type: "emotions"; counts: EmotionCount[] }
  | { type: "connected"; people: ConnectedPerson[] }
  | { type: "most-connected"; people: ConnectedPerson[] }
  | { type: "places-trips"; trips: Trip[] };

/** Card data. `type` selects meta in `CARD_TYPES` and the body component. */
export type RecapCard = NudgeCard | MomentCard | SummaryCard;

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

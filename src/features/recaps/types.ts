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
  /** Logger steps the user has on. */
  steps: ReadonlySet<ConfigurableLoggerStep>;
  /** Steps that exist in this build: People and Photos sit behind flags. */
  availableSteps: ReadonlySet<ConfigurableLoggerStep>;
  reminderEnabled: boolean;
  tags: Tag[];
}

/** Card data. `type` selects meta in `CARD_TYPES` and the body component. */
export type RecapCard =
  | { type: "nudge-reminder" }
  | { type: "intro-emotions" }
  | { type: "intro-people" }
  | { type: "intro-photos" }
  | { type: "intro-categories"; tagsCount: number };

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

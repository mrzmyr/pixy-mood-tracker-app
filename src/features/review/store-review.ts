import { RATING_MAPPING } from "@/constants/ratings";
import type { LogItem } from "@/features/logs";

/**
 * Saved entries (all time) that unlock the first store review prompt. Seven
 * entries is about one week of use: the user has seen value.
 */
export const STORE_REVIEW_ENTRIES_THRESHOLD = 7;

/** Saved entries that unlock later prompts after a good save. */
export const STORE_REVIEW_GOOD_ENTRY_THRESHOLD = 30;

/** Entries in a year that make its report worth a prompt. */
export const STORE_REVIEW_YEAR_REPORT_MIN_ENTRIES = 60;

/**
 * Prompts per rolling 365 days. iOS shows the system prompt at most 3 times
 * per 365 days and hides extra requests without telling the app.
 */
export const STORE_REVIEW_MAX_PROMPTS_PER_YEAR = 3;

/** Days between two prompts. Spreads the 3 yearly prompts over the year. */
export const STORE_REVIEW_MIN_DAYS_BETWEEN = 120;

/** Wait after the moment so its UI settles before the system prompt. */
export const STORE_REVIEW_DELAY_MS = 1500;

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

/** Analytics `trigger` value: the moment that requested the prompt. */
export type StoreReviewTrigger =
  | "entries_7"
  | "good_entry_30"
  | "year_report_end"
  | "month_story_end";

/** Good moment that may request the prompt. Mood values never leave the app. */
export type StoreReviewMoment =
  | {
      /** New entry saved. Edits never count. */
      kind: "entry_saved";
      /** Saved entries across all time, including the entry just saved. */
      entriesCount: number;
      /** Rating the user picked; `null` when the entry got the fallback. */
      rating: LogItem["rating"] | null;
      /** The entry has an emotion of category `bad` or `very_bad`. */
      hasNegativeEmotion: boolean;
    }
  | {
      /** User scrolled to the end of a year report. */
      kind: "year_report_end";
      /** Entries in the report's year. */
      yearEntriesCount: number;
      /** Rounded mean rating of the year; `null` without entries. */
      averageRating: LogItem["rating"] | null;
    }
  | {
      /** Month story played to its last slide and closed. */
      kind: "month_story_end";
      /** Rounded mean rating of the month; `null` without entries. */
      averageRating: LogItem["rating"] | null;
      /** The user marked a slide of this story as not helpful. */
      hasNotHelpfulAnswer: boolean;
    };

/** Device, build, and prompt history that limit every moment. */
export interface StoreReviewGate {
  /** ISO dates of earlier prompts (`storeReviewPromptDates`), any order. */
  promptDates: string[];
  /** App version of the last prompt (`storeReviewPromptedAppVersion`). */
  lastPromptAppVersion: string | null;
  /** Running app version. */
  appVersion: string;
  now: Date;
  /** `StoreReview.isAvailableAsync()`: native prompt exists on this device. */
  isReviewAvailable: boolean;
  /** Production build. Development and preview (e2e, QA) builds never prompt. */
  isReviewBuild: boolean;
  /** Settings loaded from storage. A failed read must not record the prompt. */
  isSettingsReady: boolean;
}

const isGood = (rating: LogItem["rating"] | null) =>
  rating !== null && RATING_MAPPING[rating] >= RATING_MAPPING.good;

/** Trigger of `moment` when it is clearly positive, else `null`. */
const getTrigger = (
  moment: StoreReviewMoment,
  hasPrompted: boolean
): StoreReviewTrigger | null => {
  switch (moment.kind) {
    case "entry_saved": {
      if (!isGood(moment.rating) || moment.hasNegativeEmotion) {
        return null;
      }
      if (!hasPrompted) {
        return moment.entriesCount >= STORE_REVIEW_ENTRIES_THRESHOLD
          ? "entries_7"
          : null;
      }
      return moment.entriesCount >= STORE_REVIEW_GOOD_ENTRY_THRESHOLD
        ? "good_entry_30"
        : null;
    }
    case "year_report_end": {
      return isGood(moment.averageRating) &&
        moment.yearEntriesCount >= STORE_REVIEW_YEAR_REPORT_MIN_ENTRIES
        ? "year_report_end"
        : null;
    }
    case "month_story_end": {
      return isGood(moment.averageRating) && !moment.hasNotHelpfulAnswer
        ? "month_story_end"
        : null;
    }
    default: {
      return null;
    }
  }
};

/**
 * Prompt history allows another prompt: fewer than 3 in the last 365 days,
 * none in the last 120 days, none in this app version. A prompt date after
 * `now` (clock moved back) blocks until the clock passes it plus 120 days.
 */
const isHistoryClear = ({
  promptDates,
  lastPromptAppVersion,
  appVersion,
  now,
}: StoreReviewGate) => {
  if (lastPromptAppVersion === appVersion) {
    return false;
  }
  const ages: number[] = [];
  for (const date of promptDates) {
    const age = now.getTime() - Date.parse(date);
    if (!Number.isNaN(age)) {
      ages.push(age);
    }
  }
  const promptsInYear = ages.filter((age) => age < YEAR_MS).length;
  const isSpaced = ages.every(
    (age) => age >= STORE_REVIEW_MIN_DAYS_BETWEEN * DAY_MS
  );
  return promptsInYear < STORE_REVIEW_MAX_PROMPTS_PER_YEAR && isSpaced;
};

/**
 * Decide whether `moment` requests the system store review prompt.
 *
 * Returns the analytics trigger, or `null` when the moment is not clearly
 * positive or the gate blocks: wrong build, no native prompt, settings not
 * loaded, or prompt history limits. The OS may still hide the prompt.
 */
export const decideStoreReview = (
  moment: StoreReviewMoment,
  gate: StoreReviewGate
): StoreReviewTrigger | null => {
  if (!gate.isReviewBuild || !gate.isSettingsReady || !gate.isReviewAvailable) {
    return null;
  }
  if (!isHistoryClear(gate)) {
    return null;
  }
  return getTrigger(moment, gate.promptDates.length > 0);
};

import type { LogItem } from "@/features/logs";
import { getItemDate, toLogDate } from "@/lib/logDates";

/**
 * Entry being created or edited. `rating` and sleep `quality` are `null`
 * until the user picks them.
 */
export type LogDraft = Omit<LogItem, "rating" | "sleep"> & {
  rating: LogItem["rating"] | null;
  sleep: {
    quality: LogItem["sleep"]["quality"] | null;
  };
};

/** Where the create logger closes to after the confirmation. */
export type LoggerCloseTarget = "calendar" | "back";

/** Entry to store plus where the create logger closes to. */
export interface FinalizedDraft {
  item: LogItem;
  /** The user picked a rating; `false` means `item` got the neutral fallback. */
  hasRating: boolean;
  /** `calendar` also closes the day list; `back` returns to the previous screen. */
  closeTo: LoggerCloseTarget;
}

/**
 * Turn a draft into the entry to store. Pure: `draft` stays unchanged.
 *
 * - No rating: stores `neutral`.
 * - `closeTo` is `calendar` when exactly one other entry exists on the
 *   draft's day, else `back`.
 */
export const finalizeDraft = (
  draft: LogDraft,
  existingItems: LogItem[]
): FinalizedDraft => {
  const item: LogItem = {
    ...draft,
    rating: draft.rating ?? "neutral",
    // SAFETY: a skipped sleep step keeps a null quality, as stored since the first sleep release; statistics and the day view treat it as missing.
    sleep: draft.sleep as LogItem["sleep"],
  };
  const day = toLogDate(draft.dateTime);
  const otherItemsOnDay = existingItems.filter(
    (existing) => existing.id !== draft.id && getItemDate(existing) === day
  );

  return {
    item,
    hasRating: draft.rating !== null,
    closeTo: otherItemsOnDay.length === 1 ? "calendar" : "back",
  };
};

/** The draft holds more than a rating and a time. */
export const hasDraftContent = (draft: LogDraft): boolean =>
  draft.message.length > 0 ||
  draft.tags.length > 0 ||
  draft.people.length > 0 ||
  draft.emotions.length > 0 ||
  draft.photos.length > 0 ||
  !!draft.sleep?.quality;

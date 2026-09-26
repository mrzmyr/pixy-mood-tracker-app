import { getLogDays } from "@/lib/utils";
import type { LogDay, LogItem } from "@/hooks/useLogs";

/** Days whose average rating is good or better. */
export interface MoodPeaksPositiveData {
  days: LogDay[];
}

/** Days whose average rating is bad or worse. */
export interface MoodPeaksNegativeData {
  days: LogDay[];
}

/** Empty state before statistics load. */
export const defaultMoodPeaksPositiveData = {
  days: [],
};

/** Empty state before statistics load. */
export const defaultMoodPeaksNegativeData = {
  days: [],
};

/**
 * Days in `items` whose average rating is good or better, in insertion
 * order.
 */
export const getMoodPeaksPositiveData = (
  items: LogItem[]
): MoodPeaksPositiveData => {
  const positiveKeys = new Set(["extremely_good", "very_good", "good"]);

  const logDays = getLogDays(items);
  const positiveDaysPeaked = logDays.filter((item) =>
    positiveKeys.has(item.ratingAvg)
  );

  return {
    days: positiveDaysPeaked,
  };
};

/** Days in `items` whose average rating is bad or worse, in insertion order. */
export const getMoodPeaksNegativeData = (
  items: LogItem[]
): MoodPeaksNegativeData => {
  const negativeKeys = new Set(["extremely_bad", "very_bad", "bad"]);

  const logDays = getLogDays(items);
  const negativeItemsPeaked = logDays.filter((item) =>
    negativeKeys.has(item.ratingAvg)
  );

  return {
    days: negativeItemsPeaked,
  };
};

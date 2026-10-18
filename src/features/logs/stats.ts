import groupBy from "lodash/groupBy";
import {
  RATING_KEYS,
  RATING_MAPPING,
  SLEEP_QUALITY_MAPPING,
} from "@/constants/Ratings";
import { getItemDate } from "@/lib/logDates";
import type { LogDay, LogItem } from "./LogsProvider";

/**
 * Rounded mean rating on the {@link RATING_MAPPING} scale, or `null` for
 * no items.
 */
export const getAverageMood = (items: LogItem[]): LogItem["rating"] | null => {
  let averageRating = 0;

  if (items.length > 0) {
    const sum = items.reduce(
      (acc, item) => acc + RATING_MAPPING[item.rating],
      0
    );
    averageRating = Math.round(sum / items.length);
  } else {
    return null;
  }

  return (
    RATING_KEYS.find((rating) => RATING_MAPPING[rating] === averageRating) ??
    null
  );
};

/**
 * Rounded mean on the {@link SLEEP_QUALITY_MAPPING} scale over items with a
 * sleep rating, or `null` when none has one.
 */
export const getAverageSleepQuality = (items: LogItem[]): number | null => {
  const itemsWithSleep = items.filter(
    (item) =>
      item.sleep?.quality &&
      SLEEP_QUALITY_MAPPING[item.sleep.quality] !== undefined
  );

  if (itemsWithSleep.length === 0) {
    return null;
  }

  const sum = itemsWithSleep.reduce(
    (acc, item) => acc + SLEEP_QUALITY_MAPPING[item.sleep.quality],
    0
  );
  return Math.round(sum / itemsWithSleep.length);
};

/**
 * Group entries into local calendar days (`DATE_FORMAT`) with day averages.
 *
 * Days come back in insertion order, not sorted by date.
 */
export const getLogDays = (items: LogItem[]): LogDay[] => {
  const moodsPerDay = groupBy(items, getItemDate);

  return Object.keys(moodsPerDay)
    .map((date) => {
      const dayItems = moodsPerDay[date];
      const avgMood = getAverageMood(dayItems);
      const avgSleepQuality = getAverageSleepQuality(dayItems);

      if (avgMood === null) {
        return null;
      }

      return {
        date,
        ratingAvg: avgMood,
        sleepQualityAvg: avgSleepQuality,
        items: dayItems,
      };
    })
    .filter((item): item is LogDay => item !== null);
};

/** Emotion keys with usage counts, most used first. */
export const getMostUsedEmotions = (items: LogItem[]) => {
  const emotions: Record<string, number> = {};
  for (const item of items) {
    if (item.emotions) {
      for (const emotion of item.emotions) {
        if (emotions[emotion]) {
          emotions[emotion] += 1;
        } else {
          emotions[emotion] = 1;
        }
      }
    }
  }

  return Object.keys(emotions)
    .map((emotion) => ({
      key: emotion,
      count: emotions[emotion],
    }))
    .sort((a, b) => b.count - a.count);
};

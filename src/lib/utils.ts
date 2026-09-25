import { Dimensions } from "react-native";
import dayjs from "dayjs";
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
import { t } from "@/helpers/translation";
import type { LogDay, LogItem } from "@/hooks/useLogs";
import {
  RATING_KEYS,
  RATING_MAPPING,
  SLEEP_QUALITY_MAPPING,
} from "@/constants/Ratings";
import { getItemDate } from "@/lib/logDates";

const SCREEN_WIDTH = Dimensions.get("window").width;

/**
 * Entries per elapsed day since the first entry, as a rounded percentage.
 *
 * Counts entries, not distinct days, so it can exceed 100. Returns
 * `Infinity` when the first entry is from today (zero elapsed days).
 */
export const getItemsCoverage = (items: LogItem[]) => {
  let itemsCoverage = 0;

  const itemsSorted = sortBy(items, (item) => item.dateTime);

  if (itemsSorted.length > 0) {
    const days = dayjs().diff(dayjs(itemsSorted[0].dateTime), "day");
    itemsCoverage = Math.round((itemsSorted.length / days) * 100);
  }

  return itemsCoverage;
};

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

/** Counts whitespace-separated words; blank text counts as 0. */
export const getWordCount = (text = "") => {
  const normalized = text.trim();
  return normalized === "" ? 0 : normalized.split(/\s+/u).length;
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

/**
 * Localized entry title such as "Today, 14:30".
 *
 * Uses a shorter date format below 350 pt window width, measured once at
 * module load.
 */
export const getItemDateTitle = (dateTime: LogItem["dateTime"]) => {
  const isSmallScreen = SCREEN_WIDTH < 350;

  if (dayjs(dateTime).isSame(dayjs(), "day")) {
    return `${t("today")}, ${dayjs(dateTime).format("HH:mm")}`;
  }

  if (dayjs(dateTime).isSame(dayjs().subtract(1, "day"), "day")) {
    return `${t("yesterday")}, ${dayjs(dateTime).format("HH:mm")}`;
  }

  return isSmallScreen
    ? dayjs(dateTime).format("l - LT")
    : dayjs(dateTime).format("ddd, L - LT");
};

/** Localized day title: "Today", "Yesterday", or the full weekday and date. */
export const getDayDateTitle = (date: LogDay["date"]) => {
  if (dayjs(date).isSame(dayjs(), "day")) {
    return t("today");
  }

  if (dayjs(date).isSame(dayjs().subtract(1, "day"), "day")) {
    return t("yesterday");
  }

  return dayjs(date).format("dddd, L");
};

const isoDateRegExp =
  /(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:[+-][0-2]\d:[0-5]\d|Z))|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d(?:[+-][0-2]\d:[0-5]\d|Z))/u;

/**
 * Loose ISO 8601 timestamp check.
 *
 * Requires a time and a `Z` or offset suffix, so date-only strings fail.
 * The pattern is unanchored, so surrounding text still passes.
 */
export const isISODate = (date: string) => isoDateRegExp.test(date);

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

/**
 * Rounded entries per elapsed day since the first entry; 0 for no items.
 *
 * Returns `Infinity` when the first entry is from today.
 */
export const getItemsCountPerDayAverage = (items: LogItem[]) => {
  if (items.length === 0) {
    return 0;
  }

  const itemsSorted = sortBy(items, (item) => item.dateTime);
  const days = dayjs().diff(dayjs(itemsSorted[0].dateTime), "day");
  return Math.round(items.length / days);
};

import { Dimensions } from "react-native";
import dayjs from "dayjs";
import groupBy from "lodash/groupBy";
import { getLocale, t } from "@/lib/translation";
// oxlint-disable-next-line eslint/no-restricted-imports -- Persisted feature types stay in their modules until storage refactor.
import type { LogDay, LogItem } from "@/features/logs";
import {
  RATING_KEYS,
  RATING_MAPPING,
  SLEEP_QUALITY_MAPPING,
} from "@/constants/Ratings";
import { getItemDate } from "@/lib/logDates";

const SCREEN_WIDTH = Dimensions.get("window").width;

const SHORT_DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};
const SHORT_DAY_YEAR_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};
const SHORT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

// Formatters are slow to create. Cache one per locale and options object.
const formatters = new Map<string, Intl.DateTimeFormat>();
const getFormatter = (
  name: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
  const locale = getLocale();
  const key = `${locale}:${name}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
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

/**
 * Compact entry time for tight rows: "Today, 20:00", "Yesterday, 20:00",
 * else short day and time ("Sep 28, 8:00 PM"). The year shows only outside
 * the current year.
 */
export const getShortItemDateTitle = (dateTime: LogItem["dateTime"]) => {
  const date = dayjs(dateTime);

  if (date.isSame(dayjs(), "day")) {
    return `${t("today")}, ${date.format("HH:mm")}`;
  }

  if (date.isSame(dayjs().subtract(1, "day"), "day")) {
    return `${t("yesterday")}, ${date.format("HH:mm")}`;
  }

  // Date and time apart: a combined format adds words like "at".
  const dayFormat = date.isSame(dayjs(), "year")
    ? getFormatter("short_day", SHORT_DAY_OPTIONS)
    : getFormatter("short_day_year", SHORT_DAY_YEAR_OPTIONS);
  const timeFormat = getFormatter("short_time", SHORT_TIME_OPTIONS);
  return `${dayFormat.format(date.toDate())}, ${timeFormat.format(date.toDate())}`;
};

/**
 * Weekday, month and day in the phone locale ("Tuesday, September 29" in
 * en-US, "Dienstag, 29. September" in de-DE). The year shows only outside
 * the current year. Display only, never a storage key.
 */
export const formatLocalizedDay = (
  date: string | Date,
  weekdayStyle: "long" | "short",
  localeTag: string = getLocale()
) => {
  const day = dayjs(date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: weekdayStyle,
    month: weekdayStyle === "long" ? "long" : "short",
    day: "numeric",
  };
  if (!day.isSame(dayjs(), "year")) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat(localeTag, options).format(day.toDate());
};

/** Localized day title: "Today", "Yesterday", or the full weekday and date. */
export const getDayDateTitle = (date: LogDay["date"]) => {
  if (dayjs(date).isSame(dayjs(), "day")) {
    return t("today");
  }

  if (dayjs(date).isSame(dayjs().subtract(1, "day"), "day")) {
    return t("yesterday");
  }

  return formatLocalizedDay(date, "long");
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

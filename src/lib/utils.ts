import dayjs from "dayjs";
import { getLocale, t } from "@/lib/translation";

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
/**
 * Cached `Intl.DateTimeFormat` for the current locale. `name` must be unique
 * per options object: the cache key is `${locale}:${name}`.
 */
export const getFormatter = (
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

/** Counts whitespace-separated words; blank text counts as 0. */
export const getWordCount = (text = "") => {
  const normalized = text.trim();
  return normalized === "" ? 0 : normalized.split(/\s+/u).length;
};

/** Time of day in the phone locale ("14:30" in en-GB, "2:30 PM" in en-US). */
export const formatItemTime = (dateTime: string) =>
  getFormatter("short_time", SHORT_TIME_OPTIONS).format(
    dayjs(dateTime).toDate()
  );

/**
 * Compact entry time for tight rows: time only today ("20:00"),
 * "Yesterday, 20:00", else short day and time ("Sep 28, 8:00 PM"). The year
 * shows only outside the current year.
 */
export const getShortItemDateTitle = (dateTime: string) => {
  const date = dayjs(dateTime);

  if (date.isSame(dayjs(), "day")) {
    return formatItemTime(dateTime);
  }

  if (date.isSame(dayjs().subtract(1, "day"), "day")) {
    return `${t("yesterday")}, ${formatItemTime(dateTime)}`;
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

/**
 * Localized entry title: "14:30" today, "Yesterday, 14:30", or weekday, day
 * and time ("Sat, 2 May, 14:30" in en-GB, "Sat, May 2, 2:30 PM" in en-US).
 *
 * Drops the weekday below 350 pt `windowWidth`.
 */
export const getItemDateTitle = (dateTime: string, windowWidth: number) => {
  const date = dayjs(dateTime);
  const isRecent =
    date.isSame(dayjs(), "day") ||
    date.isSame(dayjs().subtract(1, "day"), "day");

  if (isRecent || windowWidth < 350) {
    return getShortItemDateTitle(dateTime);
  }

  return `${formatLocalizedDay(dateTime, "short")}, ${formatItemTime(dateTime)}`;
};

/** Localized day title: "Today", "Yesterday", or the full weekday and date. */
export const getDayDateTitle = (date: string) => {
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

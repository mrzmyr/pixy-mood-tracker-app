import dayjs from "dayjs";
import { RATING_MAPPING, SLEEP_QUALITY_MAPPING } from "@/constants/Ratings";
import type { LogItem } from "@/features/logs";
import { isInPeriod } from "./period";
import type { DateKey, Period, RecapDay } from "./types";

/** Entries grouped by day, oldest first. */
export const getDays = (items: LogItem[]): RecapDay[] => {
  const byDate = new Map<string, LogItem[]>();
  for (const item of items) {
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({ date, items: dayItems }));
};

/** Days of `history` inside `period`, oldest first. */
export const getPeriodDays = (history: RecapDay[], period: Period) =>
  history.filter((day) => isInPeriod(day.date, period));

/** Whole days from `from` to `to`. */
export const daysBetween = (from: DateKey, to: DateKey) =>
  dayjs(to).diff(dayjs(from), "day");

/** `date` moved by `days`, as a date key. */
export const addDays = (date: DateKey, days: number) =>
  dayjs(date).add(days, "day").format("YYYY-MM-DD");

/** Mean rating of the day, 0 (worst) to 6 (best). */
export const getDayRating = (day: RecapDay) =>
  day.items.reduce((sum, item) => sum + RATING_MAPPING[item.rating], 0) /
  day.items.length;

/** Mean sleep quality of the day, 0 (worst) to 4 (best). */
export const getDaySleep = (day: RecapDay) =>
  day.items.reduce(
    (sum, item) => sum + SLEEP_QUALITY_MAPPING[item.sleep.quality],
    0
  ) / day.items.length;

/** Mean rating over `days`, `null` without days. */
export const getMeanRating = (days: RecapDay[]) =>
  days.length === 0
    ? null
    : days.reduce((sum, day) => sum + getDayRating(day), 0) / days.length;

/** Some entry of the day matches. */
export const dayHas = (day: RecapDay, test: (item: LogItem) => boolean) =>
  day.items.some(test);

import { DATE_FORMAT } from "@/constants/Config";
import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { RATING_MAPPING } from "@/constants/Ratings";
import { getItemDate } from "@/lib/logDates";

/** Empty state before statistics load; also defines {@link StreaksData}. */
export const defaultStreaksData = {
  longest: 0,
  current: 0,
};

/** Streak lengths in consecutive local calendar days. */
export type StreaksData = typeof defaultStreaksData;

/**
 * Sorted local days with entries. Like `getLogDays`, a day with an unknown
 * rating has no average and does not count. Skips the per-day averages,
 * which streaks do not need.
 */
const getSortedDays = (items: LogItem[]) => {
  const days = new Set<string>();
  const invalidDays = new Set<string>();

  for (const item of items) {
    const date = getItemDate(item);
    if (RATING_MAPPING[item.rating] === undefined) {
      invalidDays.add(date);
    } else {
      days.add(date);
    }
  }

  // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh array.
  return [...days].filter((date) => !invalidDays.has(date)).sort();
};

/**
 * Consecutive days with entries, counting back from today.
 *
 * Returns 0 when today has no entry yet, even if yesterday had one.
 */
export const getCurrentStreak = (items: LogItem[]) => {
  const days = getSortedDays(items);

  let currentStreak = 0;

  let currentDate = dayjs();
  let nextDay = days.pop();

  while (nextDay) {
    if (nextDay === currentDate.format(DATE_FORMAT)) {
      currentStreak += 1;
      currentDate = currentDate.subtract(1, "day");
      nextDay = days.pop();
    } else {
      break;
    }
  }

  return currentStreak;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (date: string) =>
  Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10))
  );

/** Whole days between two `YYYY-MM-DD` dates, independent of DST. */
const daysBetween = (from: string, to: string) =>
  Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

/** Longest run of consecutive days with entries; 0 for no entries. */
export const getLongestStreak = (items: LogItem[]) => {
  const days = getSortedDays(items);

  let streak = 0;
  let count = 1;

  for (let i = 0; i < days.length; i += 1) {
    const current = days[i];
    const next = days[i + 1];

    if (next && daysBetween(current, next) === 1) {
      count += 1;
      continue;
    }

    if (count > streak) {
      streak = count;
    }

    count = 1;
  }

  return streak;
};

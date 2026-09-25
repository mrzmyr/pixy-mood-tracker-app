import { DATE_FORMAT } from "@/constants/Config";
import dayjs from "dayjs";
import sortBy from "lodash/sortBy";
import type { LogItem } from "../useLogs";
import { getLogDays } from "@/lib/utils";

/** Empty state before statistics load; also defines {@link StreaksData}. */
export const defaultStreaksData = {
  longest: 0,
  current: 0,
};

/** Streak lengths in consecutive local calendar days. */
export type StreaksData = typeof defaultStreaksData;

/**
 * Consecutive days with entries, counting back from today.
 *
 * Returns 0 when today has no entry yet, even if yesterday had one.
 */
export const getCurrentStreak = (items: LogItem[]) => {
  const dayLogs = getLogDays(items);
  const itemsSorted = sortBy(dayLogs, (log) => log.date);

  let currentStreak = 0;

  let currentDate = dayjs();
  let nextItem = itemsSorted.pop();

  while (nextItem) {
    if (nextItem.date === currentDate.format(DATE_FORMAT)) {
      currentStreak += 1;
      currentDate = currentDate.subtract(1, "day");
      nextItem = itemsSorted.pop();
    } else {
      break;
    }
  }

  return currentStreak;
};

/** Longest run of consecutive days with entries; 0 for no entries. */
export const getLongestStreak = (items: LogItem[]) => {
  const dayLogs = getLogDays(items);
  const itemsSorted = sortBy(dayLogs, (log) => log.date);

  let streak = 0;
  let count = 1;

  for (let i = 0; i < itemsSorted.length; i += 1) {
    const current = itemsSorted[i];
    const next = itemsSorted[i + 1];

    if (Math.abs(dayjs(current.date).diff(dayjs(next?.date), "day")) === 1) {
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

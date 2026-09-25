import { DATE_FORMAT } from "@/constants/Config";
import dayjs from "dayjs";
import sortBy from "lodash/sortBy";
import type { LogItem } from "../useLogs";
import { getLogDays } from "@/lib/utils";

export const defaultStreaksData = {
  longest: 0,
  current: 0,
};

export type StreaksData = typeof defaultStreaksData;

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

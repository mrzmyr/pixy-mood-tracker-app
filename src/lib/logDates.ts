import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";

// Log updates replace entry objects instead of mutating them, so values
// cached per entry object never go stale.
const localDates = new WeakMap<LogItem, string>();
const times = new WeakMap<LogItem, number>();

/**
 * Local calendar day of the entry's `dateTime` in `DATE_FORMAT`.
 *
 * Cached per entry: screens scan every entry on each render, and parsing
 * thousands of dates with dayjs blocks the JS thread for hundreds of ms.
 */
export const getItemDate = (item: LogItem): string => {
  let date = localDates.get(item);
  if (date === undefined) {
    date = dayjs(item.dateTime).format(DATE_FORMAT);
    localDates.set(item, date);
  }
  return date;
};

/** The entry's `dateTime` in epoch milliseconds, cached per entry. */
export const getItemTime = (item: LogItem): number => {
  let time = times.get(item);
  if (time === undefined) {
    time = dayjs(item.dateTime).valueOf();
    times.set(item, time);
  }
  return time;
};

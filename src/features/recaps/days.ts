import type { LogItem } from "@/features/logs";
import { isInPeriod } from "./period";
import type { Period, RecapDay } from "./types";

/** Entries of `period` grouped by day, oldest first. */
export const getPeriodDays = (items: LogItem[], period: Period): RecapDay[] => {
  const byDate = new Map<string, LogItem[]>();
  for (const item of items) {
    if (isInPeriod(item.date, period)) {
      byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({ date, items: dayItems }));
};

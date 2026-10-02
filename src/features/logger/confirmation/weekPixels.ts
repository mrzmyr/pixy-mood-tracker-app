import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import { getAverageMood } from "@/lib/utils";

/** Days shown in the confirmation: the entry's day and the 6 days before. */
export const WEEK_DAYS = 7;

/** One day in the pixel row. */
export interface WeekPixel {
  /** Local day in `DATE_FORMAT`. */
  date: string;
  /** Day average, as the calendar colors it; `null` for a day without entries. */
  rating: LogItem["rating"] | null;
}

/**
 * Pixels for the week that ends on the saved entry's day, oldest first.
 *
 * Groups entries by `getItemDate` and averages them with `getAverageMood`,
 * like the calendar, so each pixel has the calendar color of its day. The
 * last pixel includes the saved entry and any earlier entry on that day.
 */
export const getWeekPixels = ({
  items,
  date,
}: {
  items: LogItem[];
  date: string;
}): WeekPixel[] => {
  const dates = Array.from({ length: WEEK_DAYS }, (_, index) =>
    dayjs(date)
      .subtract(WEEK_DAYS - 1 - index, "day")
      .format(DATE_FORMAT)
  );
  const weekDates = new Set(dates);
  const itemsByDate = new Map<string, LogItem[]>();

  for (const item of items) {
    const itemDate = getItemDate(item);
    if (weekDates.has(itemDate)) {
      itemsByDate.set(itemDate, [...(itemsByDate.get(itemDate) ?? []), item]);
    }
  }

  return dates.map((day) => ({
    date: day,
    rating: getAverageMood(itemsByDate.get(day) ?? []),
  }));
};

import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { getItemDate, getItemTime } from "@/lib/log-dates";
import { getAverageMood } from "@/features/logs";

/** Mood of the saved entry's day, merged over its entries. */
export interface DaySummary {
  /** Day average, like the calendar pixel. */
  rating: LogItem["rating"];
  /** Entries of the day, oldest first, at their minute of the day. */
  checkIns: CheckIn[];
}

/** One entry of the day on the day strip. */
export interface CheckIn {
  /** Minutes since local midnight, 0 to 1439. */
  minute: number;
  rating: LogItem["rating"];
}

/**
 * Summary of the saved entry's day. `items` may or may not contain `item`
 * yet; the saved entry always counts once.
 */
export const getDaySummary = ({
  items,
  item,
}: {
  items: LogItem[];
  item: LogItem;
}): DaySummary => {
  const date = getItemDate(item);
  const others = items.filter(
    (entry) => entry.id !== item.id && getItemDate(entry) === date
  );
  const dayItems = [item, ...others];

  return {
    rating: getAverageMood(dayItems) ?? item.rating,
    checkIns: dayItems
      .map((entry) => {
        const time = dayjs(getItemTime(entry));
        return {
          minute: time.hour() * 60 + time.minute(),
          rating: entry.rating,
        };
      })
      .sort((a, b) => a.minute - b.minute),
  };
};

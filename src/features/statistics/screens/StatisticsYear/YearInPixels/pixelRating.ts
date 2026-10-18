import type { LogItem } from "@/features/logs";
import { getAverageMood } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";

/**
 * Average rating of the entries on the local calendar day `date`, the same
 * day the calendar and month report use. Placeholder items behind the
 * not-enough-data overlay have no `dateTime` and match no day.
 */
export const getPixelRating = (items: LogItem[], date: string) =>
  getAverageMood(
    items.filter(
      (item) => item.dateTime !== undefined && getItemDate(item) === date
    )
  );

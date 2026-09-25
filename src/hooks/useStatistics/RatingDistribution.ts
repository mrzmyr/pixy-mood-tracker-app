import { getLogDays } from "@/lib/utils";
import dayjs from "dayjs";
import type { LogItem } from "@/hooks/useLogs";
import { RATING_MAPPING } from "@/constants/Ratings";

const MONTH_MAPPING = {
  0: "Jan",
  1: "Feb",
  2: "Mar",
  3: "Apr",
  4: "May",
  5: "Jun",
  6: "Jul",
  7: "Aug",
  8: "Sep",
  9: "Oct",
  10: "Nov",
  11: "Dec",
};

/**
 * Average rating per chart bucket; `value` is `null` for buckets without
 * entries.
 */
export type RatingDistributionData = {
  key: string;
  count: number;
  value: number | null;
}[];

/**
 * Average day rating per month, January first.
 *
 * Groups by month only, so `items` must be limited to one year.
 */
export const getRatingDistributionForYear = (
  items: LogItem[]
): RatingDistributionData => {
  const result: RatingDistributionData = [];
  const logDays = getLogDays(items);

  for (const month of Object.keys(MONTH_MAPPING)) {
    let value: null | number = null;

    // `day.date` is `YYYY-MM-DD`; its month part is 1-based.
    const days = logDays.filter(
      (day) => Number(day.date.slice(5, 7)) - 1 === Number(month)
    );

    for (const item of days) {
      if (value === null) {
        value = RATING_MAPPING[item.ratingAvg];
      } else {
        value += RATING_MAPPING[item.ratingAvg];
      }
    }

    result.push({
      key: MONTH_MAPPING[month][0],
      count: days.length,
      value: value === null ? null : value / days.length,
    });
  }

  return result;
};

/**
 * Average day rating for `dayCount + 1` days starting at `startDate`.
 *
 * Matches days by day of month only, so `items` must be limited to the
 * window and the window must be shorter than a month.
 */
export const getRatingDistributionForXDays = (
  items: LogItem[],
  startDate,
  dayCount
): RatingDistributionData => {
  const result: RatingDistributionData = [];

  const logDays = getLogDays(items);

  for (let i = 0; i <= dayCount; i += 1) {
    let value: null | number = null;
    const date = dayjs(startDate).add(i, "day");

    const days = logDays.filter(
      (item) => dayjs(item.date).date() === date.date()
    );

    for (const item of days) {
      if (value === null) {
        value = RATING_MAPPING[item.ratingAvg];
      } else {
        value += RATING_MAPPING[item.ratingAvg];
      }
    }

    result.push({
      key: date.format("D"),
      count: days.length,
      value: value === null ? null : value / days.length,
    });
  }

  return result;
};

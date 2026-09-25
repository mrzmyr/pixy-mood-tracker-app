import dayjs from "dayjs";
import type { LogItem } from "../useLogs";
import { RATING_MAPPING } from "@/constants/Ratings";

interface PeriodDataPoint {
  date: Date;
  value: number;
}

/**
 * Mood trend comparing two consecutive periods of {@link SCALE_RANGE} / 2
 * weeks.
 *
 * Period 1 is the older half, period 2 ends with the current week. Both
 * point lists run newest first. `status` is `"declined"` when averages are
 * equal.
 */
export interface MoodTrendData {
  avgPeriod1: number;
  avgPeriod2: number;
  ratingsPeriode1: PeriodDataPoint[];
  ratingsPeriode2: PeriodDataPoint[];
  diff: number;
  status: "improved" | "declined";
  items: (LogItem & { value: number })[];
}

/** Empty state before statistics load. */
export const defaultMoodTrendData: MoodTrendData = {
  avgPeriod1: 0,
  avgPeriod2: 0,
  ratingsPeriode1: [],
  ratingsPeriode2: [],
  diff: 0,
  status: "improved",
  items: [],
};

/** dayjs unit of one trend bucket; also shown in the trend card label. */
export const SCALE_TYPE = "week";
/** Number of {@link SCALE_TYPE} buckets across both periods; must be even. */
export const SCALE_RANGE = 24;
const DEFAULT_WEEK_AVG = 3;

/**
 * Compute weekly rating averages for the trend card.
 *
 * Weeks without entries count as neutral (3), which pulls sparse periods
 * toward the middle.
 */
export const getMoodTrendData = (items: LogItem[]): MoodTrendData => {
  const ratingsPeriode1: PeriodDataPoint[] = [];
  const ratingsPeriode2: PeriodDataPoint[] = [];

  for (let i = SCALE_RANGE / 2; i < SCALE_RANGE; i += 1) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const _items = items.flatMap((item) => {
      const itemDate = dayjs(item.dateTime);
      return itemDate.isSame(start, SCALE_TYPE)
        ? [{ ...item, value: RATING_MAPPING[item.rating] }]
        : [];
    });
    let ratingAverage = DEFAULT_WEEK_AVG;
    if (_items.length > 0) {
      ratingAverage =
        Math.floor(
          (_items.reduce((acc, item) => acc + item.value, 0) / _items.length) *
            100
        ) / 100;
    }
    ratingsPeriode1.push({
      date: start.toDate(),
      value: ratingAverage,
    });
  }

  for (let i = 0; i < SCALE_RANGE / 2; i += 1) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const _items = items.flatMap((item) => {
      const itemDate = dayjs(item.dateTime);
      return itemDate.isSame(start, SCALE_TYPE)
        ? [{ ...item, value: RATING_MAPPING[item.rating] }]
        : [];
    });
    let ratingAverage = DEFAULT_WEEK_AVG;
    if (_items.length > 0) {
      ratingAverage =
        Math.floor(
          (_items.reduce((acc, item) => acc + item.value, 0) / _items.length) *
            100
        ) / 100;
    }
    ratingsPeriode2.push({
      date: start.toDate(),
      value: ratingAverage,
    });
  }

  const avgPeriod1 =
    ratingsPeriode1.reduce((acc, item) => acc + item.value, 0) /
    ratingsPeriode1.length;
  const avgPeriod2 =
    ratingsPeriode2.reduce((acc, item) => acc + item.value, 0) /
    ratingsPeriode2.length;

  return {
    avgPeriod1,
    avgPeriod2,
    ratingsPeriode1,
    ratingsPeriode2,
    diff: Math.abs(avgPeriod1 - avgPeriod2),
    status: avgPeriod1 < avgPeriod2 ? "improved" : "declined",
    items: items.map((item) => ({
      ...item,
      value: RATING_MAPPING[item.rating],
    })),
  };
};

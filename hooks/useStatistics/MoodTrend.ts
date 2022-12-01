import dayjs from "dayjs";
import { LogItem, RATING_MAPPING } from "../useLogs";

type PeriodDataPoint = {
  date: Date;
  value: number;
}

export interface MoodTrendData {
  avgPeriod1: number;
  avgPeriod2: number;
  ratingsPeriode1: PeriodDataPoint[];
  ratingsPeriode2: PeriodDataPoint[];
  diff: number;
  status: 'improved' | 'declined';
  items: (LogItem & { value: number })[]
}

export const defaultMoodTrendData: MoodTrendData = {
  avgPeriod1: 0,
  avgPeriod2: 0,
  ratingsPeriode1: [],
  ratingsPeriode2: [],
  diff: 0,
  status: 'improved',
  items: []
}

export const SCALE_TYPE = 'week';
export const SCALE_RANGE = 24;
const DEFAULT_WEEK_AVG = 3;

export const getMoodTrendData = (items: LogItem[]): MoodTrendData => {
  const ratingsPeriode1: PeriodDataPoint[] = []
  const ratingsPeriode2: PeriodDataPoint[] = []

  for (let i = SCALE_RANGE / 2; i < SCALE_RANGE; i++) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const end = dayjs().subtract(i, SCALE_TYPE).endOf(SCALE_TYPE);
    const _items = items
      .map(item => ({
        ...item,
        value: RATING_MAPPING[item.rating],
      }))
      .filter((item) => {
        const itemDate = dayjs(item.dateTime);
        return itemDate.isSame(start, SCALE_TYPE)
      })
    let ratingAverage = DEFAULT_WEEK_AVG;
    if (_items.length > 0) {
      ratingAverage = Math.floor(_items.reduce((acc, item) => acc + item.value, 0) / _items.length * 100) / 100;
    }
    ratingsPeriode1.push({
      date: start.toDate(),
      value: ratingAverage,
    });
  }

  for (let i = 0; i < SCALE_RANGE / 2; i++) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const end = dayjs().subtract(i, SCALE_TYPE).endOf(SCALE_TYPE);
    const _items = items
      .map(item => ({
        ...item,
        value: RATING_MAPPING[item.rating],
      }))
      .filter((item) => {
        const itemDate = dayjs(item.dateTime);
        return itemDate.isSame(start, SCALE_TYPE)
      })
    let ratingAverage = DEFAULT_WEEK_AVG;
    if (_items.length > 0) {
      ratingAverage = Math.floor(_items.reduce((acc, item) => acc + item.value, 0) / _items.length * 100) / 100;
    }
    ratingsPeriode2.push({
      date: start.toDate(),
      value: ratingAverage,
    });
  }

  const avgPeriod1 = ratingsPeriode1.reduce((acc, item) => acc + item.value, 0) / ratingsPeriode1.length;
  const avgPeriod2 = ratingsPeriode2.reduce((acc, item) => acc + item.value, 0) / ratingsPeriode2.length;

  return {
    avgPeriod1,
    avgPeriod2,
    ratingsPeriode1,
    ratingsPeriode2,
    diff: Math.abs(avgPeriod1 - avgPeriod2),
    status: avgPeriod1 < avgPeriod2 ? 'improved' : 'declined',
    items: items.map(item => ({
      ...item,
      value: RATING_MAPPING[item.rating],
    }))
  }
}
import { getLogDays } from '@/lib/utils';
import dayjs from 'dayjs';
import { LogItem, RATING_MAPPING } from '../useLogs';

const MONTH_MAPPING = {
  0: 'Jan',
  1: 'Feb',
  2: 'Mar',
  3: 'Apr',
  4: 'May',
  5: 'Jun',
  6: 'Jul',
  7: 'Aug',
  8: 'Sep',
  9: 'Oct',
  10: 'Nov',
  11: 'Dec',
};

export type RatingDistributionData = {
  key: string;
  count: number;
  value: number | null;
}[]

export const getRatingDistributionForYear = (items: LogItem[]): RatingDistributionData => {
  const result: RatingDistributionData = []

  for (const month in Object.keys(MONTH_MAPPING)) {
    let value: null | number = null;

    const logDays = getLogDays(items)

    const days = logDays.filter((day) => {
      return dayjs(day.date).month() === Number(month)
    })

    days.forEach((item) => {
      if (value === null) {
        value = RATING_MAPPING[item.ratingAvg]
      } else {
        value += RATING_MAPPING[item.ratingAvg]
      }
    })

    result.push({
      key: MONTH_MAPPING[month][0],
      count: days.length,
      value: value === null ? null : value / days.length,
    })
  }

  return result;
}

export const getRatingDistributionForXDays = (items: LogItem[], startDate, dayCount): RatingDistributionData => {
  const result: RatingDistributionData = []

  const logDays = getLogDays(items)

  for (let i = 0; i <= dayCount; i++) {
    let value: null | number = null;
    const date = dayjs(startDate).add(i, 'day')

    const days = logDays.filter((item) => {
      return dayjs(item.date).date() === date.date()
    })

    days.forEach((item) => {
      if (value === null) {
        value = RATING_MAPPING[item.ratingAvg]
      } else {
        value += RATING_MAPPING[item.ratingAvg]
      }
    })

    result.push({
      key: date.format('D'),
      count: days.length,
      value: value === null ? null : value / days.length,
    })
  }

  return result;
}

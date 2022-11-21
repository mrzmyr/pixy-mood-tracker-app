import dayjs from 'dayjs';
import { LogItem, RATING_MAPPING } from './../useLogs';

const WEEKDAY_MAPPING = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

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

    const _items = items.filter((item) => {
      return dayjs(item.dateTime).month() === Number(month)
    })

    _items.forEach((item) => {
      if (value === null) {
        value = RATING_MAPPING[item.rating]
      } else {
        value += RATING_MAPPING[item.rating]
      }
    })

    result.push({
      key: MONTH_MAPPING[month][0],
      count: _items.length,
      value: value === null ? null : value / _items.length,
    })
  }

  return result;
}

export const getRatingDistributionForXDays = (items: LogItem[], startDate, dayCount): RatingDistributionData => {
  const result: RatingDistributionData = []

  for (let i = 0; i <= dayCount; i++) {
    let value: null | number = null;
    const date = dayjs(startDate).add(i, 'day')

    const _items = items.filter((item) => {
      return dayjs(item.dateTime).date() === date.date()
    })

    _items.forEach((item) => {
      if (value === null) {
        value = RATING_MAPPING[item.rating]
      } else {
        value += RATING_MAPPING[item.rating]
      }
    })

    result.push({
      key: date.format('D'),
      count: _items.length,
      value: value === null ? null : value / _items.length,
    })
  }

  return result;
}

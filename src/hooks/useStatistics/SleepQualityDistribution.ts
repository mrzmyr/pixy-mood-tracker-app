import { getLogDays } from '@/lib/utils';
import dayjs from 'dayjs';
import { LogItem } from '../useLogs';
import _ from 'lodash';

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

export type SleepQualityDistributionData = {
  key: string;
  count: number;
  value: number | null;
}[]

export const defaultSleepQualityDistributionDataForXDays = (): SleepQualityDistributionData => {
  const result: SleepQualityDistributionData = []

  for (let i = 0; i <= 30; i++) {
    result.push({
      key: dayjs().add(i, 'day').format('D'),
      count: _.random(0, 5),
      value: null,
    })
  }

  return result;
}


export const getSleepQualityDistributionForYear = (items: LogItem[]): SleepQualityDistributionData => {
  const result: SleepQualityDistributionData = []

  for (const month in Object.keys(MONTH_MAPPING)) {
    let value: null | number = null;

    const logDays = getLogDays(items)

    const days = logDays.filter((day) => {
      return dayjs(day.date).month() === Number(month)
    })

    days.forEach((item) => {
      if (value === null) {
        value = item.sleepQualityAvg
      } else {
        value += item.sleepQualityAvg
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

export const getSleepQualityDistributionForXDays = (items: LogItem[], startDate: string, dayCount): SleepQualityDistributionData => {
  const result: SleepQualityDistributionData = []

  const logDays = getLogDays(items)

  for (let i = 0; i <= dayCount; i++) {
    let value: null | number = null;
    const date = dayjs(startDate).add(i, 'day')

    const days = logDays.filter((item) => {
      return dayjs(item.date).date() === date.date()
    })

    days.forEach((item) => {
      if (value === null) {
        value = item.sleepQualityAvg
      } else {
        value += item.sleepQualityAvg
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

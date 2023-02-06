import { Dimensions } from 'react-native';
import dayjs from 'dayjs';
import _ from 'lodash';
import { t } from '@/helpers/translation';
import { DATE_FORMAT } from '@/constants/Config';
import { LogDay, LogItem, RATING_MAPPING, SLEEP_QUALITY_MAPPING } from '@/hooks/useLogs';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const getItemsCoverage = (items: LogItem[]) => {
  let itemsCoverage = 0;

  const itemsSorted = _.sortBy(items, (item) => item.dateTime);

  if (itemsSorted.length > 0) {
    const days = dayjs().diff(dayjs(itemsSorted[0].dateTime), "day");
    itemsCoverage = Math.round((itemsSorted.length / days) * 100);
  }

  return itemsCoverage;
};

export const getAverageMood = (items: LogItem[]): LogItem['rating'] | null => {
  let averageRating = 0;

  if (items.length > 0) {
    const sum = items.reduce((acc, item) => acc + RATING_MAPPING[item.rating], 0);
    averageRating = Math.round(sum / items.length);
  } else {
    return null;
  }

  return _.invert(RATING_MAPPING)[averageRating] as LogItem['rating'];
}

export const getAverageSleepQuality = (items: LogItem[]): number | null => {
  let averageSleepQuality = 0;

  if (items.length > 0) {
    const sum = items.reduce((acc, item) => acc + SLEEP_QUALITY_MAPPING[item.sleep?.quality], 0);
    averageSleepQuality = Math.round(sum / items.length);
  } else {
    return null;
  }

  return averageSleepQuality;
}

export const getLogDays = (items: LogItem[]): LogDay[] => {
  const moodsPerDay = _.groupBy(items, (item) => dayjs(item.dateTime).format(DATE_FORMAT))

  return Object.keys(moodsPerDay).map((date) => {
    const items = moodsPerDay[date]
    const avgMood = getAverageMood(items)
    const avgSleepQuality = getAverageSleepQuality(items)

    if (avgMood === null) return null

    return {
      date,
      ratingAvg: avgMood,
      sleepQualityAvg: avgSleepQuality,
      items,
    }
  }).filter((item) => item !== null) as LogDay[]
}

export const getItemDateTitle = (dateTime: LogItem['dateTime']) => {
  const isSmallScreen = SCREEN_WIDTH < 350;

  if (dayjs(dateTime).isSame(dayjs(), 'day')) {
    return `${t('today')}, ${dayjs(dateTime).format('HH:mm')}`
  }

  if (dayjs(dateTime).isSame(dayjs().subtract(1, 'day'), 'day')) {
    return `${t('yesterday')}, ${dayjs(dateTime).format('HH:mm')}`
  }

  return (
    isSmallScreen ?
      dayjs(dateTime).format('l - LT') :
      dayjs(dateTime).format('ddd, L - LT')
  )
}

export const getDayDateTitle = (date: LogDay['date']) => {

  if (dayjs(date).isSame(dayjs(), 'day')) {
    return t('today')
  }

  if (dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')) {
    return t('yesterday')
  }

  return dayjs(date).format('dddd, L')
}

var isoDateRegExp = new RegExp(/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/);

export const isISODate = (date: string) => {
  return isoDateRegExp.test(date);
};

export const getMostUsedEmotions = (items: LogItem[]) => {
  const emotions = items.reduce((acc, item) => {
    if (item.emotions) {
      item.emotions.forEach((emotion) => {
        if (acc[emotion]) {
          acc[emotion] += 1;
        } else {
          acc[emotion] = 1;
        }
      });
    }

    return acc;
  }, {} as Record<string, number>);

  return Object.keys(emotions)
    .map((emotion) => ({
      key: emotion,
      count: emotions[emotion],
    }))
    .sort((a, b) => b.count - a.count);
}

export const wait = async (timeout: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
};

export const getItemsCountPerDayAverage = (items: LogItem[]) => {
  if (items.length === 0) return 0;

  const itemsSorted = _.sortBy(items, (item) => item.dateTime);
  const days = dayjs().diff(dayjs(itemsSorted[0].dateTime), "day");
  return Math.round(items.length / days);
}

import dayjs from 'dayjs';
import _ from 'lodash';
import { t } from '../helpers/translation';
import { LogItem, RATING_MAPPING } from './../hooks/useLogs';

export const getItemsCoverage = (items: LogItem[]) => {
  let itemsCoverage = 0;

  const itemsSorted = _.sortBy(items, (item) => item.dateTime);

  if (itemsSorted.length > 0) {
    const days = dayjs().diff(dayjs(itemsSorted[0].dateTime), "day");
    itemsCoverage = Math.round((itemsSorted.length / days) * 100);
  }

  return itemsCoverage;
};

export const getAverageRating = (items: LogItem[]): LogItem['rating'] | null => {
  let averageRating = 0;

  if (items.length > 0) {
    const sum = items.reduce((acc, item) => acc + RATING_MAPPING[item.rating], 0);
    averageRating = Math.round(sum / items.length);
  } else {
    return null;
  }

  return _.invert(RATING_MAPPING)[averageRating] as LogItem['rating'];
}

export const getItemDateTitle = (dateTime: LogItem['dateTime']) => {

  if (dayjs(dateTime).isSame(dayjs(), 'day')) {
    return `${t('today')}, ${dayjs(dateTime).format('HH:mm')}`
  }

  if (dayjs(dateTime).isSame(dayjs().subtract(1, 'day'), 'day')) {
    return `${t('yesterday')}, ${dayjs(dateTime).format('HH:mm')}`
  }

  return dayjs(dateTime).format('ddd, L - LT')
}
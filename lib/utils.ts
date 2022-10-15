import dayjs from 'dayjs';
import { LogItem } from './../hooks/useLogs';

export const getItemsCoverage = (items: LogItem[]) => {
  let itemsCoverage = 0;

  const itemsSorted = Object.keys(items).sort((a, b) => {
    return (
      new Date(items[a].date).getTime() - new Date(items[b].date).getTime()
    );
  });

  if (itemsSorted.length > 0) {
    const firstItemDate = new Date(itemsSorted[0]);
    const days = dayjs().diff(firstItemDate, "day");
    itemsCoverage = Math.round((itemsSorted.length / days) * 100);
  }

  return itemsCoverage;
};
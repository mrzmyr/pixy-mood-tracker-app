import _ from 'lodash';
import { View } from 'react-native';
import { t } from '@/helpers/translation';
import { LogItem } from '../../hooks/useLogs';
import { StatsCard } from "./StatsCard";

export const Stats = ({
  date,
  items,
  prevItems,
}: {
  date,
  items: LogItem[];
  prevItems: LogItem[];
}) => {
  const words = items.reduce((acc, item) => acc + item.message.split(' ').length, 0);
  const wordsPrev = prevItems.reduce((acc, item) => acc + item.message.split(' ').length, 0);
  const wordsDiff = _.round(Math.abs(words - wordsPrev));

  const wordsPerDay = _.round(words / date.daysInMonth(), 2);
  const wordsPerDayPrev = _.round(wordsPrev / date.subtract(1, 'month').daysInMonth(), 2);
  const wordsPerDayDiff = _.round(Math.abs(wordsPerDay - wordsPerDayPrev));

  const tags = items.reduce((acc, item) => acc + (item.tags.length ?? 0), 0);
  const tagsPrev = prevItems.reduce((acc, item) => acc + (item.tags.length ?? 0), 0);

  const itemsPerDay = _.round(items.length / date.daysInMonth(), 2);
  const itemsPerDayPrev = _.round(prevItems.length / date.subtract(1, 'month').daysInMonth(), 2)
  const itemsPerDayDiff = _.round(Math.abs(itemsPerDay - itemsPerDayPrev));

  const tagsPerDay = _.round(tags / date.daysInMonth(), 2)
  const tagsPerDayPrev = _.round(tagsPrev / date.subtract(1, 'month').daysInMonth(), 2)
  const tagsPerDayDiff = _.round(Math.abs(tagsPerDay - tagsPerDayPrev))

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          marginTop: 16,
        }}
      >
        <StatsCard
          title={`${items.length}`}
          subtitle={t('entries')}
          trendType={items.length > prevItems.length ? 'up' : 'down'}
          trendValue={Math.abs(items.length - prevItems.length)}
          style={{
            flex: 1,
            marginRight: 8,
          }} />
        <StatsCard
          title={`${itemsPerDay}`}
          subtitle={t('entries_per_day')}
          trendType={itemsPerDay > itemsPerDayPrev ? 'up' : 'down'}
          trendValue={itemsPerDayDiff}
          style={{
            flex: 1,
          }} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          marginTop: 8,
        }}
      >
        <StatsCard
          title={`${tags}`}
          subtitle={t('tags_used')}
          trendType={tags > tagsPrev ? 'up' : 'down'}
          trendValue={Math.abs(tags - tagsPrev)}
          style={{
            flex: 1,
            marginRight: 8,
          }} />
        <StatsCard
          title={`${tagsPerDay}`}
          subtitle={t('tags_per_day')}
          trendType={tagsPerDay > tagsPerDayPrev ? 'up' : 'down'}
          trendValue={tagsPerDayDiff}
          style={{
            flex: 1,
          }} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          marginTop: 8,
        }}
      >
        <StatsCard
          title={`${words}`}
          subtitle={t('words_written')}
          trendType={words > wordsPrev ? 'up' : 'down'}
          trendValue={wordsDiff}
          style={{
            flex: 1,
            marginRight: 8,
          }} />
        <StatsCard
          title={`${wordsPerDay}`}
          subtitle={t('words_written_per_day')}
          trendType={wordsPerDay > wordsPerDayPrev ? 'up' : 'down'}
          trendValue={wordsPerDayDiff}
          style={{
            flex: 1,
          }} />
      </View>
    </>
  );
};

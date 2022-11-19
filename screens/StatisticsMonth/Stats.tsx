import { View } from 'react-native';
import { t } from '../../helpers/translation';
import { LogItem } from '../../hooks/useLogs';
import { StatsCard } from "./StatsCard";

export const Stats = ({
  items, prevItems,
}: {
  items: LogItem[];
  prevItems: LogItem[];
}) => {
  const prevWords = prevItems.reduce((acc, item) => acc + item.message.split(' ').length, 0);
  const words = items.reduce((acc, item) => acc + item.message.split(' ').length, 0);

  const prevTags = prevItems.reduce((acc, item) => acc + (item.tags?.length ?? 0), 0);
  const tags = items.reduce((acc, item) => acc + (item.tags?.length ?? 0), 0);
  const itemsTagged = items.filter(item => item.tags?.length ?? 0 > 0).length;
  const prevItemsTagged = prevItems.filter(item => item.tags?.length ?? 0 > 0).length;

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
          title={`${words}`}
          subtitle={t('words_written')}
          trendType={words > prevWords ? 'up' : 'down'}
          trendValue={Math.abs(words - prevWords)}
          style={{
            flex: 1,
          }} />
      </View>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <StatsCard
          title={`${tags}`}
          subtitle={t('tags_used')}
          trendType={tags > prevTags ? 'up' : 'down'}
          trendValue={Math.abs(tags - prevTags)}
          style={{
            flex: 1,
            marginRight: 8,
            marginBottom: 0,
          }} />
        <StatsCard
          title={`${itemsTagged}`}
          subtitle={t('days_tagged')}
          trendType={itemsTagged > prevItemsTagged ? 'up' : 'down'}
          trendValue={Math.abs(itemsTagged - prevItemsTagged)}
          style={{
            flex: 1,
            marginBottom: 0,
          }} />
      </View>
    </>
  );
};

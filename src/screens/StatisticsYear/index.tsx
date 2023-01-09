import { MoodCounts } from '@/components/Statistics/MoodCounts';
import { t } from '@/helpers/translation';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../../../types';
import useColors from '../../hooks/useColors';
import { useLogState } from '../../hooks/useLogs';
import { BestMonth } from './BestMonth';
import { Header } from './Header';
import { MoodChart } from './MoodChart';
import { WorstMonth } from './WorstMonth';
import YearInPixels from './YearInPixels';
import { TagDistribution } from '@/components/Statistics/TagDistribution';
import { EmotionsDistribution } from '@/components/Statistics/EmotionsDistribution';

export const StatisticsYearScreen = ({ route }: RootStackScreenProps<'StatisticsYear'>) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()

  const [date, setDate] = useState(dayjs(route.params.date).isValid() ? dayjs(route.params.date) : dayjs())

  const logState = useLogState()
  const items = logState.items.filter((item) => dayjs(item.dateTime).isSame(date, 'year'))

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <Header
        title={date.format('YYYY')}
        subtitle={t('year_report')}
        gradientColors={[
          colors.palette.orange[700],
          colors.palette.orange[500],
          colors.palette.yellow[500]
        ]}
      />
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 8,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
          }}
        >
          <View
            style={{
              marginRight: 8,
              flex: 1,
            }}
          >
            <BestMonth
              date={date}
            />
          </View>
          <View
            style={{
              flex: 1,
            }}
          >
            <WorstMonth
              date={date}
            />
          </View>
        </View>
        <MoodCounts
          title={t('mood_count')}
          subtitle={t('mood_count_description', { date: dayjs(date).format('YYYY') })}
          date={date}
          items={items}
        />
        <MoodChart
          date={date}
        />
        <YearInPixels
          date={date}
        />
        <EmotionsDistribution
          title={t('statistics_most_used_emotions')}
          subtitle={t('statistics_most_used_emotions_description', { date: date.format('YYYY') })}
          items={items}
        />
        <TagDistribution
          title={t('statistics_most_used_tags')}
          subtitle={t('statistics_most_used_tags_description', { date: date.format('YYYY') })}
          items={items}
        />
      </View>
    </ScrollView>
  );
}

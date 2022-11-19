import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../helpers/translation';
import useColors from '../../hooks/useColors';
import { useLogState } from '../../hooks/useLogs';
import { RootStackScreenProps } from '../../types';
import { TagDistribution } from '../../components/Statistics/TagDistribution';
import { Header } from './Header';
import { RatingCount } from '../../components/Statistics/RatingCount';
import { RatingDistributionYear } from './RatingDistribution';
import YearDotsCard from './YearDotsCard';

export const StatisticsYearScreen = ({ route }: RootStackScreenProps<'StatisticsYear'>) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()

  const [date, setDate] = useState(dayjs(route.params.date).isValid() ? dayjs(route.params.date) : dayjs())

  const logState = useLogState()
  const items = Object.values(logState.items).filter((item) => dayjs(item.date).isSame(date, 'year'))

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
        <RatingCount
          title={t('mood_count')}
          subtitle={t('mood_count_description', { date: dayjs(date).format('YYYY') })}
          date={date}
          items={items}
        />
        <RatingDistributionYear
          date={date}
        />
        <YearDotsCard
          date={date}
        />
        <TagDistribution
          title={t('statistics_most_used_tags')}
          subtitle={t('statistics_most_used_tags_description', { date: date.format('YYYY') })}
          date={date}
          items={items}
        />
      </View>
    </ScrollView>
  );
}

import { MoodCounts } from '@/components/Statistics/MoodCounts';
import { TagDistribution } from '@/components/Statistics/TagDistribution';
import { DATE_FORMAT } from '@/constants/Config';
import { t } from '@/helpers/translation';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../../../types';
import useColors from '../../hooks/useColors';
import { useLogState } from '../../hooks/useLogs';
import { Header } from './Header';
import { MoodChart } from './MoodChart';
import { MoodPeaks } from './MoodPeaks';
import { Navigation } from './Navigation';
import { Stats } from './Stats';
import { EmotionsDistribution } from '@/components/Statistics/EmotionsDistribution';

export const StatisticsMonthScreen = ({ navigation, route }: RootStackScreenProps<'StatisticsMonth'>) => {
  const colors = useColors()
  const inset = useSafeAreaInsets()

  const [date, setDate] = useState(dayjs(route.params.date).isValid() ? dayjs(route.params.date) : dayjs())

  const _setDate = (date: dayjs.Dayjs) => {
    navigation.setParams({
      date: date.format(DATE_FORMAT)
    });
    setDate(date)
  }

  const prevMonth = date.subtract(1, 'month')
  const nextMonth = date.add(1, 'month')

  const logState = useLogState()

  const prevItems = logState.items.filter((item) => dayjs(item.dateTime).isSame(prevMonth, 'month'))
  const nextItems = logState.items.filter((item) => dayjs(item.dateTime).isSame(nextMonth, 'month'))
  const items = logState.items.filter((item) => dayjs(item.dateTime).isSame(date, 'month'))

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <ScrollView>
        <Header
          title={date.format('MMMM YYYY')}
          subtitle={t('month_report')}
          gradientColors={[
            colors.palette.indigo[900],
            colors.palette.indigo[600],
            colors.palette.indigo[500]
          ]}
        />
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: inset.bottom + 16,
          }}
        >
          <Navigation
            nextMonth={nextMonth}
            prevMonth={prevMonth}
            onNext={() => _setDate(nextMonth)}
            onPrev={() => _setDate(prevMonth)}
            nextMonthDisabled={nextItems.length === 0}
            prevMonthDisabled={prevItems.length === 0}
          />
          <Stats items={items} prevItems={prevItems} date={date} />
          <MoodChart date={date} items={items} />
          <MoodCounts
            title={t('mood_count')}
            subtitle={t('mood_count_description', { date: dayjs(date).format('MMMM, YYYY') })}
            items={items}
            date={date}
          />
          <TagDistribution
            title={t('statistics_most_used_tags')}
            subtitle={t('statistics_most_used_tags_description', { date: date.format('MMMM, YYYY') })}
            items={items}
          />
          <EmotionsDistribution
            title={t('statistics_most_used_emotions')}
            subtitle={t('statistics_most_used_emotions_description', { date: date.format('MMMM, YYYY') })}
            items={items}
          />
          <MoodPeaks items={items} date={date} />
        </View>
      </ScrollView>
    </View>
  );
}

import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DATE_FORMAT } from '../../constants/Config';
import { t } from '../../helpers/translation';
import useColors from '../../hooks/useColors';
import { useLogState } from '../../hooks/useLogs';
import { RootStackScreenProps } from '../../types';
import { RatingCount } from '../StatisticsYear/RatingCount';
import { Header } from './Header';
import { MoodPeaks } from './MoodPeaks';
import { Navigation } from './Navigation';
import { RatingDistribution } from './RatingDistribution';
import { Stats } from './Stats';
import { TagDistribution } from './TagDistribution';

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

  const prevItems = Object.values(logState.items).filter((item) => dayjs(item.date).isSame(prevMonth, 'month'))
  const nextItems = Object.values(logState.items).filter((item) => dayjs(item.date).isSame(nextMonth, 'month'))
  const items = Object.values(logState.items).filter((item) => dayjs(item.date).isSame(date, 'month'))

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
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
          <Stats items={items} prevItems={prevItems} />
          <RatingDistribution date={date} items={items} />
          <RatingCount items={items} date={date} />
          <TagDistribution date={date} items={items} />
          <MoodPeaks items={items} date={date} />
        </View>
      </ScrollView>
    </View>
  );
}

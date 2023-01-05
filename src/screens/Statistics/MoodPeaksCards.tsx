import { Card } from '@/components/Statistics/Card';
import { CardFeedback } from '@/components/Statistics/CardFeedback';
import { DATE_FORMAT } from '@/constants/Config';
import { t } from '@/helpers/translation';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import dayjs, { Dayjs } from 'dayjs';
import _ from 'lodash';
import { Pressable, Text, View } from 'react-native';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { LogDay } from '../../hooks/useLogs';
import useScale from '../../hooks/useScale';
import { MoodPeaksNegativeData, MoodPeaksPositiveData } from '../../hooks/useStatistics/MoodPeaks';
import { HeaderWeek } from './HeaderWeek';

const DayDot = ({
  date,
  day,
}: {
  date: Date,
  day: LogDay | undefined,
}) => {
  const colors = useColors()
  const scale = useScale()
  const haptics = useHaptics()
  const calendarNavigation = useCalendarNavigation()

  const color = day ? {
    bg: scale.colors[day.ratingAvg].background,
    text: scale.colors[day.ratingAvg].text,
    border: scale.colors[day.ratingAvg].text,
  } : {
    bg: colors.statisticsCalendarDotBackground,
    text: colors.statisticsCalendarDotText,
    border: colors.statisticsCalendarDotBorder,
  };

  const isFuture = dayjs(date).isAfter(dayjs(), 'day')

  return (
    <Pressable
      style={({ pressed }) => ({
        width: '100%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        backgroundColor: color.bg,
        maxWidth: 32,
        maxHeight: 32,
        borderColor: color?.border,
        borderWidth: dayjs(date).isSame(dayjs(), 'day') ? 2 : 0,
        opacity: pressed ? 0.8 : isFuture ? 0.5 : 1,
      })}
      onPress={async () => {
        if (!day) return;
        await haptics.selection()
        calendarNavigation.openDay(dayjs(date).format(DATE_FORMAT))
      }}
    >
      <Text
        style={{
          color: color.text,
          fontWeight: '600',
        }}
      >{dayjs(date).format('DD')}</Text>
    </Pressable>
  )
}

const BodyWeek = ({
  days,
  start,
}: {
  days: LogDay[],
  start: Dayjs,
}) => {
  const _days = [0, 1, 2, 3, 4, 5, 6]

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
      }}
    >
      {_days.map((dayCount, index) => {
        const date = dayjs(start).add(dayCount, 'day').toDate()
        const day = days.find(item => dayjs(item.date).isSame(date, 'day'))

        return (
          <View
            key={index}
            style={{
              flex: 7,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DayDot date={date} day={day} />
          </View>
        )
      })}
    </View>
  )
}

export const MoodPeaksContent = ({
  data,
  startDate,
  endDate,
}: {
  data: MoodPeaksPositiveData | MoodPeaksNegativeData,
  startDate: string,
  endDate: string,
}) => {
  const _endDate = dayjs(endDate).endOf('week')
  const _startDate = dayjs(startDate).startOf('week')
  const weekCount = dayjs(_endDate).diff(dayjs(_startDate), 'week') + 1

  return (
    <View
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        marginBottom: 8,
      }}
    >
      <HeaderWeek date={_startDate.format(DATE_FORMAT)} />
      {_.range(weekCount).map((week, index) => {
        const weekStart = dayjs(_startDate).add(week, 'week')

        return (
          <BodyWeek
            key={index}
            days={data.days}
            start={weekStart}
          />
        )
      })}
    </View>
  )
}

export const MoodPeaksCard = ({
  data,
  type,
  startDate,
  endDate,
}: {
  type: 'positive' | 'negative'
  data: MoodPeaksNegativeData | MoodPeaksPositiveData
  startDate: string,
  endDate: string,
}) => {
  return (
    <Card
      subtitle={t('mood')}
      title={t(data.days.length > 1 ? 'statistics_mood_peaks_title_plural' : 'statistics_mood_peaks_title_singular', {
        rating_word: t(`statistics_mood_peaks_${type}_direction`),
        rating_count: data.days.length,
      })}
    >
      <MoodPeaksContent
        data={data}
        startDate={startDate}
        endDate={endDate}
      />
      <CardFeedback
        analyticsId={`mood_peaks_${type}`}
        analyticsData={{
          days_count: data.days.length,
        }}
      />
    </Card>
  )
}

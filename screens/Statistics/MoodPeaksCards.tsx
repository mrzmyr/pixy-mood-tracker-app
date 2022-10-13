import { useNavigation } from '@react-navigation/native';
import dayjs, { Dayjs } from 'dayjs';
import { Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import { DATE_FORMAT } from '../../constants/Config';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { LogItem } from '../../hooks/useLogs';
import useScale from '../../hooks/useScale';
import { useSettings } from '../../hooks/useSettings';
import { MoodPeaksNegativeData, MoodPeaksPositiveData } from '../../hooks/useStatistics/MoodPeaks';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';
import { HeaderWeek } from './HeaderWeek';

const DayDot = ({
  date,
  rating,
}: {
  date: Date,
  rating: LogItem['rating'],
}) => {
  const colors = useColors()
  const { settings } = useSettings()
  const scale = useScale(settings.scaleType)
  const navigation = useNavigation()
  const haptics = useHaptics()

  const color = scale.colors[rating] ? {
    bg: scale.colors[rating].background,
    text: scale.colors[rating].text,
    border: scale.colors[rating].text,
  } : {
    bg: colors.statisticsCalendarDotBackground,
    text: colors.statisticsCalendarDotText,
    border: colors.statisticsCalendarDotBorder,
  };
  
  return (
    <TouchableOpacity
      style={{
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
      }}
      activeOpacity={0.8}
      onPress={async () => {
        await haptics.selection()
        navigation.navigate('LogView', {
          date: dayjs(date).format(DATE_FORMAT),
        })
      }}
    >
      <Text
        style={{
          color: color.text,
          fontWeight: '600',
        }}
      >{dayjs(date).format('DD')}</Text>
    </TouchableOpacity>
  )
}

const BodyWeek = ({
  items,
  start,
}: {
  items: LogItem[],
  start: Dayjs,
}) => {
  const days = [1, 2, 3, 4, 5, 6, 7]
  
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
      }}
    >
      {days.map((day, index) => {
        const date = dayjs(start).add(day, 'day').toDate()
        const item = items.find(item => dayjs(item.date).isSame(date, 'day'))
        return (
          <View
            key={index}
            style={{
              flex: 7,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DayDot date={date} rating={item?.rating} />
          </View>
        )
      })}
    </View>
  )
}

export const MoodPeaksCard = ({
  data,
  type
}: {
  type: 'positive' | 'negative'
  data: MoodPeaksNegativeData | MoodPeaksPositiveData
}) => {
  const { t } = useTranslation();
  
  return (
    <Card
      subtitle={t('mood')}
      title={t(data.items.length > 1 ? 'statistics_mood_peaks_title_plural' : 'statistics_mood_peaks_title_singular', {
        rating_word: t(`statistics_mood_peaks_${type}`),
        rating_count: data.items.length,
      })}
    >
      <View
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <HeaderWeek />
        <BodyWeek start={dayjs().subtract(2, 'week')} items={data.items} />
        <BodyWeek start={dayjs().subtract(1, 'week')} items={data.items} />
      </View>
      <CardFeedback type={`mood_peaks_${type}`} details={{
        items_count: data.items.length,
      }} />
    </Card>
  )
}

import { useNavigation } from '@react-navigation/native';
import dayjs, { Dayjs } from 'dayjs';
import { Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import useColors from '../../hooks/useColors';
import { LogItem } from '../../hooks/useLogs';
import useScale from '../../hooks/useScale';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

const keys = {
  positive: ['extremely_good', 'very_good'],
  negative: ['very_bad', 'extremely_bad'],
}

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
      onPress={() => {
        navigation.navigate('LogView', {
          date: dayjs(date).format('YYYY-MM-DD'),
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
  

const HeaderDay = ({ 
  children 
}: {
  children: string
}) => {
  const colors = useColors()
  return (
    <View
      style={{
        flex: 7,
      }}
    >
     <Text 
      style={{ 
        fontSize: 14,
        fontWeight: '600',
        color: colors.statisticsWeekdayText,
        textAlign: 'center',
      }}
      >{children}</Text>
    </View>
  )
}

const HeaderWeek = () => {
  const colors = useColors()

  return (
    <View
      style={{
        width: '100%',
      }}
    >
      <View style={{
        flexDirection: "row",
        justifyContent: 'space-around',
        borderTopColor: colors.statisticsWeekdayBorder,
        borderTopWidth: 1,
        borderBottomColor: colors.statisticsWeekdayBorder,
        borderBottomWidth: 1,
        paddingTop: 8,
        paddingBottom: 8,
      }}>
      <HeaderDay>{dayjs().add(0, 'day').format('ddd')}</HeaderDay>
      <HeaderDay>{dayjs().add(-1, 'day').format('ddd')}</HeaderDay>
      <HeaderDay>{dayjs().add(-2, 'day').format('ddd')}</HeaderDay>
      <HeaderDay>{dayjs().add(-3, 'day').format('ddd')}</HeaderDay>
      <HeaderDay>{dayjs().add(-4, 'day').format('ddd')}</HeaderDay>
      <HeaderDay>{dayjs().add(-5, 'day').format('ddd')}</HeaderDay>
      <HeaderDay>{dayjs().add(-6, 'day').format('ddd')}</HeaderDay>
    </View>
  </View>
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

const MoodPeakCard = ({
  items,
  type
}: {
  type: 'positive' | 'negative'
  items: LogItem[]
}) => {
  const { t } = useTranslation();

  const peaks = items.filter(item => keys[type].includes(item.rating))
  const rating_peaks = Object.values(items).filter(item => keys[type].includes(item.rating)).length;

  if(rating_peaks === 0) {
    return null;
  }
  
  return (
    <Card
      subtitle={t('mood')}
      title={t(rating_peaks > 1 ? 'statistics_mood_peaks_title_plural' : 'statistics_mood_peaks_title_singular', {
        rating_word: t(`statistics_mood_peaks_${type}`),
        rating_count: rating_peaks,
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
        <BodyWeek start={dayjs().subtract(2, 'week')} items={peaks} />
        <BodyWeek start={dayjs().subtract(1, 'week')} items={peaks} />
      </View>
      <CardFeedback type='mood_peaks' details={{ rating_peaks, type }} />
    </Card>
  )
}

export const MoodPeaksCard = ({
  items,
}: {
  items: LogItem[]
}) => {
  return (
    <>
      <MoodPeakCard items={items} type='positive' />
      <MoodPeakCard items={items} type='negative' />
    </>
  );
};

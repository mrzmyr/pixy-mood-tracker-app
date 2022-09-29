import { useNavigation } from '@react-navigation/native';
import dayjs, { Dayjs } from 'dayjs';
import _ from 'lodash';
import { Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { LogItem } from '../../hooks/useLogs';
import { Tag as ITag, useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';
import { HeaderWeek } from './HeaderWeek';

const DayDot = ({
  isHighlighted,
  colorName,
  date,
}: {
  date: Date,
  isHighlighted: boolean,
  colorName: string,
}) => {
  const colors = useColors()
  const haptics = useHaptics()
  const navigation = useNavigation()
  
  const color = isHighlighted ? colors.tags[colorName] : {
    background: colors.statisticsCalendarDotBackground,
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
        backgroundColor: color?.background,
        maxWidth: 32,
        maxHeight: 32,
        borderColor: color?.border,
        borderWidth: dayjs(date).isSame(dayjs(), 'day') ? 2 : 0,
      }}
      activeOpacity={0.8}
      onPress={async () => {
        await haptics.selection()
        navigation.navigate('LogView', {
          date: dayjs(date).format('YYYY-MM-DD'),
        })
      }}
    >
      <Text
        style={{
          color: color?.text,
          fontWeight: '600',
        }}
      >{dayjs(date).format('DD')}</Text>
    </TouchableOpacity>
  )
}

const BodyWeek = ({
  items,
  tag,
  start,
}: {
  items: LogItem[],
  tag: ITag,
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
        const isHighlighted = item?.tags?.map(d => d.id).includes(tag?.id)
        return (
          <View
            key={index}
            style={{
              flex: 7,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DayDot 
              date={date} 
              isHighlighted={isHighlighted} 
              colorName={tag?.color}
            />
          </View>
        )
      })}
    </View>
  )
}

const TagPeaksCard = ({
  items,
  tag,
}: {
  items: LogItem[]
  tag: ITag
}) => {
  const { t } = useTranslation();

  const peaks = items.filter(item => item?.tags?.map(d => d.id).includes(tag?.id))
  
  return (
    <Card
      subtitle={t('tags')}
      title={t('statistics_tag_peaks_title', {
        title: tag?.title,
        count: peaks.length,
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
        <BodyWeek start={dayjs().subtract(2, 'week')} items={peaks} tag={tag} />
        <BodyWeek start={dayjs().subtract(1, 'week')} items={peaks} tag={tag} />
      </View>
      <CardFeedback type='tags_peaks' details={{ count: peaks.length }} />
    </Card>
  )
}

export const TagPeaksCards = ({
  items,
}: {
  items: LogItem[]
}) => {
  const { settings } = useSettings()
  
  const distribution = _.countBy(items.flatMap(item => item?.tags?.map(tag => tag?.id)))
  const tags = Object.keys(distribution)
    .filter(key => distribution[key] >= 5)
    .map(key => settings.tags.find(tag => tag.id === key))
    .filter(tag => tag)

  return (
    <>
      {tags.map((tag, index) => <TagPeaksCard key={index} items={items} tag={tag} />)}
    </>
  );
};

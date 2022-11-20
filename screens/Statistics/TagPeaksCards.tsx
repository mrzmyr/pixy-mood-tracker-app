import { useNavigation } from '@react-navigation/native';
import dayjs, { Dayjs } from 'dayjs';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import { t } from '../../helpers/translation';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { LogItem } from '../../hooks/useLogs';
import { TagsPeakData } from '../../hooks/useStatistics/TagsPeaks';
import { Tag as ITag } from '../../hooks/useTags';
import { CardFeedback } from '../../components/Statistics/CardFeedback';
import { HeaderWeek } from './HeaderWeek';

const DayDot = ({
  date,
  isHighlighted,
  colorName,
  item,
}: {
  date: Dayjs,
  isHighlighted: boolean,
  colorName: string,
  item: LogItem | undefined,
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
    <Pressable
      style={({ pressed }) => ({
        width: '100%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        backgroundColor: color?.background,
        maxWidth: 32,
        maxHeight: 32,
        borderColor: color?.border,
        borderWidth: date.isSame(dayjs(), 'day') ? 2 : 0,
        opacity: pressed ? 0.8 : 1,
      })}
      onPress={async () => {
        if (!item) return;

        await haptics.selection()
        navigation.navigate('LogView', {
          id: item.id,
        })
      }}
    >
      <Text
        style={{
          color: color?.text,
          fontWeight: '600',
        }}
      >{date.format('DD')}</Text>
    </Pressable>
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
        const date = dayjs(start).add(day, 'day')
        const item = items.find(item => dayjs(item.date).isSame(date, 'day'))
        const isHighlighted = item?.tags?.map(d => d.id).includes(tag?.id) ?? false

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
              item={item}
              colorName={tag?.color}
            />
          </View>
        )
      })}
    </View>
  )
}

export const TagPeaksCard = ({
  tag,
}: {
  tag: TagsPeakData['tags'][0],
}) => {
  const colors = useColors()

  return (
    <Card
      subtitle={t('tags')}
      title={<>
        <Text
          style={{
            fontSize: 17,
            color: colors.text,
            fontWeight: 'bold',
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.tags[tag?.color]?.text,
            }}
          >{tag?.title}&nbsp;</Text>
          {t('statistics_tag_peaks_title', {
            title: tag?.title,
            count: tag.items.length,
          })}
        </Text>
      </>}
    >
      <View
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          marginBottom: 8,
        }}
      >
        <HeaderWeek />
        <BodyWeek start={dayjs().subtract(2, 'week')} items={tag.items} tag={tag} />
        <BodyWeek start={dayjs().subtract(1, 'week')} items={tag.items} tag={tag} />
      </View>
      <CardFeedback type='tags_peaks' details={{ count: tag.items.length }} />
    </Card>
  )
}

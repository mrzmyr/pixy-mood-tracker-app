import { useNavigation } from '@react-navigation/native';
import _ from 'lodash';
import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/Statistics/Card';
import { t } from '@/helpers/translation';
import { useAnonymizer } from '../../hooks/useAnonymizer';
import { useCalendarFilters } from '../../hooks/useCalendarFilters';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { TagsDistributionData } from '../../hooks/useStatistics/TagsDistribution';
import { Tag } from '../../hooks/useTags';
import { CardFeedback } from '@/components/Statistics/CardFeedback';

export const TagDistributionContent = ({
  data,
  limit = 5,
}: {
  data: TagsDistributionData,
  limit?: number,
}) => {
  const colors = useColors()
  const haptic = useHaptics()
  const calendarFilters = useCalendarFilters()
  const navigation = useNavigation()

  const onPress = (tagId: Tag['id']) => {
    haptic.selection()
    calendarFilters.set({
      ...calendarFilters.data,
      tagIds: [tagId],
    })
    navigation.navigate('Calendar')
  }

  return (
    <View
      style={{
        flexDirection: 'column',
      }}
    >
      {data.tags.slice(0, limit).map(tag => {
        return (
          <Pressable
            key={tag?.details?.id}
            onPress={() => onPress(tag.id)}
            style={{
              position: 'relative',
              height: 32,
              marginBottom: 8,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: colors.tags[tag?.details?.color]?.background,
                height: 32,
                width: tag.count / data.tags[0].count * 100 + '%',
                borderRadius: 4,
                position: 'absolute',
              }}
            >
            </View>
            <Text
              style={{
                color: colors.tags[tag?.details?.color]?.text,
                fontSize: 14,
                fontWeight: '600',
                position: 'relative',
                marginLeft: 8,
              }}
            >{tag.count}x {tag?.details?.title}</Text>
          </Pressable>
        );
      })}
      {data.tags.length > limit && (
        <View
          style={{
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
            }}
          >And {data.tags.length - limit} more</Text>
        </View>
      )}
    </View>
  )
}

export const TagsDistributionCard = ({
  data,
}: {
  data: TagsDistributionData
}) => {
  const { anonymizeTag } = useAnonymizer()

  return (
    <Card
      subtitle={t('tags')}
      title={t('statistics_tags_distribution_title', { count: data.tags.length })}
    >
      <TagDistributionContent data={data} />
      <CardFeedback
        analyticsId='tags_distribution'
        analyticsData={{
          tags: data.tags.map(tag => anonymizeTag(tag.details))
        }} />
    </Card>
  );
};

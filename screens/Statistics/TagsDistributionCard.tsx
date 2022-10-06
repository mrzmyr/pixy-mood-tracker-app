import _ from 'lodash';
import { Text, View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import useColors from '../../hooks/useColors';
import { TagsDistributionData } from '../../hooks/useStatistics/TagsDistribution';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

export const TagsDistributionCard = ({
  data,
}: {
  data: TagsDistributionData
}) => {
  const colors = useColors()
  const { t } = useTranslation();
  
  return (
    <Card
      subtitle={t('mood')}
      title={t('statistics_tags_distribution_title', {
        count: data.itemsCount,
      })}
    >
      <View
        style={{
          flexDirection: 'column',
          marginBottom: 8,
        }}
      >
        {data.tags.slice(0, 5).map(tag => {
          return (
            <View
              key={tag?.details?.id}
              style={{
                position: 'relative',
                height: 24,
                marginBottom: 8,
                justifyContent: 'center',
                paddingLeft: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.tags[tag?.details?.color]?.background,
                  height: 24,
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
                }}
              >{tag.count}x {tag?.details?.title}</Text>
            </View>
          );
        })}
        {data.tags.length > 5 && (
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
            >And {data.tags.length - 5} more</Text>
          </View>
        )}
      </View>
      <CardFeedback 
        type='tags_distribution' 
        details={{ 
          count: data.itemsCount, 
          tags: data.tags.map(tag => ({
            ...(_.omit(tag.details, 'title')),
            tagLength: tag.details.title.length,
          })),
        }} />
    </Card>
  );
};

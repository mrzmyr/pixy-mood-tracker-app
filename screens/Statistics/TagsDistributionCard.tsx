import _ from 'lodash';
import { Text, View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import useColors from '../../hooks/useColors';
import { LogItem } from '../../hooks/useLogs';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

export const TagsDistributionCard = ({
  items,
}: {
  items: LogItem[]
}) => {
  const colors = useColors()
  const { settings } = useSettings();
  const { t } = useTranslation();

  const distribution = _.countBy(items.flatMap(item => item?.tags?.map(tag => tag?.id)))
  const tags = Object.keys(distribution)
    .map(key => ({
      details: settings.tags.find(tag => tag.id === key),
      id: key,
      count: distribution[key]
    }))
    .sort((a, b) => b.count - a.count)
    .filter(tag => tag.details !== undefined)

  const itemsWithTags = items.filter(item => item?.tags?.length > 0)

  if(itemsWithTags.length < 5) {
    return null;
  }
  
  return (
    <Card
      subtitle={t('mood')}
      title={t('statistics_tags_distribution_title', {
        count: itemsWithTags.length,
      })}
    >
      <View
        style={{
          flexDirection: 'column',
          marginBottom: 8,
        }}
      >
        {tags.slice(0, 5).map(tag => {
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
                  width: tag.count / tags[0].count * 100 + '%',
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
        {tags.length > 5 && (
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
            >And {tags.length - 5} more</Text>
          </View>
        )}
      </View>
      <CardFeedback 
        type='tags_distribution' 
        details={{ 
          count: itemsWithTags.length, 
          tags: tags.map(tag => ({
            ...(_.omit(tag.details, 'title')),
            tagLength: tag.details.title.length,
          })),
        }} />
    </Card>
  );
};

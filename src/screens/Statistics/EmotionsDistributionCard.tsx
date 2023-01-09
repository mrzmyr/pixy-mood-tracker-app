import { Card } from '@/components/Statistics/Card';
import { CardFeedback } from '@/components/Statistics/CardFeedback';
import { t } from '@/helpers/translation';
import useColors from '@/hooks/useColors';
import { EmotionsDistributionData } from '@/hooks/useStatistics/EmotionsDistributuon';
import { Emotion } from '@/types';
import { Text, View } from 'react-native';
import { EmotionItem } from '../LogList/EmotionItem';

const EmotionBar = ({
  emotion,
  count,
}: {
  emotion: Emotion;
  count: number;
}) => {
  const colors = useColors()

  return (
    <View
      style={{
        position: 'relative',
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 17,
          fontWeight: '500',
          position: 'relative',
          marginRight: 16,
          textAlign: 'right',
          marginLeft: 8,
        }}
      >{count}x</Text>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <EmotionItem
          emotion={emotion}
        />
      </View>
    </View>
  )
}

export const EmotionsDistributionContent = ({
  data,
  limit = 5,
}: {
  data: EmotionsDistributionData,
  limit?: number,
}) => {
  return (
    <View
      style={{
        flexDirection: 'column',
      }}
    >
      {data.emotions.slice(0, limit).map(emotion => {
        return (
          <EmotionBar
            key={emotion?.details?.key}
            emotion={emotion.details}
            count={emotion.count}
          />
        );
      })}
    </View>
  )
}

export const EmotionsDistributionCard = ({
  data,
}: {
  data: EmotionsDistributionData
}) => {
  return (
    <Card
      subtitle={t('emotions')}
      title={t('statistics_emotions_distribution_title', { count: data.emotions.length })}
    >
      <EmotionsDistributionContent data={data} />
      <CardFeedback
        analyticsId='emotions_distribution'
        analyticsData={{
          emotions: data.emotions
        }} />
    </Card>
  );
};

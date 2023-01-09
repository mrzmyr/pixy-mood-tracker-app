import { Card } from '@/components/Statistics/Card';
import { CardFeedback } from '@/components/Statistics/CardFeedback';
import { t } from '@/helpers/translation';
import useScale from '@/hooks/useScale';
import { EmotionsDistributionData } from '@/hooks/useStatistics/EmotionsDistributuon';
import { Emotion } from '@/types';
import { Text, View, useColorScheme } from 'react-native';
import chroma from 'chroma-js';

const EmotionBar = ({
  emotion,
  count,
  total,
}: {
  emotion: Emotion;
  count: number;
  total: number;
}) => {
  const scale = useScale();
  const colorScheme = useColorScheme()
  const colorMapping = {
    very_good: scale.colors.very_good,
    good: scale.colors.very_good,
    neutral: scale.colors.neutral,
    bad: scale.colors.very_bad,
    very_bad: scale.colors.very_bad,
  };

  const color = colorMapping[emotion.category];

  return (
    <View
      style={{
        position: 'relative',
        height: 32,
        marginBottom: 8,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: (
            colorScheme === 'dark' ?
              chroma(color.background).darken(2).hex() :
              chroma(color.background).alpha(0.5).css()
          ),
          height: 32,
          width: count / total * 100 + '%',
          borderRadius: 4,
          position: 'absolute',
        }}
      />
      <Text
        style={{
          color: (
            colorScheme === 'dark' ?
              chroma(color.background).brighten(0.5).hex() :
              color.textSecondary
          ),
          fontSize: 14,
          fontWeight: '600',
          position: 'relative',
          marginLeft: 8,
        }}
      >{count}x {emotion.label}</Text>
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
            total={data.emotions[0].count}
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

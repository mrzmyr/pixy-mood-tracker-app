import { View } from 'react-native';
import { Card } from '@/components/Statistics/Card';
import { t } from '@/helpers/translation';
import useScale from '../../hooks/useScale';
import { MoodAvgData } from '../../hooks/useStatistics/MoodAvg';
import { CardFeedback } from '@/components/Statistics/CardFeedback';

export const MoodAvgCard = ({
  data,
}: {
  data: MoodAvgData
}) => {
  const scale = useScale();

  return (
    <Card
      subtitle={t('mood')}
      title={t('statistics_mood_avg_title', {
        rating_word: t(`statistics_mood_avg_${data.ratingHighestKey}`),
        rating_percentage: data.ratingHighestPercentage,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          overflow: 'hidden',
          borderRadius: 4,
        }}
      >
        {data.distribution.map(item => {
          return (
            <View
              key={item.key}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: scale.colors[item.key].background,
                flexBasis: `${item.count / data.itemsCount * 100}%`,
                height: 24,
              }} />
          );
        })}
      </View>
      <CardFeedback
        analyticsId='mood_avg'
        analyticsData={{
          percentage: data.ratingHighestPercentage,
          data: data.distribution,
        }}
      />
    </Card>
  );
};

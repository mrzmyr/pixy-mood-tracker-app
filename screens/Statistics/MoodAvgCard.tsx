import { View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import useScale from '../../hooks/useScale';
import { useSettings } from '../../hooks/useSettings';
import { MoodAvgData } from '../../hooks/useStatistics/MoodAvg';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

export const MoodAvgCard = ({
  data,
}: {
  data: MoodAvgData
}) => {
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const { t } = useTranslation();
  
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
        {Array.from(data.distribution).reverse().map(item => {
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
        type='mood_avg'
        details={{ 
          percentage: data.ratingHighestPercentage,
          data: data.distribution,
        }} 
      />
    </Card>
  );
};

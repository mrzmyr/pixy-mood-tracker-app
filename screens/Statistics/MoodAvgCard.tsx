import { View } from 'react-native';
import { Card } from '../../components/Statistics/Card';
import { LogItem } from '../../hooks/useLogs';
import useScale from '../../hooks/useScale';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

export const keys = ['extremely_good', 'very_good', 'good', 'bad', 'very_bad', 'extremely_bad']

export const MoodAvgCard = ({
  items,
}: {
  items: LogItem[]
}) => {
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const { t } = useTranslation();

  const rating_negative = Object.values(items).filter(item => ['bad', 'very_bad', 'extremely_bad'].includes(item.rating)).length;
  const rating_positive = Object.values(items).filter(item => ['good', 'very_good', 'extremely_good'].includes(item.rating)).length;

  const rating = {
    negative: rating_negative,
    positive: rating_positive,
  };
  const rating_total = rating_negative + rating_positive;

  const rating_distribution = keys.map(key => {
    const count = Object.values(items).filter(item => item.rating === key).length;
    return {
      key,
      count,
    };
  });

  const ratings_total = rating_distribution.reduce((acc, item) => acc + item.count, 0);
  const rating_highest = Object.keys(rating).reduce((a, b) => rating[a] > rating[b] ? a : b);

  const percentage = Math.round(rating[rating_highest] / rating_total * 100)
  
  return (
    <Card
      subtitle={t('mood')}
      title={t('statistics_mood_avg_title', {
        rating_word: t(`statistics_mood_avg_${rating_highest}`),
        rating_percentage: percentage,
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
        {rating_distribution.reverse().map(item => {
          return (
            <View
              key={item.key}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: scale.colors[item.key].background,
                flexBasis: `${item.count / ratings_total * 100}%`,
                height: 24,
              }} />
          );
        })}
      </View>
      <CardFeedback type='mood_avg' details={{ percentage, rating }} />
    </Card>
  );
};

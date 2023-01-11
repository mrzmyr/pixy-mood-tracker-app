import { LogItem } from '@/hooks/useLogs';
import { dummyEmotionsDistributionData, getEmotionsDistributionData } from '@/hooks/useStatistics/EmotionsDistributuon';
import { EmotionsDistributionContent } from '@/screens/Statistics/EmotionsDistributionCard';
import { BigCard } from '../BigCard';
import { NotEnoughDataOverlay } from './NotEnoughDataOverlay';

const MIN_TAGS = 5;

export const EmotionsDistribution = ({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: LogItem[],
}) => {
  const data = getEmotionsDistributionData(items);

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable
      hasFeedback
      analyticsId="emotions-distribution"
      analyticsData={{
        emotions: data.emotions
      }}
    >
      {data.emotions.length < MIN_TAGS && (
        <NotEnoughDataOverlay />
      )}
      {data.emotions.length >= MIN_TAGS ? (
        <EmotionsDistributionContent
          data={data}
          limit={10}
        />
      ) : (
        <EmotionsDistributionContent
          data={dummyEmotionsDistributionData}
          limit={10}
        />
      )}
    </BigCard>
  );
};

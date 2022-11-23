import { Dayjs } from 'dayjs';
import { LogItem } from '../../hooks/useLogs';
import { dummyTagsDistributionData, getTagsDistributionData } from '../../hooks/useStatistics/TagsDistribution';
import { useTagsState } from '../../hooks/useTags';
import { TagDistributionContent } from '../../screens/Statistics/TagsDistributionCard';
import { NotEnoughDataOverlay } from './NotEnoughDataOverlay';
import { BigCard } from '../BigCard';
import { CardFeedback } from './CardFeedback';
import { useAnonymizer } from '../../hooks/useAnonymizer';

const MIN_TAGS = 5;

export const TagDistribution = ({
  title,
  subtitle,
  date,
  items,
}: {
  title: string
  subtitle: string
  date: Dayjs,
  items: LogItem[],
}) => {
  const { anonymizeTag } = useAnonymizer()
  const tagState = useTagsState();

  const data = getTagsDistributionData(items, tagState.tags);

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable={true}
      analyticsId="tag-distribution"
    >
      {data.tags.length < MIN_TAGS && (
        <NotEnoughDataOverlay />
      )}
      {data.tags.length >= MIN_TAGS ? (
        <TagDistributionContent
          data={data}
          limit={10}
        />
      ) : (
        <TagDistributionContent
          data={dummyTagsDistributionData}
          limit={10}
        />
      )}
      <CardFeedback
        type='tag_distribution'
        details={data.tags.map(tag => ({
          ...tag,
          details: anonymizeTag(tag.details),
        }))}
      />
    </BigCard>
  );
};

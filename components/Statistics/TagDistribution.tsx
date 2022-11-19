import { Dayjs } from 'dayjs';
import { LogItem } from '../../hooks/useLogs';
import { dummyTagsDistributionData, getTagsDistributionData } from '../../hooks/useStatistics/TagsDistribution';
import { useTagsState } from '../../hooks/useTags';
import { TagDistributionContent } from '../../screens/Statistics/TagsDistributionCard';
import { NotEnoughDataOverlay } from '../../screens/StatisticsMonth/NotEnoughDataOverlay';
import { BigCard } from '../BigCard';

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
  const tagState = useTagsState();

  const data = getTagsDistributionData(items, tagState.tags);

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable={true}
    >
      {data.tags.length < 1 && (
        <NotEnoughDataOverlay />
      )}
      {data.tags.length > 0 ? (
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
    </BigCard>
  );
};
